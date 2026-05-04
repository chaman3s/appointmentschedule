import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
} from 'typeorm';

import { Doctors } from '../../doctors/entity/doctor.entity';

@Entity('hospitals')
export class Hospital {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  address: string;

  // Doctor who owns this hospital
  @OneToOne(() => Doctors, { eager: true })
  @JoinColumn()
  doctor: Doctors;
}