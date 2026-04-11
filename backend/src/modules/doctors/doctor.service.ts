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
      select: ['id', 'password', 'mobileNumber', 'name']
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
  async getDoctorProfile(id: any) {
    console.log("userid:",id)
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
  async createOrUpdate(userId: number, dto: UpdateProfileDoctorDto) {
    let doctor = await this.doctorsRepo.findOne({
      where: { id: userId },
    });

    if (doctor) {
      Object.assign(doctor, dto);
    } else {
      doctor = this.doctorsRepo.create({
        id: userId,
        ...dto,
      });
    }

    // ✅ Profile completion logic
    if (
      doctor.name &&
      doctor.specialization &&
      doctor.experienceYears !== null
    ) {
      doctor.isProfileCompleted = true;
    }
    else if (doctor.isProfileCompleted==false){
       return{message:'Check you fill this filed name ,specialization, experienceYears'}
    }
    await this.doctorsRepo.save(doctor);

    const { password, ...rest } = doctor;

    return {
      message: doctor ? 'Profile updated successfully' : 'Profile created successfully',
      profile: rest,
    };
  }
}
