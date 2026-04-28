import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LeaveManagementController } from './leave-management.controller';
import { Clinic } from './entities/Clinic.entity';
import { ClinicSchedule } from './entities/clinicSchedule.entity';
import { ClinicClosure } from './entities/clinicClosure.entity';
import { Doctors } from '../doctors/entity/doctor.entity';
import { DoctorLeave } from './entities/DoctorLeave.entity';
import { ClinicService } from './clinic.service';
import { ClinicController } from './clinic.controller';
import { DoctorLeaveService } from './doctor-leave.service';
import { DoctorLeaveController } from './doctor-leave.controller';
import { LeaveManagementService } from './leave-management.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Clinic,
      ClinicSchedule,
      ClinicClosure,
      DoctorLeave,
      Doctors,
    ]),
  ],
  controllers: [
    LeaveManagementController,
    ClinicController,
    DoctorLeaveController,
  ],
  providers: [LeaveManagementService, ClinicService, DoctorLeaveService],
})
export class LeaveManagementModule {}
