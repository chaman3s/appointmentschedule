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

  @Column({ default: true })
  repeat: boolean;
  
  @Column ({default:15})
  slotDuration:number
@Column({
    type: 'enum',
    enum: ['STREAM', 'WAVE'],
    default: 'STREAM',
  })
  scheduling_type: 'Steam' | 'Wave';
  @ManyToOne(() => Doctors, (doctor) => doctor.consultingTimes, {
    onDelete: 'CASCADE',
  })
  doctor: Doctors;
 @Column({ type: 'int', nullable: true ,})
  wave_capacity: number;
  // ✅ correct
  @OneToMany(() => ConsultingDay, (day) => day.consultingTime)
  days: ConsultingDay[];
}