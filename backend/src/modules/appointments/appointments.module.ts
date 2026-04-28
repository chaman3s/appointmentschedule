import { Module } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { AppointmentsController } from './appointments.controller';
import { Appointment } from './entities/appointment.entity';
import { CustomAvailability } from '../consulting-time/entity/custom_availability.entity';
import { ConsultingTime } from '../consulting-time/entity/consultingTime.entity';
import { Doctors } from '../doctors/entity/doctor.entity';
import { Clinic } from '../leave-management/entities/Clinic.entity';
import { ClinicSchedule } from '../leave-management/entities/clinicSchedule.entity';
import { ClinicClosure } from '../leave-management/entities/clinicClosure.entity';
import { DoctorLeave } from '../leave-management/entities/DoctorLeave.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
@Module(
  {
    imports: [
      TypeOrmModule.forFeature([
        ConsultingTime,
        CustomAvailability,
        Appointment,
        Doctors,
        Clinic,
        ClinicSchedule,
        ClinicClosure,
        DoctorLeave,
      ]),
    ],
    controllers: [AppointmentsController],
    providers: [AppointmentsService],

  })
export class AppointmentsModule { }
