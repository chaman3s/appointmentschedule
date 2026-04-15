import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ConsultingTime } from './entity/consultingTime.entity';
import { ConsultingDay } from './entity/consultingDays.entity';
import { CustomAvailability } from './entity/custom_availability.entity';
import { Doctors } from '../doctors/entity/doctor.entity';

import { CreateConsultingTimeDto } from './DTO/create-consulting-time.dto';
import { CreateCustomAvailabilityDto } from './DTO/create-custom-availability.dto';
import { normalizeDay } from '../../utils';

@Injectable()
export class ConsultingTimeService {
  constructor(
    @InjectRepository(ConsultingTime)
    private ctRepo: Repository<ConsultingTime>,

    @InjectRepository(ConsultingDay)
    private dayRepo: Repository<ConsultingDay>,

    @InjectRepository(CustomAvailability)
    private customRepo: Repository<CustomAvailability>,

    @InjectRepository(Doctors)
    private doctorRepo: Repository<Doctors>,
  ) {}

  // =========================
  // ✅ CREATE RECURRING
  // =========================
  async create(doctorId: number, dto: CreateConsultingTimeDto) {
    const { startTime, endTime, days, repeat } = dto;

    if (startTime >= endTime) {
      throw new BadRequestException(
        'End time must be greater than start time',
      );
    }

    if (!days || days.length === 0) {
      throw new BadRequestException('Days are required');
    }

    const normalizedDays = days.map(normalizeDay);

    const doctor = await this.doctorRepo.findOneBy({ id: doctorId });
    if (!doctor) {
      throw new BadRequestException('Doctor not found');
    }

    // ❌ Prevent overlap
    await this.checkConflict(doctorId, startTime, endTime, normalizedDays);

    const consultingTime = this.ctRepo.create({
      startTime,
      endTime,
      doctor,
      repeat: repeat ?? true,
    });

    const saved = await this.ctRepo.save(consultingTime);

    const dayEntities = normalizedDays.map((day) =>
      this.dayRepo.create({
        day,
        consultingTime: saved,
      }),
    );

    await this.dayRepo.save(dayEntities);

    return { message: 'Consulting time created successfully' };
  }

  // =========================
  // ✅ CREATE CUSTOM OVERRIDE
  // =========================
  async createCustomAvailability(
    doctorId: number,
    dto: CreateCustomAvailabilityDto,
  ) {
    const { date, startTime, endTime } = dto;

    if (startTime >= endTime) {
      throw new BadRequestException(
        'End time must be greater than start time',
      );
    }

    const doctor = await this.doctorRepo.findOneBy({ id: doctorId });
    if (!doctor) {
      throw new BadRequestException('Doctor not found');
    }

    // ❌ Prevent overlap on same date
    const conflict = await this.customRepo
      .createQueryBuilder('c')
      .where('c.doctorId = :doctorId', { doctorId })
      .andWhere('c.date = :date', { date })
      .andWhere('c.startTime < :endTime', { endTime })
      .andWhere('c.endTime > :startTime', { startTime })
      .getOne();

    if (conflict) {
      throw new BadRequestException('Custom time overlaps');
    }

    const custom = this.customRepo.create({
      doctor,
      date,
      startTime,
      endTime,
    });

    await this.customRepo.save(custom);

    return { message: 'Custom availability created successfully' };
  }

  // =========================
  // ✅ GET MY SCHEDULE (DOCTOR)
  // =========================
  async getMySchedule(doctorId: number) {
    return this.ctRepo.find({
      where: { doctor: { id: doctorId } },
      relations: ['days'],
      order: { startTime: 'ASC' },
    });
  }

  // =========================
  // ✅ GET DOCTOR SCHEDULE (USER)
  // =========================
  async getDoctorSchedule(doctorId: number) {
    const data = await this.ctRepo.find({
      where: { doctor: { id: doctorId } },
      relations: ['days'],
      order: { startTime: 'ASC' },
    });

    // ✅ Clean response (avoid info disclosure)
    return data.map((item) => ({
      startTime: item.startTime,
      endTime: item.endTime,
      days: item.days.map((d) => d.day),
    }));
  }

  // =========================
  // ✅ GET AVAILABILITY (CORE LOGIC)
  // =========================
  async getAvailability(doctorId: number, date: string) {
    // 1️⃣ Check custom override
    const custom = await this.customRepo.find({
      where: { doctor: { id: doctorId }, date },
    });

    if (custom.length > 0) {
      return custom.map((c) => ({
        startTime: c.startTime,
        endTime: c.endTime,
      }));
    }

    // 2️⃣ Get day name
    const dayName = new Date(date)
      .toLocaleDateString('en-US', { weekday: 'long' })
      .toUpperCase();

    // 3️⃣ Get recurring
    const recurring = await this.ctRepo
      .createQueryBuilder('ct')
      .innerJoin('ct.days', 'd')
      .innerJoin('ct.doctor', 'doc')
      .where('doc.id = :doctorId', { doctorId })
      .andWhere('d.day = :day', { day: dayName })
      .getMany();

    return recurring.map((r) => ({
      startTime: r.startTime,
      endTime: r.endTime,
    }));
  }

  // =========================
  // ❌ PREVENT OVERLAP (RECURRING)
  // =========================
  async checkConflict(
    doctorId: number,
    startTime: string,
    endTime: string,
    days: string[],
  ) {
    const conflict = await this.ctRepo
      .createQueryBuilder('ct')
      .innerJoin('ct.days', 'd')
      .innerJoin('ct.doctor', 'doc')
      .where('doc.id = :doctorId', { doctorId })
      .andWhere('d.day IN (:...days)', { days })
      .andWhere('ct.startTime < :endTime', { endTime })
      .andWhere('ct.endTime > :startTime', { startTime })
      .getOne();

    if (conflict) {
      throw new BadRequestException(
        'Time slot overlaps for selected day(s)',
      );
    }
  }
}