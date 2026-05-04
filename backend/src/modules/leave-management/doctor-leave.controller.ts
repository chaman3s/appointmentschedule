import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Jwtguard } from '../common/Guard/jwt.guard';
import { Roles } from '../common/decorator/roles.decorator';
import { RolesGuard } from '../common/Guard/roles.guard';
import { DoctorLeaveService } from './doctor-leave.service';
import { CreateDoctorLeaveDto } from './dto/create-doctor-leave.dto';

@Controller('doctor/leaves')
export class DoctorLeaveController {
  constructor(private readonly doctorLeaveService: DoctorLeaveService) {}

  @UseGuards(Jwtguard, RolesGuard)
  @Roles('doctor')
  @Post()
  create(@Req() req, @Body() dto: CreateDoctorLeaveDto) {
    return this.doctorLeaveService.createForMe(Number(req.user.id), dto);
  }
  
  @UseGuards(Jwtguard, RolesGuard)
  @Roles('doctor')
  @Get()
  list(@Req() req, @Query('from') from?: string, @Query('to') to?: string) {
    return this.doctorLeaveService.listForMe(Number(req.user.id), from, to);
  }

  @UseGuards(Jwtguard, RolesGuard)
  @Roles('doctor')
  @Delete(':id')
  remove(@Req() req, @Param('id', ParseIntPipe) id: number) {
    return this.doctorLeaveService.deleteForMe(Number(req.user.id), id);
  }
}

