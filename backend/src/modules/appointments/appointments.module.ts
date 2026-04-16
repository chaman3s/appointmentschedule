import { Module } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { AppointmentsController } from './appointments.controller';
import { Appointment } from './entities/appointment.entity';
import { CustomAvailability } from '../consulting-time/entity/custom_availability.entity';
import { ConsultingTime } from '../consulting-time/entity/consultingTime.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
@Module(
  {
    imports: [
      TypeOrmModule.forFeature([
        ConsultingTime,
        CustomAvailability,
        Appointment,
      ]),
    ],
    controllers: [AppointmentsController],
    providers: [AppointmentsService],
  })
export class AppointmentsModule { }
