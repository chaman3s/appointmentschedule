import { Injectable } from '@nestjs/common';
import { CreateLeaveManagementDto } from './dto/create-leave-management.dto';
import { UpdateLeaveManagementDto } from './dto/update-leave-management.dto';

@Injectable()
export class LeaveManagementService {
  create(createLeaveManagementDto: CreateLeaveManagementDto) {
    return 'This action adds a new leaveManagement';
  }

  findAll() {
    return `This action returns all leaveManagement`;
  }

  findOne(id: number) {
    return `This action returns a #${id} leaveManagement`;
  }

  update(id: number, updateLeaveManagementDto: UpdateLeaveManagementDto) {
    return `This action updates a #${id} leaveManagement`;
  }

  remove(id: number) {
    return `This action removes a #${id} leaveManagement`;
  }
}
