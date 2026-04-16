import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConsultingTime } from './entity/consultingTime.entity';
import { ConsultingDay } from './entity/consultingDays.entity';
import { Doctors } from '../doctors/entity/doctor.entity';
import { Repository } from 'typeorm';
import { CreateConsultingTimeDto } from './DTO/create-consulting-time.dto';
import { normalizeDay } from '../../utils';
import { CustomAvailability } from './entity/custom_availability.entity';

@Injectable()
export class ConsultingTimeService {
  constructor(
    @InjectRepository(ConsultingTime)
    private ctRepo: Repository<ConsultingTime>,

    @InjectRepository(ConsultingDay)
    private dayRepo: Repository<ConsultingDay>,

    @InjectRepository(Doctors)
    private doctorRepo: Repository<Doctors>,
     @InjectRepository(CustomAvailability) // ✅ ADD THIS
  private customRepo: Repository<CustomAvailability>,
  ) { }

  // ✅ CREATE CONSULTING TIME
  async create(doctorId: number, dto: CreateConsultingTimeDto) {
    const { startTime, endTime, days } = dto;
    if (startTime >= endTime) {
      throw new BadRequestException(
        'End time must be greater than start time (same day only)',
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
    await this.checkConflict(
      doctorId,
      startTime,
      endTime,
      normalizedDays,
    );
    const consultingTime = this.ctRepo.create({
      startTime,
      endTime,
      doctor,
    });
    const savedCT = await this.ctRepo.save(consultingTime);
    const dayEntities = normalizedDays.map((day) =>
      this.dayRepo.create({
        day,
        consultingTime: savedCT,
      }),
    );
    await this.dayRepo.save(dayEntities);
    return {
      message: 'Consulting time created successfully',
    };
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
        'Time slot overlaps for the selected day(s)',
      );
    }
  }
  async getAvailability(doctorId: number, date: string) {
    // 1. Check custom override first
    const custom = await this.customRepo.find({
      where: { doctor: { id: doctorId }, date },
    });

    if (custom.length > 0) {
      return custom; // ✅ override
    }

    // 2. Get day name (MONDAY, etc.)
    const dayName = new Date(date)
      .toLocaleDateString('en-US', { weekday: 'long' })
      .toUpperCase();

    // 3. Get recurring
    const recurring = await this.ctRepo
      .createQueryBuilder('ct')
      .innerJoin('ct.days', 'd')
      .innerJoin('ct.doctor', 'doc')
      .where('doc.id = :doctorId', { doctorId })
      .andWhere('d.day = :day', { day: dayName })
      .getMany();

    return recurring;
  }
}