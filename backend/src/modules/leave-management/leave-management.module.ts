import { Module } from '@nestjs/common';
import { LeaveManagementService } from './leave-management.service';
import { LeaveManagementController } from './leave-management.controller';

@Module({
  controllers: [LeaveManagementController],
  providers: [LeaveManagementService],
})
export class LeaveManagementModule {}
