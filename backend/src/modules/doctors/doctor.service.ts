import { Injectable } from '@nestjs/common';
import { Doctors } from './entity/doctor.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UpdateProfileDoctorDto } from './dto/updateprofile.doctor.dto';

@Injectable()
export class DoctorServices {
  constructor(
    @InjectRepository(Doctors)
    private doctorsRepo: Repository<Doctors>,
  ) { }

  async login(number: string, password: string) {
    if (!number || !password) {
      return { message: 'Please enter number and password' };
    }

    const doctor = await this.doctorsRepo.findOne({
      where: { mobileNumber: number },
    });

    if (!doctor) {
      return { message: 'Invalid number or password' };
    }
    const isMatch = await bcrypt.compare(password, doctor.password);

    if (!isMatch) {
      return { message: 'Invalid number or password' };
    }
    const { password: _, ...result } = doctor;

    return {
      message: 'Login successful',
      doctor: result,
    };
  }
  async createDoctor(data: any) {
    const {
      name,
      mobileNumber,
      email,
      password,
    } = data;

    if (!mobileNumber || !password || !name) {
      return { message: 'Please fill required fields' };
    }

    const existing = await this.doctorsRepo.findOne({
      where: { mobileNumber },
    });

    if (existing) {
      return { message: 'Doctor already exists' };
    }
    const hashedPassword = await bcrypt.hash(password, 10);

    const newDoctor = this.doctorsRepo.create({
      name,
      mobileNumber,
      email,
      password: hashedPassword,
    });
    await this.doctorsRepo.save(newDoctor);
    const { password: _, ...result } = newDoctor;
    return {
      message: 'Doctor created',
      doctor: result,
    };
  }
  async getDoctorProfile(id: number) {
    const user = await this.doctorsRepo.findOne({
      where: { id },
    });

    if (!user) {
      return { message: 'Please login again' };
    }
    const { password, ...rest } = user;

    return {
      profile: rest,
    };
  }
  async updateDoctorProfile(id: number, data: UpdateProfileDoctorDto) {
    const doctor = await this.doctorsRepo.findOne({
      where: { id },
    });
    if (!doctor) return { message: "Doctor are not found" }
    Object.assign(doctor, data)
    await this.doctorsRepo.save(doctor);
    const { password, ...rest } = doctor;

    return {
      message: 'Profile updated successfully',
      profile: rest,
    };

  }
  // doctor.service.ts
  async onboardingDoctorProfile(id: number, data: UpdateProfileDoctorDto) {
    const doctor = await this.doctorsRepo.findOne({ where: { id } });

    if (!doctor) {
      return { message: 'Doctor not found' };
    }

    // update fields
    Object.assign(doctor, data);

    if (
      doctor.name &&
      doctor.specialization &&
      doctor.experienceYears !== null
    ) {
      doctor.isProfileCompleted = true;
    }

    await this.doctorsRepo.save(doctor);
    const { password, ...rest } = doctor;

    return {
      message: 'Profile updated successfully',
      profile: rest,
    };
  }
}