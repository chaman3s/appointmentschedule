import { Controller, Get, Post, Body, Patch, Param, Delete,UseGuards } from '@nestjs/common';
import { HospitalService } from './hospital.service';
import { CreateHospitalDto } from './dto/create-hospital.dto';
import { UpdateHospitalDto } from './dto/update-hospital.dto';
import { Jwtguard } from '../common/Guard/jwt.guard';
import { Roles } from '../common/decorator/roles.decorator';
import { RolesGuard } from '../common/Guard/roles.guard';
import { Req } from '@nestjs/common';
@Controller('hospital')
export class HospitalController {
  constructor(private readonly hospitalService: HospitalService) {}
  @UseGuards(Jwtguard, RolesGuard)
  @Roles('doctor')
  @Post()
 create(@Req() req, @Body() dto: CreateHospitalDto) {
  return this.hospitalService.create(dto, req.user.id);
}
  @UseGuards(Jwtguard, RolesGuard)
  @Roles('doctor')
  @Get()
  findAll() {
    return this.hospitalService.findAll();
  }
  @UseGuards(Jwtguard, RolesGuard)
  @Roles('doctor')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.hospitalService.findOne(+id);
  }
  @UseGuards(Jwtguard, RolesGuard)
  @Roles('doctor')
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateHospitalDto: UpdateHospitalDto) {
    return this.hospitalService.update(+id, updateHospitalDto);
  }
  @UseGuards(Jwtguard, RolesGuard)
  @Roles('doctor')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.hospitalService.remove(+id);
  }
}
