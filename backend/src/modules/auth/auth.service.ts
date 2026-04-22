import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../users/user.service';
import { DoctorServices } from '../doctors/doctor.service';
import { SignupDto } from './DTO/doctorAuth';
@Injectable()
export class AuthServices {
  constructor(
    private jwtService: JwtService,
    private userService: UserService,
    private doctorService: DoctorServices,
  ) {}

  // ✅ LOGIN
  async login(number: string, password: string, role: string) {
    let response: any;
    let entity: any;

    if (role === 'user') {
      response = await this.userService.login(number);

      if (!response.user) {
        return response;
      }

      entity = response.user;
    } 
    else if (role === 'doctor') {
      response = await this.doctorService.login(number, password);

      if (!response.doctor) {
        return response;
      }

      entity = response.doctor;
    } 
    else {
      return { message: 'Role is not defined' };
    }

    const payload = {
      sub: entity.id,
      role,
    };

    const access_token = this.jwtService.sign(payload);

    return {
      message: 'Login successful',
      token: access_token,
      role,
    };
  }

  // ✅ USER SIGNUP
  async signupUser(data: any) {
    const response = await this.userService.createUser(
      data.number,
      data.name,
    );

    // 🔥 FIX: safe check instead of message check
    if (!response.user) {
      return response;
    }

    const payload = {
      sub: response.user.id,
      role: 'user',
    };

    return {
      message: 'User registered successfully',
      token: this.jwtService.sign(payload),
    };
  }

  // ✅ DOCTOR SIGNUP
  async signupDoctor(data:SignupDto) {
    const response = await this.doctorService.createDoctor(data);

    // 🔥 FIX: safe check
    if (!response.doctor) {
      return response;
    }

    const payload = {
      sub: response.doctor.id,
      role: 'doctor',
    };

    return {
      message: 'Doctor registered successfully',
      token: this.jwtService.sign(payload),
    };
  }
}