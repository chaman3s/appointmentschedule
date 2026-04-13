import { ConsultingTime } from '../entity/consultingTime.entity';
import { Doctors } from '../entity/doctor.entity';
import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateConsultingTimeDto } from './DTO/create-consulting-time.dto';
import { ConsultingDay } from '../entity/consultingDays.entity';
import { Repository } from 'typeorm';
@Injectable()
export class ConsultingTimeService {
constructor(
    @InjectRepository(ConsultingTime)
    private ctRepo: Repository<ConsultingTime>,

    @InjectRepository(ConsultingDay)
    private dayRepo: Repository<ConsultingDay>,
  ) {}async create(doctorId: number, dto: CreateConsultingTimeDto) {
    const { startTime, endTime, days } = dto;
  if (startTime >= endTime) {
      throw new BadRequestException('Start time must be less than end time');
    }
   await this.checkConflict(doctorId, startTime, endTime, days);

}
 async checkConflict(
    doctorId: number,
    startTime: string,
    endTime: string,
    days: string[],
  ) {
    const conflict = await this.ctRepo.createQueryBuilder('ct')
        .innerJoin('ct.days', 'd')
        .where('ct.doctorId = :doctorId', { doctorId })
        .andWhere('d.day IN (:...days)', { days })
        .andWhere('ct.startTime < :endTime', { endTime })
        .andWhere('ct.endTime > :startTime', { startTime })
        .getOne();
  }
}