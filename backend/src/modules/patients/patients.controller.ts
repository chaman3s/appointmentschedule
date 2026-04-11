import { User } from './../users/entities/user.entity';
// patient.controller.ts
import {
  Controller,
  UseGuards,
  Req,
  Post,
  Body,
  Get,
} from '@nestjs/common';
import { PatientService } from './patients.service';
import { Jwtguard } from '../common/guard/jwt.guard';
import { RolesGuard } from '../common/guard/roles.guard';
import { Roles } from '../common/decorator/roles.decorator';
import { CreatePatientDto } from './dto/create-patient.dto';
import { BadRequestException } from '@nestjs/common';
@Controller('patients')
export class PatientController {
  constructor(private readonly patientService: PatientService) {}
  @UseGuards(Jwtguard, RolesGuard)
  @Roles('user')
  @Post('profile')
  createOrUpdate(@Req() req, @Body() dto: CreatePatientDto) {
       if (!dto || Object.keys(dto).length === 0) {
    throw new BadRequestException('Request body cannot be empty');
  }
    return this.patientService.createOrUpdate(req.user.sub, dto);
  }

  @UseGuards(Jwtguard, RolesGuard)
  @Roles('user')
  @Get('profile')
  getProfile(@Req() req) {
 
    return this.patientService.getProfile(req.user.sub);
  }
}
