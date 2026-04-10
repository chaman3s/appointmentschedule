import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Doctors } from './entity/doctor.entity';
import { DoctorServices } from './doctor.service';

@Module({
  imports: [TypeOrmModule.forFeature([Doctors])],
  providers: [DoctorServices],
  exports: [DoctorServices], 
})
export class DoctorModule {}