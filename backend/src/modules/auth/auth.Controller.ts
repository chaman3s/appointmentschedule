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
      number?: string;
      password?: string;
      name?:string;
      role: string;
    },
  ) {
   const { number, password, name, role } = body;
     if (role === 'user') {
       if (!number) {
    return { message: 'Number is required for user login' };
  }
  return this.authService.Userlogin(number, role);
     }
     else{

      return this.authService.doctorlogin({
  number,
  password,
  name,
  role,
});
     }
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