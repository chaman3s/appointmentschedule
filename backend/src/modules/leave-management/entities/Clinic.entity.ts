import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToMany
} from 'typeorm';

import { ClinicSchedule } from './clinicSchedule.entity';
import { ClinicClosure } from './clinicClosure.entity';
import { Doctors } from '../../doctors/entity/doctor.entity';

@Entity('clinics')
export class Clinic {

  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  phone?: string;

  @Column({ nullable: true })
  email?: string;

  @Column({ nullable: true })
  addressLine1?: string;

  @Column({ nullable: true })
  addressLine2?: string;

  @Column({ nullable: true })
  city?: string;

  @Column({ nullable: true })
  state?: string;

  @Column({ nullable: true })
  postalCode?: string;

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
    () => Doctors,
    doctor => doctor.clinic
  )
  doctors: Doctors[];
}
