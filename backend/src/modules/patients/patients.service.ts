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
  ) {}

  // ✅ CREATE (multiple patients allowed)
  async create(userId: number, dto: CreatePatientDto) {
    const patient = this.patientRepo.create({
      ...dto,
      user: { id: userId },
    });

    return await this.patientRepo.save(patient);
  }

  // ✅ GET ALL PATIENTS (verify)
  async getAll(userId: number) {
    const patients = await this.patientRepo.find({
      where: { user: { id: userId } },
    });

    if (patients.length === 0) {
      throw new NotFoundException('No patients found');
    }

    return patients;
  }

  // ✅ UPDATE SPECIFIC PATIENT
  async update(patientId: number, dto: CreatePatientDto) {
    const patient = await this.patientRepo.findOne({
      where: { patient_id: patientId },
    });

    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    Object.assign(patient, dto);

    return await this.patientRepo.save(patient);
  }

  // ✅ DELETE (optional but important)
  async remove(patientId: number) {
    const patient = await this.patientRepo.findOne({
      where: { patient_id: patientId },
    });

    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    await this.patientRepo.remove(patient);

    return { message: 'Patient deleted' };
  }
}