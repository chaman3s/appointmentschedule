
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

import { Doctors } from '../../doctors/entity/doctor.entity';
import { User } from '../../users/entities/user.entity';
import { Patients } from '../../patients/entities/patient.entity';
import { SchedulingType, AppointmentStatus } from '../../common/enums/appointment.enum';
import { ConsultingTime } from '../../consulting-time/entity/consultingTime.entity';
import { CustomAvailability } from '../../consulting-time/entity/custom_availability.entity';
@Entity('appointments')
@Index('idx_doctor_slot', ['doctor', 'appointment_date', 'start_time'])
export class Appointment {
  @PrimaryGeneratedColumn()
  appointment_id: number;

  @ManyToOne(() => Doctors)
  @JoinColumn({ name: 'doctor_id' })
  doctor: Doctors;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Patients, { nullable: true })
  @JoinColumn({ name: 'patient_id' })
  patient: Patients;

  @Column({ type: 'date' })
  appointment_date: string;

  @Column({ type: 'time' })
  start_time: string;

  @Column({ type: 'time' })
  end_time: string;

  @Column({
    type: 'enum',
    enum: SchedulingType,
     default: SchedulingType.STREAM
  })
  scheduling_type: SchedulingType;

  @Column({
    type: 'enum',
    enum: AppointmentStatus,
    default: AppointmentStatus.BOOKED,
  })
  status: AppointmentStatus;

  @Column({ type: 'int', default: 1 })
  max_capacity: number;

  @Column({ default: false })
  is_family: boolean;

  @Column({ type: 'boolean', default: false })
  payment_status: boolean;

  @Column({ type: 'varchar', length: 50 })
  consulting_type: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  visit_type: string;

  @Column({ type: 'text', nullable: true })
  complaint: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  source: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  ivr_reference_id: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  ivr_status: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}