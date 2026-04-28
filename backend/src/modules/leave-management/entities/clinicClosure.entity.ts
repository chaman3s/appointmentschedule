import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne
} from 'typeorm';

import { Clinic } from './Clinic.entity';

export enum ClosureType {
  HOLIDAY = 'HOLIDAY',
  TEMPORARY = 'TEMPORARY',
  EMERGENCY = 'EMERGENCY'
}

@Entity('clinic_closures')
export class ClinicClosure {

  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(
    () => Clinic,
    clinic => clinic.closures
  )
  clinic: Clinic;

  @Column({
    type: 'enum',
    enum: ClosureType
  })
  type: ClosureType;

  @Column({
    type: 'timestamp'
  })
  startDateTime: Date;

  @Column({
    type: 'timestamp'
  })
  endDateTime: Date;

  @Column({
    nullable: true
  })
  reason: string;
}