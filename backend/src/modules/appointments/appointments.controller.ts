import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  BadRequestException,
  UseGuards,
  Req,
  ParseIntPipe,
  Patch,
} from '@nestjs/common';

import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { Jwtguard } from '../common/Guard/jwt.guard';
import { Roles } from '../common/decorator/roles.decorator';
import { RolesGuard } from '../common/Guard/roles.guard';

@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) { }
  @Get('slots/:doctorId')
  async getSlots(
    @Param('doctorId', ParseIntPipe) doctorId: number,
    @Query('date') date: string,
  ) {
    if (!date) {
      throw new BadRequestException('date is required');
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new BadRequestException('Invalid date format');
    }

    return this.appointmentsService.getAvailableSlots(doctorId, date);
  }
  @UseGuards(Jwtguard, RolesGuard)
  @Roles('user')
  @Post()
  book(@Req() req, @Body() dto: CreateAppointmentDto) {
    const userId = req.user.id;
    // ✅ extracted from token
    console.log("id:", userId)
    return this.appointmentsService.bookSlot({
      ...dto,
      user_id: userId, // 🔐 override user_id
    });
  }

  @UseGuards(Jwtguard, RolesGuard)
  @Roles('user')
  @Patch(':id/addpatient')
  addPatient(
    @Param('id', ParseIntPipe) appointmentId: number,
    @Body('patient_id') patientId: number,
    @Req() req,
  ) {
    return this.appointmentsService.addPatient(
      appointmentId,
      patientId,
      req.user.id,
    );
  }

  @UseGuards(Jwtguard, RolesGuard)
  @Roles('doctor')
  @Get('doctor')
  getDoctorAppointments(@Req() req) {
    return this.appointmentsService.getDoctorAppointments(req.user.id);
  }
  @UseGuards(Jwtguard, RolesGuard)
  @Roles('user')
  @Get('my')
  getMyAppointments(@Req() req) {
    return this.appointmentsService.getUserAppointments(req.user.id);
  }
}