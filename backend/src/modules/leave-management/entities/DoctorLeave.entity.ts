import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  Index,
} from 'typeorm';

import { Doctors } from '../../doctors/entity/doctor.entity';

@Entity('doctor_leaves')
export class DoctorLeave {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Doctors, (doctor) => doctor.id, {
    onDelete: 'CASCADE',
  })
  @Index()
  doctor: Doctors;

  @Column({ type: 'date' })
  @Index()
  startDate: string; // YYYY-MM-DD

  @Column({ type: 'date' })
  @Index()
  endDate: string; // YYYY-MM-DD

  @Column({ default: true })
  isFullDay: boolean;

  @Column({ type: 'time', nullable: true })
  startTime?: string | null; // HH:mm

  @Column({ type: 'time', nullable: true })
  endTime?: string | null; // HH:mm

  @Column({ nullable: true })
  reason?: string | null;
}
