import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateHospitalDto } from './dto/create-hospital.dto';
import { UpdateHospitalDto } from './dto/update-hospital.dto';
import { Hospital } from './entities/hospital.entity';
import { Doctors } from '../doctors/entity/doctor.entity';

@Injectable()
export class HospitalService {
  constructor(
    @InjectRepository(Hospital)
    private readonly hospitalRepo: Repository<Hospital>,

    @InjectRepository(Doctors)
    private readonly doctorRepo: Repository<Doctors>,
  ) {}

  async create(dto: CreateHospitalDto,doctorId: number) {
    const { name, address } = dto;
    const doctor = await this.doctorRepo.findOne({
      where: { id: doctorId },
      relations: ['hospital'],
    });

    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }
    if (doctor.hospital) {
      throw new BadRequestException(
        'Doctor already has a hospital',
      );
    }
    const hospital = this.hospitalRepo.create({
      name,
      address,
      doctor,
    });
    return await this.hospitalRepo.save(hospital);
  }

  findAll() {
    return this.hospitalRepo.find({
      relations: ['doctor'],
    });
  }

  findOne(id: number) {
    return this.hospitalRepo.findOne({
      where: { id },
      relations: ['doctor'],
    });
  }

  async update(id: number, dto: UpdateHospitalDto) {
    const hospital = await this.hospitalRepo.findOne({
      where: { id },
    });

    if (!hospital) {
      throw new NotFoundException('Hospital not found');
    }

    Object.assign(hospital, dto);

    return await this.hospitalRepo.save(hospital);
  }

  async remove(id: number) {
    const hospital = await this.hospitalRepo.findOne({
      where: { id },
    });

    if (!hospital) {
      throw new NotFoundException('Hospital not found');
    }

    await this.hospitalRepo.remove(hospital);

    return { message: 'Hospital deleted successfully' };
  }
}