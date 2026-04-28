import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToMany
} from 'typeorm';

import { ClinicSchedule } from './clinicSchedule.entity';
import { ClinicClosure } from './clinicClosure.entity';
import { Doctor } from '../../doctors/entity/doctor.entity';

@Entity('clinics')
export class Clinic {

  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(
    () => ClinicSchedule,
    schedule => schedule.clinic
  )
  schedules: ClinicSchedule[];

  @OneToMany(
    () => ClinicClosure,
    closure => closure.clinic
  )
  closures: ClinicClosure[];

  @OneToMany(
    () => Doctor,
    doctor => doctor.clinic
  )
  doctors: Doctor[];
}