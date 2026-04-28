import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { LeaveManagementService } from './leave-management.service';
import { CreateLeaveManagementDto } from './dto/create-leave-management.dto';
import { UpdateLeaveManagementDto } from './dto/update-leave-management.dto';

@Controller('leave-management')
export class LeaveManagementController {
  constructor(private readonly leaveManagementService: LeaveManagementService) {}

  @Post()
  create(@Body() createLeaveManagementDto: CreateLeaveManagementDto) {
    return this.leaveManagementService.create(createLeaveManagementDto);
  }

  @Get()
  findAll() {
    return this.leaveManagementService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.leaveManagementService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateLeaveManagementDto: UpdateLeaveManagementDto) {
    return this.leaveManagementService.update(+id, updateLeaveManagementDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.leaveManagementService.remove(+id);
  }
}
