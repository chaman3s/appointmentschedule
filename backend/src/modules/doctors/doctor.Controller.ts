import { Controller, UseGuards, Req, Get } from '@nestjs/common';
import { Jwtguard } from '../common/guard/jwt.guard';
import { DoctorServices } from './doctor.service';

@Controller('doctors')
export class DoctorController {
  constructor(private DoctorServices: DoctorServices) {} // ✅ REQUIRED

  @UseGuards(Jwtguard)
  @Get('profile')
  getProfile(@Req() req) {
    return this.DoctorServices.getDoctorProfile(req.user.sub); // ✅ fixed
  }
}