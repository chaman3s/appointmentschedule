import { Injectable } from '@nestjs/common';
import { Doctors } from './entity/doctor.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UpdateProfileDoctorDto } from './dto/updateprofile.doctor.dto';
import { SignupDto } from '../auth/DTO/doctorAuth';

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
  async createDoctor(data:SignupDto) {

    const {
      name,
      mobileNumber,
      password,
    } = data;
    if (!mobileNumber || !password || !name) {
      return {message:"number & password are require"}
    
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
  // 1. Find existing doctor
  let doctor = await this.doctorsRepo.findOne({
    where: { id: userId },
  });

  let isNew = false;

  // 2. Create or update
  if (doctor) {
    Object.assign(doctor, dto);
  } else {
    doctor = this.doctorsRepo.create({
      id: userId,
      ...dto,
    });
    isNew = true;
  }

  // 3. Check profile completion
  const requiredFields = ['name', 'specialization', 'experienceYears'];

  const missingFields = requiredFields.filter((field) => {
    const value = doctor[field];

    return (
      value === undefined ||
      value === null ||
      (typeof value === 'string' && value.trim() === '')
    );
  });

  // 4. Set completion flag
  doctor.isProfileCompleted = missingFields.length === 0;

  // 5. Save to DB
  await this.doctorsRepo.save(doctor);

  // 6. Remove sensitive fields
  const { password, ...rest } = doctor;

  // 7. Response
  return {
    message: isNew
      ? 'Profile created successfully'
      : 'Profile updated successfully',
    isProfileCompleted: doctor.isProfileCompleted,
    missingFields, 
    profile: rest,
  };
}
  async getDoctors(specialization?: string, search?: string) {
    const query = this.doctorsRepo.createQueryBuilder('doctor');
    if (specialization) {
      query.andWhere('doctor.specialization ILIKE :specialization', {
        specialization: `%${specialization}%`,
      });
    }
    if (search) {
      query.andWhere('doctor.name ILIKE :search', {
        search: `%${search}%`,
      });
    }

    const doctors = await query.getMany();
    if (doctors.length === 0) {
      return {
        message: 'No doctors found',
        data: [],
      };
    }

    return {
      count: doctors.length,
      data: doctors,
    };
  }
}
