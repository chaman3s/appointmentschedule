import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Doctors } from './entity/doctor.entity';
import { Services } from './entity/services.entity';
import { ConsultingTime } from '../consulting-time/entity/consultingTime.entity';
import { ConsultingDay } from '../consulting-time/entity/consultingDays.entity';
import { DoctorServices } from './doctor.service';
import { DoctorController } from './doctor.Controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Doctors,
      Services,
      ConsultingTime,
      ConsultingDay,
    ]),
  ],
  providers: [DoctorServices],
  controllers: [DoctorController],
  exports: [DoctorServices],
})
export class DoctorModule { }