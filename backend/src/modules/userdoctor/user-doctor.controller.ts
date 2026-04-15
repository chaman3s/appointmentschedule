import {
  Controller,
  Get,
  Param,
  Query,
  ParseIntPipe,
  BadRequestException,
} from '@nestjs/common';
import { ConsultingTimeService } from '../consulting-time/consulting-time.service';

@Controller('users/doctors')
export class UserDoctorController {
  constructor(private readonly service: ConsultingTimeService) {}

  @Get(':doctorId/availability')
  getDoctorAvailability(
    @Param('doctorId', ParseIntPipe) doctorId: number,
    @Query('date') date: string,
  ) {
    if (!date) {
      throw new BadRequestException('Date is required');
    }

    return this.service.getAvailability(doctorId, date);
  }
}