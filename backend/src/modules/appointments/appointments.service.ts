import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';

import { Appointment } from './entities/appointment.entity';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { Patients } from '../patients/entities/patient.entity';
import { ConsultingTime } from '../consulting-time/entity/consultingTime.entity';
import { CustomAvailability } from '../consulting-time/entity/custom_availability.entity';
import { SchedulingType, AppointmentStatus } from '../common/enums/appointment.enum';
import { getDayName } from '../../utils/index';


@Injectable()
export class AppointmentsService {
  constructor(
    @InjectRepository(Appointment)
  private readonly appointmentRepo: Repository<Appointment>,

  @InjectRepository(ConsultingTime)
  private readonly consultingRepo: Repository<ConsultingTime>,

  @InjectRepository(CustomAvailability)
  private readonly customRepo: Repository<CustomAvailability>,

  private readonly dataSource: DataSource,
  ) {}

  // ================= BOOK SLOT =================
  async bookSlot(dto: CreateAppointmentDto) {
    const {
      doctor_id,
      appointment_date,
      start_time,
      end_time,
      scheduling_type,
    } = dto;

    return this.dataSource.transaction(async (manager) => {
      const slots = await this.getAvailableSlots(
        doctor_id,
        appointment_date,
      );

      let finalStart = start_time;
      let finalEnd = end_time;

      const isWave = scheduling_type === SchedulingType.WAVE;

      // VALIDATION
      if (isWave) {
        const wave = slots[0] as any;

        if (!wave || wave.available_spots <= 0) {
          throw new BadRequestException('Wave is full');
        }

        finalStart = wave.start;
        finalEnd = wave.end;
      } else {
        const slotExists = slots.some(
          (s: any) =>
            s.start === start_time &&
            s.end === end_time &&
            s.available,
        );

        if (!slotExists) {
          throw new BadRequestException('Invalid slot');
        }
      }

      // DB VALIDATION WITH LOCK
      const count = await manager
        .createQueryBuilder(Appointment, 'a')
        .setLock('pessimistic_write')
        .where('a.doctor_id = :doctorId', { doctorId: doctor_id })
        .andWhere('a.appointment_date = :date', {
          date: appointment_date,
        })
        .andWhere('a.start_time = :start', { start: finalStart })
        .andWhere('a.status = :status', {
          status: AppointmentStatus.BOOKED,
        })
        .getCount();

      if (scheduling_type === SchedulingType.STREAM && count > 0) {
        throw new ConflictException('Slot already booked');
      }

      if (scheduling_type === SchedulingType.WAVE) {
        let capacity = 1;

        if (slots.length > 0 && 'capacity' in slots[0]) {
          capacity = (slots[0] as any).capacity;
        }

        if (count >= capacity) {
          throw new ConflictException('Wave full');
        }
      }

      const appointment = manager.create(Appointment, {
        ...dto,
        start_time: finalStart,
        end_time: finalEnd,
        status: AppointmentStatus.BOOKED,
      });

      return manager.save(appointment);
    });
  }

  // ================= RESCHEDULE =================
  async rescheduleAppointment(
    appointmentId: number,
    userId: number,
    newDate: string,
    newStartTime: string,
    newEndTime: string,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const appointment = await manager.findOne(Appointment, {
        where: {
          appointment_id: appointmentId,
          user: { id: userId },
        },
        relations: ['doctor'],
        lock: { mode: 'pessimistic_write' },
      });

      if (!appointment) {
        throw new NotFoundException('Appointment not found');
      }

      if (appointment.status !== AppointmentStatus.BOOKED) {
        throw new BadRequestException(
          'Only booked appointments can be rescheduled',
        );
      }

      const isAvailable = await this.checkSlotAvailability(
        manager,
        appointment.doctor.id,
        newDate,
        newStartTime,
        appointment.scheduling_type,
        appointment.max_capacity,
        appointment.appointment_id,
      );

      if (!isAvailable) {
        throw new BadRequestException('Slot not available');
      }

      appointment.appointment_date = newDate;
      appointment.start_time = newStartTime;
      appointment.end_time = newEndTime;

      return manager.save(appointment);
    });
  }

  // ================= SLOT CHECK =================
  async checkSlotAvailability(
    manager: EntityManager,
    doctorId: number,
    date: string,
    startTime: string,
    type: SchedulingType,
    capacity: number,
    excludeId?: number,
  ) {
    const qb = manager
      .createQueryBuilder(Appointment, 'a')
      .where('a.doctor_id = :doctorId', { doctorId })
      .andWhere('a.appointment_date = :date', { date })
      .andWhere('a.start_time = :startTime', { startTime })
      .andWhere('a.status = :status', {
        status: AppointmentStatus.BOOKED,
      });

    if (excludeId) {
      qb.andWhere('a.appointment_id != :id', { id: excludeId });
    }

    qb.setLock('pessimistic_write');

    const count = await qb.getCount();

    if (type === SchedulingType.STREAM) return count === 0;
    if (type === SchedulingType.WAVE) return count < capacity;

    return false;
  }

  // ================= ADD PATIENT =================
  async addPatient(
    appointmentId: number,
    patientId: number,
    userId: number,
  ) {
    const appointment = await this.appointmentRepo.findOne({
      where: { appointment_id: appointmentId },
      relations: ['user'],
    });

    if (!appointment) throw new NotFoundException();
    if (appointment.user.id !== userId)
      throw new ForbiddenException();

    appointment.patient = { patient_id: patientId } as Patients;

    return this.appointmentRepo.save(appointment);
  }
  async getAvailableSlots(doctorId: number, date: string) {
    const custom = await this.customRepo.findOne({
      where: {
        doctor: { id: doctorId },
        date,
      },
    });

    let start: string;
    let end: string;
    let duration: number;
    let schedulingType: 'STREAM' | 'WAVE';
    let waveCapacity: number | null = null;

    if (custom) {
      start = custom.startTime;
      end = custom.endTime;
      duration = custom.slotDuration;
      schedulingType = 'STREAM';
    } else {
      const dayName = getDayName(date);

      const consulting = await this.consultingRepo.find({
        where: {
          doctor: { id: doctorId },
        },
        relations: ['days'],
      });

      const matched = consulting.find(c =>
        c.days?.some(d => d.day === dayName),
      );

      if (!matched) return [];

      start = matched.startTime;
      end = matched.endTime;
      duration = matched.slotDuration;

      schedulingType = matched.scheduling_type;
      waveCapacity = matched.wave_capacity;
    }

    if (schedulingType === 'STREAM') {
      return this.handleStream(start, end, duration, doctorId, date);
    }

    if (schedulingType === 'WAVE') {
      if (!waveCapacity) {
        throw new BadRequestException('Wave capacity not defined');
      }
      return this.handleWave(start, end, waveCapacity, doctorId, date);
    }

    return [];
  }

  // =====================================================
  // 🔷 STREAM (FIXED SLOTS)
  // =====================================================

  async handleStream(
    start: string,
    end: string,
    duration: number,
    doctorId: number,
    date: string,
  ) {
    let slots = this.generateSlots(start, end, duration);

    const now = new Date();
    const isToday =
      new Date(date).toDateString() === now.toDateString();

    if (isToday) {
      const currentTime = now.toTimeString().slice(0, 5);
      slots = slots.filter(s => s.start > currentTime);
    }

    const bookings = await this.appointmentRepo.find({
      where: {
        doctor: { id: doctorId },
        appointment_date: date,
        status: AppointmentStatus.BOOKED,
      },
    });

    const bookedSet = new Set(bookings.map(b => b.start_time));

    return slots.map(slot => ({
      ...slot,
      available: !bookedSet.has(slot.start),
    }));
  }

  // =====================================================
  // 🔷 WAVE (CAPACITY BASED)
  // =====================================================

  async handleWave(
    start: string,
    end: string,
    capacity: number,
    doctorId: number,
    date: string,
  ) {
    if (!capacity) {
      throw new BadRequestException('Wave capacity not defined');
    }

    const bookingsCount = await this.appointmentRepo.count({
      where: {
        doctor: { id: doctorId },
        appointment_date: date,
        start_time: start,
       status: AppointmentStatus.BOOKED,
      },
    });

    const availableSpots = capacity - bookingsCount;

    return [
      {
        start,
        end,
        capacity,
        booked: bookingsCount,
        available_spots: Math.max(availableSpots, 0),
        is_full: bookingsCount >= capacity,
      },
    ];
  }

  // =====================================================
  // 🔷 SLOT GENERATOR
  // =====================================================

  generateSlots(
    start: string,
    end: string,
    duration: number,
  ): { start: string; end: string }[] {
    const slots: { start: string; end: string }[] = [];

    let current = this.toMinutes(start);
    const endMin = this.toMinutes(end);

    while (current + duration <= endMin) {
      slots.push({
        start: this.toTime(current),
        end: this.toTime(current + duration),
      });

      current += duration;
    }

    return slots;
  }

  toMinutes(time: string) {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  }

  toTime(mins: number) {
    const h = Math.floor(mins / 60)
      .toString()
      .padStart(2, '0');

    const m = (mins % 60)
      .toString()
      .padStart(2, '0');

    return `${h}:${m}`;
  }
 
  
  async getUserAppointments(userId: number) {
    const appointments = await this.appointmentRepo.find({
      where: {
        user: { id: userId },
      },
      relations: ['doctor', 'patient'],
      order: {
        appointment_date: 'DESC',
      },
    });
    const consultingTimes = await this.consultingRepo.find({
      relations: ['days', 'doctor'],
    });
    return appointments.map((appt) => {
      const dayName = getDayName(appt.appointment_date);
      const matched = consultingTimes.find(ct =>
        ct.doctor.id === appt.doctor.id &&
        ct.days?.some(d => d.day === dayName) &&
        ct.startTime <= appt.start_time &&
        ct.endTime >= appt.end_time
      );
      return {
        ...appt,
        scheduling_type: matched?.scheduling_type || null,
      };
    });
  }
  async getDoctorAppointments(doctorId: number) {
    const appointments = await this.appointmentRepo.find({
      where: {
        doctor: { id: doctorId },
      },
      relations: ['user', 'patient', 'doctor'],
      order: {
        appointment_date: 'DESC',
      },
    });

    // 🔷 fetch consulting times of this doctor only (optimized)
    const consultingTimes = await this.consultingRepo.find({
      where: {
        doctor: { id: doctorId },
      },
      relations: ['days'],
    });

    return appointments.map((appt) => {
      const dayName = getDayName(appt.appointment_date);
      // 🔍 find matching consulting time
      const matched = consultingTimes.find(ct =>
        ct.days?.some(d => d.day === dayName) &&
        ct.startTime <= appt.start_time &&
        ct.endTime >= appt.end_time
      );

      return {
        ...appt,
        scheduling_type: matched?.scheduling_type || null,
      };
    });
  }
}