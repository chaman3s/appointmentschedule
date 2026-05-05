import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Doctors } from './entity/doctor.entity';
import { Services } from './entity/services.entity';
import { ConsultingTime } from '../consulting-time/entity/consultingTime.entity';
import { ConsultingDay } from '../consulting-time/entity/consultingDays.entity';
import { DoctorServices } from './doctor.service';
import { DoctorController } from './doctor.Controller';
import { Hospital } from '../hospital/entities/hospital.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Doctors,
      Services,
      ConsultingTime,
      ConsultingDay,
      Hospital,
    ]),
  ],
  providers: [DoctorServices],
  controllers: [DoctorController],
  exports: [DoctorServices],
})
export class DoctorModule { }