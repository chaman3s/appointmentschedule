import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Doctors } from './entity/doctor.entity';
import { Services } from './entity/services.entity';
import { DoctorServices } from './doctor.service';
import { DoctorController } from './doctor.Controller';

@Module({
  imports: [TypeOrmModule.forFeature([Doctors, Services])],
  providers: [DoctorServices],
  controllers: [DoctorController],
  exports: [DoctorServices],
})
export class DoctorModule { }