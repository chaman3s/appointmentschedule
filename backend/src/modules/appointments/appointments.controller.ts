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
import { ConfirmAppointmentDto } from './dto/confirm-appointment.dto';
import { HoldNextAppointmentDto } from './dto/hold-next-appointment.dto';
import { CancelAppointmentDto } from './dto/cancel-appointment.dto';
import { Jwtguard } from '../common/Guard/jwt.guard';
import { Roles } from '../common/decorator/roles.decorator';
import { RolesGuard } from '../common/Guard/roles.guard';

@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}
   @UseGuards(Jwtguard, RolesGuard)
  @Roles('user')
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
  @Get('slots/next/:doctorId')
  async getSlotsWithNextAvailable(
    @Param('doctorId', ParseIntPipe) doctorId: number,
    @Query('date') date?: string,
    @Query('maxDays') maxDays?: string,
  ) {
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new BadRequestException('Invalid date format');
    }

    const parsedMaxDays =
      maxDays === undefined || maxDays === ''
        ? undefined
        : Number.parseInt(maxDays, 10);

    if (parsedMaxDays !== undefined && !Number.isFinite(parsedMaxDays)) {
      throw new BadRequestException('maxDays must be a number');
    }

    return this.appointmentsService.getSlotsWithNextAvailable(
      doctorId,
      date,
      parsedMaxDays,
    );
  }
  @UseGuards(Jwtguard, RolesGuard)
  @Roles('user')
  @Post('bookNext')
  holdNext(@Req() req, @Body() dto: HoldNextAppointmentDto) {
    return this.appointmentsService.holdNextSlot(dto, req.user.id);
  }

  @UseGuards(Jwtguard, RolesGuard)
  @Roles('user')
  @Post('confirmNextBook')
  confirm(@Req() req, @Body() dto: ConfirmAppointmentDto) {
    return this.appointmentsService.confirmBooking(
      dto.appointment_id,
      req.user.id,
    );
  }

  @UseGuards(Jwtguard, RolesGuard)
  @Roles('user')
  @Post()
  book(@Req() req, @Body() dto: CreateAppointmentDto) {
    const userId = req.user.id;
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
  @Get('user/all')
  getAllUserAppointments(@Req() req) {
    return this.appointmentsService.getUserAppointments(req.user.id);
  }

  @UseGuards(Jwtguard, RolesGuard)
  @Roles('user')
  @Get('my')
  getMyAppointments(@Req() req) {
    return this.appointmentsService.getUserAppointments(req.user.id);
  }
  @Patch('reschedule/:id')
  @UseGuards(Jwtguard)
  @Roles('user')
  async reschedule(
    @Param('id', ParseIntPipe) id: number,
    @Req() req,
    @Body()
    body: {
      date: string;
      start_time: string;
      end_time: string;
    },
  ) {
    return this.appointmentsService.rescheduleAppointment(
      id,
      req.user.id,
      body.date,
      body.start_time,
      body.end_time,
    );
  }

  @UseGuards(Jwtguard, RolesGuard)
  @Roles('user')
  @Patch(':id/cancel')
  cancelAppointment(
    @Param('id', ParseIntPipe) appointmentId: number,
    @Req() req,
    @Body() dto: CancelAppointmentDto,
  ) {
    return this.appointmentsService.cancelAppointment(
      appointmentId,
      req.user.id,
      dto?.reason,
    );
  }
}
