import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne
} from 'typeorm';

import { Clinic } from './Clinic.entity';

@Entity('clinic_schedules')
export class ClinicSchedule {

  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(
    () => Clinic,
    clinic => clinic.schedules
  )
  clinic: Clinic;
  @Column()
  dayOfWeek: number; // 0=Sunday, 1=Monday ... 6=Saturday
  @Column({
    type: 'time'
  })
  openTime: string;
  @Column({
    type: 'time'
  })
  closeTime: string;

  @Column({
    default: true
  })
  isOpen: boolean;
}