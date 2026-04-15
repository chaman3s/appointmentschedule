import { Patients } from './../patients/entities/patient.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Injectable, BadRequestException, ConflictException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { Appointment } from './entities/appointment.entity';
import { CustomAvailability } from '../consulting-time/entity/custom_availability.entity';
import { ConsultingTime } from '../consulting-time/entity/consultingTime.entity';
import { Repository } from 'typeorm';
import { getDayName } from 'src/utils';

@Injectable()
export class AppointmentsService {

  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentRepo: Repository<Appointment>,

    @InjectRepository(ConsultingTime)
    private readonly consultingRepo: Repository<ConsultingTime>,

    @InjectRepository(CustomAvailability)
    private readonly customRepo: Repository<CustomAvailability>,
  ) { }
  async getAvailableSlots(doctorId: number, date: string) {
    // ---------------- 1. CHECK CUSTOM ----------------
    const custom = await this.customRepo.findOne({
      where: {
        doctor: { id: doctorId },
        date,
      },
    });

    let start: string;
    let end: string;
    let duration: number;

    if (custom) {
      start = custom.startTime;
      end = custom.endTime;
      duration = custom.slotDuration;
    } else {
      // ---------------- 2. FALLBACK RECURRING ----------------
      const dayName = getDayName(date); // 0-6

      const consulting = await this.consultingRepo.find({
        where: {
          doctor: { id: doctorId },
        },
        relations: ['days'],
      });

      const matched = consulting.find(c =>
        c.days?.some(d => d.day === dayName), // ✅ FIXED
      );

      if (!matched) return [];

      start = matched.startTime;
      end = matched.endTime;
      duration = matched.slotDuration;
    }

    // ---------------- 3. GENERATE SLOTS ----------------
    let slots = this.generateSlots(start, end, duration);

    // ---------------- 4. REMOVE PAST ----------------
    const now = new Date();
    const isToday =
      new Date(date).toDateString() === now.toDateString();

    if (isToday) {
      const currentTime = now.toTimeString().slice(0, 5);
      slots = slots.filter(s => s.start > currentTime);
    }

    // ---------------- 5. REMOVE BOOKED ----------------
    const bookings = await this.appointmentRepo.find({
      where: {
        doctor: { id: doctorId },
        appointment_date: date,
        status: 'booked',
      },
    });

    const bookedSet = new Set(bookings.map(b => b.start_time));

    return slots.filter(slot => !bookedSet.has(slot.start));
  }

  // ---------------- HELPER ----------------

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

  async bookSlot(dto: CreateAppointmentDto) {
    const { doctor_id, appointment_date, start_time, end_time } = dto;

    // ---------------- 1. GET VALID SLOTS ----------------
    const validSlots = await this.getAvailableSlots(
      doctor_id,
      appointment_date,
    );

    const slotExists = validSlots.some(
      s => s.start === start_time && s.end === end_time,
    );

    if (!slotExists) {
      throw new BadRequestException('Invalid or unavailable slot');
    }

    // ---------------- 2. MAP DTO → ENTITY ----------------
    const appointment = this.appointmentRepo.create({
      appointment_date: dto.appointment_date,
      start_time: dto.start_time,
      end_time: dto.end_time,
      consulting_type: dto.consulting_type,

      // ✅ relations (correct mapping)
      doctor: { id: dto.doctor_id },
      user: { id: dto.user_id },
      
      // ✅ FIXED HERE
      patient: dto.patient_id
        ? { patient_id: dto.patient_id }
        : undefined,

      // optional fields
      is_family: dto.is_family,
      payment_status: dto.payment_status,
      status: dto.status,
      visit_type: dto.visit_type,
      complaint: dto.complaint,
      source: dto.source,
      ivr_reference_id: dto.ivr_reference_id,
      ivr_status: dto.ivr_status,
    });

    // ---------------- 3. SAVE WITH CONFLICT HANDLING ----------------
    try {
      return await this.appointmentRepo.save(appointment);
    } catch (error) {
      if (error.code === '23505') {
        throw new ConflictException('Slot already booked');
      }
      throw error;
    }
  }
  async addPatient(
    appointmentId: number,
    patientId: number,
    userId: number,
  ) {
    const appointment = await this.appointmentRepo.findOne({
      where: { appointment_id: appointmentId },
      relations: ['user'],
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    // 🔐 ensure user owns appointment
    if (appointment.user.id !== userId) {
      throw new ForbiddenException('Not your appointment');
    }

    appointment.patient = {
      patient_id: patientId,
    } as Patients;

    return await this.appointmentRepo.save(appointment);
  }
  async getUserAppointments(userId: number) {
    return this.appointmentRepo.find({
      where: {
        user: { id: userId },
      },
      relations: ['doctor', 'patient'],
      order: {
        appointment_date: 'DESC',
      },
    });
  }
  async getDoctorAppointments(doctorId: number) {
    return this.appointmentRepo.find({
      where: {
        doctor: { id: doctorId },
      },
      relations: ['user', 'patient'],
      order: {
        appointment_date: 'DESC',
      },
    });
  }
}
