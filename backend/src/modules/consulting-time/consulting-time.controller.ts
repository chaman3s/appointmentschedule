import {
  Controller,
  Post,
  Body,
  Req,
  UseGuards,
  Get,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { ConsultingTimeService } from './consulting-time.service';
import { CreateConsultingTimeDto } from './DTO/create-consulting-time.dto';
import { CreateCustomAvailabilityDto } from './DTO/create-custom-availability.dto';
import { Jwtguard } from '../common/Guard/jwt.guard';
import { Roles } from '../common/decorator/roles.decorator';
import { RolesGuard } from '../common/Guard/roles.guard';

@Controller('doctor/consultingTime')
export class ConsultingTimeController {
  constructor(private readonly service: ConsultingTimeService) {}
  @UseGuards(Jwtguard, RolesGuard)
  @Roles('doctor')
  @Post('create')
  create(@Req() req, @Body() dto: CreateConsultingTimeDto) {
    const doctorId = Number(req.user?.id);
    if (!doctorId || isNaN(doctorId)) {
      throw new BadRequestException('Invalid user');
    }
    return this.service.create(doctorId, dto);
  }
  @UseGuards(Jwtguard, RolesGuard)
  @Roles('doctor')
  @Get('me')
  getMySchedule(@Req() req) {
    const doctorId = Number(req.user?.id);
    if (!doctorId || isNaN(doctorId)) {
      throw new BadRequestException('Invalid user');
    }
    return this.service.getDoctorSchedule(doctorId);;
  }
  @UseGuards(Jwtguard, RolesGuard)
  @Roles('doctor')
  @Get('availability')
  getAvailability(@Req() req, @Query('date') date: string) {
    const doctorId = Number(req.user?.id);
    if (!doctorId || isNaN(doctorId)) {
      throw new BadRequestException('Invalid user');
    }
    if (!date) {
      throw new BadRequestException('Date is required');
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new BadRequestException('Invalid date format (YYYY-MM-DD)');
    }
    return this.service.getAvailability(doctorId, date);
  }
  @UseGuards(Jwtguard, RolesGuard)
  @Roles('doctor')
  @Post('custom-availability')
  createCustom(
    @Req() req,
    @Body() dto: CreateCustomAvailabilityDto,
  ) {
    const doctorId = Number(req.user?.id);

    if (!doctorId || isNaN(doctorId)) {
      throw new BadRequestException('Invalid user');
    }

    return this.service.createCustomAvailability(doctorId, dto);
  }
}