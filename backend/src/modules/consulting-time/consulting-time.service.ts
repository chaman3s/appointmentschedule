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
  ) { }
  async create(doctorId: number, dto: CreateConsultingTimeDto) {
    const { startTime, endTime, days, repeat, scheduling_type, wave_capacity ,slotDuration} = dto;
    if (scheduling_type === 'WAVE' && !wave_capacity) {
      throw new BadRequestException('wave_capacity required for WAVE');
    }
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
    await this.checkConflict(doctorId, startTime, endTime, normalizedDays);
    const consultingTime = this.ctRepo.create({
      startTime,
      endTime,
      doctor,
      scheduling_type,
      wave_capacity,
      slotDuration,
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

    return {
      message: 'Consulting time created successfully',
      data: {
        id: saved.consultingTimeId,
        startTime,
        endTime,
        days: normalizedDays,
        slotDuration,
        scheduling_type,
        wave_capacity: scheduling_type === 'WAVE' ? wave_capacity : null,
      },
    };
  }
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
  async getMySchedule(doctorId: number) {
    return this.ctRepo.find({
      where: { doctor: { id: doctorId } },
      relations: ['days'],
      order: { startTime: 'ASC' },
    });
  }
  async getDoctorSchedule(doctorId: number) {
    const data = await this.ctRepo.find({
      where: { doctor: { id: doctorId } },
      relations: ['days'],
      order: { startTime: 'ASC' },
    });
    return data.map((item) => ({
      startTime: item.startTime,
      endTime: item.endTime,
      slotDuration: item.slotDuration,
      days: item.days.map((d) => d.day),
      scheduling_type: item.scheduling_type,
      wave_capacity:
        item.scheduling_type === 'WAVE' ? item.wave_capacity : null,
    }));
  }
  async getAvailability(doctorId: number, date: string) {
    const custom = await this.customRepo.find({
      where: { doctor: { id: doctorId }, date },
    });

    if (custom.length > 0) {
      return custom.map((c) => ({
        startTime: c.startTime,
        endTime: c.endTime,
        slotDuration: c.slotDuration,
      }));
    }
    const dayName = new Date(date)
      .toLocaleDateString('en-US', { weekday: 'long' })
      .toUpperCase();

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
      slotDuration: r.slotDuration,
      scheduling_type: r.scheduling_type ?? 'STREAM',
      wave_capacity: r.scheduling_type === 'WAVE' ? r.wave_capacity : null,
    }));
  }
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
