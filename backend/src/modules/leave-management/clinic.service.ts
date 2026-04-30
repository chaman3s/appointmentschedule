import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Clinic } from './entities/Clinic.entity';
import { Doctors } from '../doctors/entity/doctor.entity';
import { UpsertClinicProfileDto } from './dto/upsert-clinic-profile.dto';
import { UpdateClinicProfileDto } from './dto/update-clinic-profile.dto';
import { ClinicSchedule } from './entities/clinicSchedule.entity';
import { UpsertClinicScheduleDto } from './dto/upsert-clinic-schedule.dto';
import { ClinicClosure } from './entities/clinicClosure.entity';
import { CreateClinicClosureDto } from './dto/create-clinic-closure.dto';

@Injectable()
export class ClinicService {
  constructor(
    @InjectRepository(Clinic)
    private readonly clinicRepo: Repository<Clinic>,

    @InjectRepository(Doctors)
    private readonly doctorRepo: Repository<Doctors>,

    @InjectRepository(ClinicSchedule)
    private readonly scheduleRepo: Repository<ClinicSchedule>,

    @InjectRepository(ClinicClosure)
    private readonly closureRepo: Repository<ClinicClosure>,
  ) {}

  async createMyClinic(doctorId: number, dto: UpsertClinicProfileDto) {
    const doctor = await this.doctorRepo.findOne({
      where: { id: doctorId },
      relations: ['clinic'],
    });
    if (!doctor) throw new NotFoundException('Doctor not found');

    if (doctor.clinic?.id) {
      throw new ConflictException('Clinic profile already exists');
    }

    const clinic = await this.clinicRepo.save(
      this.clinicRepo.create({ ...dto, isActive: true }),
    );
    doctor.clinic = clinic;
    await this.doctorRepo.save(doctor);
    return this.getMyClinic(doctorId);
  }

  async updateMyClinic(doctorId: number, dto: UpdateClinicProfileDto) {
    const doctor = await this.doctorRepo.findOne({
      where: { id: doctorId },
      relations: ['clinic'],
    });
    if (!doctor) throw new NotFoundException('Doctor not found');
    if (!doctor.clinic?.id) throw new NotFoundException('Clinic profile not found');

    const updates = Object.fromEntries(
      Object.entries(dto ?? {}).filter(([, value]) => value !== undefined),
    );

    if (Object.keys(updates).length > 0) {
      await this.clinicRepo.update(doctor.clinic.id, updates);
    }
    return this.getMyClinic(doctorId);
  }

  async getMyClinic(doctorId: number) {
    const doctor = await this.doctorRepo.findOne({
      where: { id: doctorId },
      relations: ['clinic'],
    });
    if (!doctor) throw new NotFoundException('Doctor not found');
    if (!doctor.clinic?.id) throw new NotFoundException('Clinic profile not found');

    return this.clinicRepo.findOne({
      where: { id: doctor.clinic.id },
      relations: ['schedules', 'closures'],
    });
  }

  async upsertMyClinicSchedules(doctorId: number, dto: UpsertClinicScheduleDto) {
    const clinic = await this.getMyClinic(doctorId);
    if (!clinic) throw new NotFoundException('Clinic profile not found');

    const normalized = dto.schedules.map((s) => ({
      ...s,
      dayOfWeek: s.dayOfWeek,
      openTime: s.isOpen ? s.openTime ?? '09:00' : s.openTime ?? '09:00',
      closeTime: s.isOpen ? s.closeTime ?? '18:00' : s.closeTime ?? '18:00',
    }));

    const uniqueDays = new Set(normalized.map((s) => s.dayOfWeek));
    if (uniqueDays.size !== normalized.length) {
      throw new BadRequestException('Duplicate dayOfWeek entries');
    }

    const existing = await this.scheduleRepo.find({
      where: { clinic: { id: clinic.id } },
    });
    const byDay = new Map(existing.map((e) => [e.dayOfWeek, e]));

    const toSave = normalized.map((s) => {
      const row = byDay.get(s.dayOfWeek);
      return this.scheduleRepo.create({
        id: row?.id,
        clinic,
        dayOfWeek: s.dayOfWeek,
        isOpen: s.isOpen,
        openTime: s.openTime!,
        closeTime: s.closeTime!,
      });
    });

    await this.scheduleRepo.save(toSave);
    return this.getMyClinic(doctorId);
  }

  async addMyClinicClosure(doctorId: number, dto: CreateClinicClosureDto) {
    const clinic = await this.getMyClinic(doctorId);
    if (!clinic) throw new NotFoundException('Clinic profile not found');

    const startDate = dto.startDate;
    const endDate = dto.endDate ?? dto.startDate;

    const startDateParsed = new Date(`${startDate}T00:00:00.000Z`);
    const endDateParsed = new Date(`${endDate}T00:00:00.000Z`);
    if (
      Number.isNaN(startDateParsed.getTime()) ||
      Number.isNaN(endDateParsed.getTime())
    ) {
      throw new BadRequestException('Invalid startDate/endDate');
    }
    if (endDate < startDate) {
      throw new BadRequestException('endDate must be on/after startDate');
    }

    if ((dto.startTime && !dto.endTime) || (!dto.startTime && dto.endTime)) {
      throw new BadRequestException('startTime and endTime must be provided together');
    }
    if (dto.startTime && dto.endTime) {
      if (dto.endTime <= dto.startTime) {
        throw new BadRequestException('endTime must be after startTime');
      }
    }

    const closure = await this.closureRepo.save(
      this.closureRepo.create({
        clinic,
        type: dto.type,
        startDate,
        endDate: dto.endDate ?? undefined,
        startTime: dto.startTime ?? undefined,
        endTime: dto.endTime ?? undefined,
        reason: dto.reason ?? undefined,
      }),
    );

    return closure;
  }

  async listMyClinicClosures(doctorId: number) {
    const clinic = await this.getMyClinic(doctorId);
    if (!clinic) throw new NotFoundException('Clinic profile not found');
    return this.closureRepo.find({
      where: { clinic: { id: clinic.id } },
      order: { startDate: 'DESC' },
    });
  }

  async deleteMyClinicClosure(doctorId: number, closureId: number) {
    const clinic = await this.getMyClinic(doctorId);
    if (!clinic) throw new NotFoundException('Clinic profile not found');
    const closure = await this.closureRepo.findOne({
      where: { id: closureId, clinic: { id: clinic.id } },
    });
    if (!closure) throw new NotFoundException('Closure not found');
    await this.closureRepo.delete({ id: closureId });
    return { deleted: true };
  }
}
