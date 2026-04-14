import {
  Controller,
  Post,
  Body,
  Req,
  UseGuards,
  Get,
  Param,
  Query
} from '@nestjs/common';
import { ConsultingTimeService } from './consulting-time.service';
import { CreateConsultingTimeDto } from './DTO/create-consulting-time.dto';
import { Jwtguard } from '../common/Guard/jwt.guard';

@Controller('doctor/consultingTime')
export class ConsultingTimeController {
  constructor(private readonly service: ConsultingTimeService) { }

  // ✅ Create consulting time
  @UseGuards(Jwtguard)
  @Post('create')
  create(@Req() req, @Body() dto: CreateConsultingTimeDto) {
    const doctorId = req.user.id; // 👈 comes from JWT
    return this.service.create(doctorId, dto);
  }

  // ✅ Get all consulting times of logged-in doctor
  @UseGuards(Jwtguard)
  @Get('me')
  async getMySchedule(@Req() req) {
    const doctorId = req.user.id;

    return this.service['ctRepo'].find({
      where: { doctor: { id: doctorId } },
      relations: ['days'],
      order: { startTime: 'ASC' },
    });
  }
  // ✅ Get consulting time by doctorId (public)
  @Get(':doctorId')
  async getByDoctor(@Param('doctorId') doctorId: number) {
    return this.service['ctRepo'].find({
      where: { doctor: { id: doctorId } },
      relations: ['days'],
      order: { startTime: 'ASC' },
    });
  }
  @Get('availability')
  getAvailability(
    @Req() req,
    @Query('date') date: string,
  ) {
    return this.service.getAvailability(req.user.id, date);
  }
}