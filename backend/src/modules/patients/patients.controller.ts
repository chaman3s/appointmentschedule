import { User } from './../users/entities/user.entity';
// patient.controller.ts
import {
  Controller,
  UseGuards,
  Req,
  Post,
  Body,
  Get,
  Patch,
  Delete,
  Param
} from '@nestjs/common';
import { PatientService } from './patients.service';
import { Jwtguard } from '../common/Guard/jwt.guard';
import { RolesGuard } from '../common/Guard/roles.guard';
import { Roles } from '../common/decorator/roles.decorator';
import { CreatePatientDto } from './dto/create-patient.dto';
import { BadRequestException } from '@nestjs/common';
@Controller('patients')
export class PatientController {
  constructor(private readonly patientService: PatientService) { }

  @UseGuards(Jwtguard, RolesGuard)
  @Roles('user')
  @Post()
  create(@Req() req, @Body() dto: CreatePatientDto) {
    return this.patientService.create(req.user.id, dto);
  }

  @UseGuards(Jwtguard, RolesGuard)
  @Roles('user')
  @Get()
  getAll(@Req() req) {
    return this.patientService.getAll(req.user.id);
  }

  @UseGuards(Jwtguard, RolesGuard)
  @Roles('user')
  @Patch(':id')
  update(
    @Param('id') id: number,
    @Body() dto: CreatePatientDto,
  ) {
    return this.patientService.update(id, dto);
  }

  @UseGuards(Jwtguard, RolesGuard)
  @Roles('user')
  @Delete(':id')
  remove(@Param('id') id: number) {
    return this.patientService.remove(id);
  }
}