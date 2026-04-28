import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Jwtguard } from '../common/Guard/jwt.guard';
import { Roles } from '../common/decorator/roles.decorator';
import { RolesGuard } from '../common/Guard/roles.guard';
import { ClinicService } from './clinic.service';
import { UpsertClinicProfileDto } from './dto/upsert-clinic-profile.dto';
import { UpsertClinicScheduleDto } from './dto/upsert-clinic-schedule.dto';
import { CreateClinicClosureDto } from './dto/create-clinic-closure.dto';

@Controller('clinic')
export class ClinicController {
  constructor(private readonly clinicService: ClinicService) {}

  @UseGuards(Jwtguard, RolesGuard)
  @Roles('doctor')
  @Post('profile')
  upsertProfile(@Req() req, @Body() dto: UpsertClinicProfileDto) {
    return this.clinicService.upsertMyClinic(Number(req.user.id), dto);
  }

  @UseGuards(Jwtguard, RolesGuard)
  @Roles('doctor')
  @Get('me')
  getMyClinic(@Req() req) {
    return this.clinicService.getMyClinic(Number(req.user.id));
  }

  @UseGuards(Jwtguard, RolesGuard)
  @Roles('doctor')
  @Patch('profile')
  updateProfile(@Req() req, @Body() dto: UpsertClinicProfileDto) {
    return this.clinicService.upsertMyClinic(Number(req.user.id), dto);
  }

  @UseGuards(Jwtguard, RolesGuard)
  @Roles('doctor')
  @Post('schedules')
  upsertSchedules(@Req() req, @Body() dto: UpsertClinicScheduleDto) {
    return this.clinicService.upsertMyClinicSchedules(Number(req.user.id), dto);
  }

  @UseGuards(Jwtguard, RolesGuard)
  @Roles('doctor')
  @Post('closures')
  addClosure(@Req() req, @Body() dto: CreateClinicClosureDto) {
    return this.clinicService.addMyClinicClosure(Number(req.user.id), dto);
  }

  @UseGuards(Jwtguard, RolesGuard)
  @Roles('doctor')
  @Get('closures')
  listClosures(@Req() req) {
    return this.clinicService.listMyClinicClosures(Number(req.user.id));
  }

  @UseGuards(Jwtguard, RolesGuard)
  @Roles('doctor')
  @Delete('closures/:id')
  deleteClosure(@Req() req, @Param('id', ParseIntPipe) id: number) {
    return this.clinicService.deleteMyClinicClosure(Number(req.user.id), id);
  }
}

