import { Controller, Post, Body } from '@nestjs/common';
import { AuthServices } from './auth.service';
import {SignupDto} from './DTO/doctorAuth';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthServices) {}

  // ✅ LOGIN
  @Post('login')
  async login(
    @Body() body: {
      number: string;
      password: string;
      role: string;
    },
  ) {
    const { number, password, role } = body;

    return this.authService.login(number, password, role);
  }

  // ✅ USER SIGNUP
  @Post('signup/user')
  signupUser(@Body() body: { number: string; name: string }) {
    return this.authService.signupUser(body);
  }

  // ✅ DOCTOR SIGNUP
  @Post('signup/doctor')
signupDoctor(@Body() body:SignupDto) {
  if (!body) {
    return { message: 'Body is missing' };
  }

  return this.authService.signupDoctor(body);
}
}