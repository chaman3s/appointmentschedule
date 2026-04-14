import { Module } from '@nestjs/common';
import { PatientController } from './patients.controller';
import { PatientService } from './patients.service';
import { Patients } from './entities/patient.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forFeature([Patients]),
  ],
  controllers: [PatientController],
  providers: [PatientService],
})
export class PatientsModule { }
