// src/modules/consulting-time/entities/consulting-time.entity.ts

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { Doctors } from './doctor.entity';
import { ConsultingDay } from './consulting-day.entity';

@Entity()
export class ConsultingTime {
  @PrimaryGeneratedColumn()
  consultingTimeId: number;

  @Column({ type: 'time' })
  startTime: string;

  @Column({ type: 'time' })
  endTime: string;

  @Column({ default: false })
  repeat: boolean;

  @ManyToOne(() => Doctors, (doctor) => doctor.consultingTimes, {
    onDelete: 'CASCADE',
  })
  doctor: Doctors;

  @OneToMany(() => ConsultingDay, (day) => day.consultingTime)
  days: ConsultingDay[];
}