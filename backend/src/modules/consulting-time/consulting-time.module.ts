import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConsultingTimeController } from './consulting-time.controller';
import { ConsultingTimeService } from './consulting-time.service';
import { ConsultingTime } from './entity/consultingTime.entity';
import { ConsultingDay } from './entity/consultingDays.entity';
import { Doctors } from '../doctors/entity/doctor.entity' ;
import { CustomAvailability } from './entity/custom_availability.entity';


@Module({
  imports: [
    TypeOrmModule.forFeature([
      Doctors,
      ConsultingTime,
      ConsultingDay,
      CustomAvailability,
    ]),
  ],
  controllers: [ConsultingTimeController],
  providers: [ConsultingTimeService]
})
export class ConsultingTimeModule { }
