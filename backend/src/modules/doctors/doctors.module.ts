import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Doctors } from './entity/doctor.entity';
import { Services } from './entity/services.entity';
import { DoctorServices } from './doctor.service';
import { DoctorController } from './doctor.Controller';
// import { ConsultingTimeModule } from './consulting-time/consulting-time.module';

@Module({
  imports: [TypeOrmModule.forFeature([Doctors, Services])],
  providers: [DoctorServices],
  controllers: [DoctorController],
  exports: [DoctorServices],
})
export class DoctorModule { }