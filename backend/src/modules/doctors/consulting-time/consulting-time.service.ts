import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConsultingTime } from '../entity/consultingTime.entity';
import { ConsultingDay } from '../entity/consultingDays.entity';
import { Doctors } from '../entity/doctor.entity';
import { Repository } from 'typeorm';
import { CreateConsultingTimeDto } from './DTO/create-consulting-time.dto';
@Injectable()
export class ConsultingTimeService {
  constructor(
    @InjectRepository(ConsultingTime)
    private ctRepo: Repository<ConsultingTime>,
    @InjectRepository(ConsultingDay)
    private dayRepo: Repository<ConsultingDay>,
    @InjectRepository(Doctors)
    private doctorRepo: Repository<Doctors>,
  ) { }
  async create(doctorId: number, dto: CreateConsultingTimeDto) {
    const { startTime, endTime, days } = dto;
    if (startTime >= endTime) {
      throw new BadRequestException('Start time must be less than end time');
    }
    const doctor = await this.doctorRepo.findOneBy({
      id: doctorId,
    });
    if (!doctor) {
      throw new BadRequestException('Doctor not found');
    }
    await this.checkConflict(doctorId, startTime, endTime, days);
    const consultingTime = this.ctRepo.create({
      startTime,
      endTime,
      doctor,
    });

    const savedCT = await this.ctRepo.save(consultingTime);

    // 5. Save days
    const dayEntities = days.map((d) =>
      this.dayRepo.create({
        day: d,
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
      .where('doc.doctor_id = :doctorId', { doctorId })
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
}