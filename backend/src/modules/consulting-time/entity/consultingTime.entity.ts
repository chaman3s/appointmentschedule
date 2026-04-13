import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
} from 'typeorm';

import { Doctors } from '../../doctors/entity/doctor.entity';
import { ConsultingDay } from './consultingDays.entity';

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

  // ✅ FIXED (this was broken in your code)
  @ManyToOne(() => Doctors, (doctor) => doctor.consultingTimes, {
    onDelete: 'CASCADE',
  })
  doctor: Doctors;

  // ✅ correct
  @OneToMany(() => ConsultingDay, (day) => day.consultingTime)
  days: ConsultingDay[];
}