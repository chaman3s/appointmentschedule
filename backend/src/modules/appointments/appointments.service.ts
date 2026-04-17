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
import {
  SchedulingType,
  AppointmentStatus,
} from '../common/enums/appointment.enum';
import { getDayName } from '../../utils/index';

type StreamSlot = {
  start: string;
  end: string;
  available: boolean;
};

type WaveSlot = {
  start: string;
  end: string;
  capacity: number;
  booked: number;
  available_spots: number;
  is_full: boolean;
};

type Slot = StreamSlot | WaveSlot;

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
  ) { }

  // ================= BOOK SLOT =================
  async bookSlot(dto: CreateAppointmentDto) {
    const { doctor_id, appointment_date, start_time, end_time } = dto;

    return this.dataSource.transaction(async (manager) => {
      const { scheduling_type, slots } = await this.getAvailableSlots(
        doctor_id,
        appointment_date,
      );

      let finalStart = start_time;
      let finalEnd = end_time;

      const isWave = scheduling_type === SchedulingType.WAVE;

      // VALIDATION
      if (isWave) {
        const wave = slots[0] as WaveSlot;

        if (!wave || wave.available_spots <= 0) {
          throw new BadRequestException('Wave is full');
        }

        finalStart = wave.start;
        finalEnd = wave.end;
      } else {
        const slotExists = slots.some(
          (s: StreamSlot) =>
            s.start === start_time &&
            s.end === end_time &&
            s.available,
        );

        if (!slotExists) {
          throw new BadRequestException('Invalid slot');
        }
      }

      // STREAM LOCK
      if (!isWave) {
        const existing = await manager
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
          .getOne();

        if (existing) {
          throw new ConflictException('Slot already booked');
        }
      }

      // WAVE CAPACITY
      if (isWave) {
        const wave = slots[0] as WaveSlot;
        const capacity = wave?.capacity || 1;

        const count = await manager
          .createQueryBuilder(Appointment, 'a')
          .where('a.doctor_id = :doctorId', { doctorId: doctor_id })
          .andWhere('a.appointment_date = :date', {
            date: appointment_date,
          })
          .andWhere('a.start_time = :start', { start: finalStart })
          .andWhere('a.status = :status', {
            status: AppointmentStatus.BOOKED,
          })
          .getCount();

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

    const count = await qb.getCount(); // ⚠️ still safe here? no → see note below

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

  // ================= GET SLOTS =================
  async getAvailableSlots(
    doctorId: number,
    date: string,
  ): Promise<{ scheduling_type: SchedulingType; slots: Slot[] }> {
    const custom = await this.customRepo.findOne({
      where: {
        doctor: { id: doctorId },
        date,
      },
    });

    if (custom) {
      const slots = await this.handleStream(
        custom.startTime,
        custom.endTime,
        custom.slotDuration,
        doctorId,
        date,
      );

      return {
        scheduling_type: SchedulingType.STREAM,
        slots,
      };
    }

    const dayName = getDayName(date);

    const consultingList = await this.consultingRepo.find({
      where: { doctor: { id: doctorId } },
      relations: ['days'],
    });

    const matchedList = consultingList.filter((c) =>
      c.days?.some((d) => d.day === dayName),
    );

    if (matchedList.length === 0) {
      return {
        scheduling_type: SchedulingType.STREAM,
        slots: [],
      };
    }

    const results: Slot[] = [];

    const scheduling_type =
      matchedList[0].scheduling_type === 'WAVE'
        ? SchedulingType.WAVE
        : SchedulingType.STREAM;

    for (const matched of matchedList) {
      if (scheduling_type === SchedulingType.STREAM) {
        const slots = await this.handleStream(
          matched.startTime,
          matched.endTime,
          matched.slotDuration,
          doctorId,
          date,
        );
        results.push(...slots);
      }

      if (scheduling_type === SchedulingType.WAVE) {
        const slots = await this.handleWave(
          matched.startTime,
          matched.endTime,
          matched.wave_capacity,
          doctorId,
          date,
        );
        results.push(...slots);
      }
    }

    results.sort((a, b) => a.start.localeCompare(b.start));

    return {
      scheduling_type,
      slots: results,
    };
  }

  // ================= STREAM =================
  async handleStream(
    start: string,
    end: string,
    duration: number,
    doctorId: number,
    date: string,
  ): Promise<StreamSlot[]> {
    let slots: { start: string; end: string }[] =this.generateSlots(start, end, duration);

    const now = new Date();
    const isToday =
      new Date(date).toDateString() === now.toDateString();

    if (isToday) {
      const currentTime = now.toTimeString().slice(0, 5);
      slots = slots.filter((s) => s.start > currentTime);
    }

    const bookings = await this.appointmentRepo.find({
      where: {
        doctor: { id: doctorId },
        appointment_date: date,
        status: AppointmentStatus.BOOKED,
      },
    });

    const bookedSet = new Set(bookings.map((b) => b.start_time));

    return slots.map((slot) => ({
      ...slot,
      available: !bookedSet.has(slot.start),
    }));
  }

  // ================= WAVE =================
  async handleWave(
    start: string,
    end: string,
    capacity: number,
    doctorId: number,
    date: string,
  ): Promise<WaveSlot[]> {
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

  // ================= UTIL =================
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