import { Module } from '@nestjs/common';
import { ConsultingTimeService } from '../consulting-time/consulting-time.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConsultingTime } from '../consulting-time/entity/consultingTime.entity';
import { ConsultingDay } from '../consulting-time/entity/consultingDays.entity';
import { Doctors } from '../doctors/entity/doctor.entity';
import { CustomAvailability } from '../consulting-time/entity/custom_availability.entity';
import { UserDoctorController } from './user-doctor.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ConsultingTime,
      ConsultingDay,
      Doctors,
      CustomAvailability,
    ]),
  ],
  controllers: [UserDoctorController],
  providers: [ConsultingTimeService],
})
export class UserDoctorModule {}