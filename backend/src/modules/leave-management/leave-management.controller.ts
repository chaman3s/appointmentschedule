import { Controller, Get, Post, Body, Patch, Param, Delete,UseGuards } from '@nestjs/common';
import { LeaveManagementService } from './leave-management.service';
import { CreateLeaveManagementDto } from './dto/create-leave-management.dto';
import { UpdateLeaveManagementDto } from './dto/update-leave-management.dto';
import { Jwtguard } from '../common/Guard/jwt.guard';
import { Roles } from '../common/decorator/roles.decorator';
import { RolesGuard } from '../common/Guard/roles.guard';
@Controller('leave-management')
export class LeaveManagementController {
  constructor(private readonly leaveManagementService: LeaveManagementService) {}
  @UseGuards(Jwtguard, RolesGuard)
   @Roles('doctor')
  @Post()
  create(@Body() createLeaveManagementDto: CreateLeaveManagementDto) {
    return this.leaveManagementService.create(createLeaveManagementDto);
  }
  @UseGuards(Jwtguard, RolesGuard)
   @Roles('doctor')
  @Get()
  findAll() {
    return this.leaveManagementService.findAll();
  }
 @UseGuards(Jwtguard, RolesGuard)
   @Roles('doctor')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.leaveManagementService.findOne(+id);
  }
 @UseGuards(Jwtguard, RolesGuard)
   @Roles('doctor')
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateLeaveManagementDto: UpdateLeaveManagementDto) {
    return this.leaveManagementService.update(+id, updateLeaveManagementDto);
  }
 @UseGuards(Jwtguard, RolesGuard)
   @Roles('doctor')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.leaveManagementService.remove(+id);
  }
}
