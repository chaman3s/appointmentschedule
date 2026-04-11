// patient.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Patients } from './entities/patient.entity';
import { CreatePatientDto } from './dto/create-patient.dto';

@Injectable()
export class PatientService {
  constructor(
    @InjectRepository(Patients)
    private patientRepo: Repository<Patients>,
  ) { }

  async createOrUpdate(userId: any, dto: CreatePatientDto) {
    console.log('DTO:', dto);
    console.log('USER ID:', userId, typeof userId);

    let patient = await this.patientRepo.findOne({
      where: { user: { id: userId } }, // ✅ FIX
    });

    console.log('FOUND PATIENT:', patient);

    if (!patient) {
      const newPatient = this.patientRepo.create({
        ...dto,
        user_id: userId, // ✅ simple + stable
      });

      return await this.patientRepo.save(newPatient);
    }

    patient.patient_name = dto.patient_name;
    patient.patient_age = dto.patient_age;
    patient.gender = dto.gender;
    patient.weight = dto.weight;
    patient.relation = dto.relation;

    return await this.patientRepo.save(patient);
  }
  async getProfile(userId: number) {
    const patient = await this.patientRepo.findOne({
      where: { user: { id: userId } },
    });

    if (!patient) {
      throw new NotFoundException('Patient profile not found');
    }

    return patient;
  }
}