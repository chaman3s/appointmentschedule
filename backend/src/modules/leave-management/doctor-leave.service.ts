import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DoctorLeave } from './entities/DoctorLeave.entity';
import { Doctors } from '../doctors/entity/doctor.entity';
import { CreateDoctorLeaveDto } from './dto/create-doctor-leave.dto';

@Injectable()
export class DoctorLeaveService {
  constructor(
    @InjectRepository(DoctorLeave)
    private readonly leaveRepo: Repository<DoctorLeave>,

    @InjectRepository(Doctors)
    private readonly doctorRepo: Repository<Doctors>,
  ) {}

  async createForMe(doctorId: number, dto: CreateDoctorLeaveDto) {
    const doctor = await this.doctorRepo.findOne({ where: { id: doctorId } });
    if (!doctor) throw new BadRequestException('Invalid doctor');

    if (dto.endDate < dto.startDate) {
      throw new BadRequestException('endDate must be on/after startDate');
    }

    if (!dto.isFullDay) {
      if (!dto.startTime || !dto.endTime) {
        throw new BadRequestException('startTime and endTime are required for partial leave');
      }
      if (dto.endTime <= dto.startTime) {
        throw new BadRequestException('endTime must be after startTime');
      }
    }

    return this.leaveRepo.save(
      this.leaveRepo.create({
        doctor: { id: doctorId } as any,
        startDate: dto.startDate,
        endDate: dto.endDate,
        isFullDay: dto.isFullDay,
        startTime: dto.isFullDay ? null : dto.startTime,
        endTime: dto.isFullDay ? null : dto.endTime,
        reason: dto.reason ?? null,
      }),
    );
  }

  async listForMe(doctorId: number, from?: string, to?: string) {
    const qb = this.leaveRepo
      .createQueryBuilder('l')
      .where('l.doctorId = :doctorId', { doctorId })
      .orderBy('l.startDate', 'DESC')
      .addOrderBy('l.id', 'DESC');

    if (from) qb.andWhere('l.endDate >= :from', { from });
    if (to) qb.andWhere('l.startDate <= :to', { to });

    return qb.getMany();
  }

  async deleteForMe(doctorId: number, id: number) {
    const existing = await this.leaveRepo.findOne({
      where: { id, doctor: { id: doctorId } },
    });
    if (!existing) throw new BadRequestException('Leave not found');
    await this.leaveRepo.delete({ id });
    return { deleted: true };
  }
}

