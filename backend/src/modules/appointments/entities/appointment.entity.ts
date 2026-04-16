import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,

} from 'typeorm';

import { Doctors } from '../../doctors/entity/doctor.entity';
import { User } from '../../users/entities/user.entity';
import { Patients } from '../../patients/entities/patient.entity';

@Entity('appointments')
@Unique('unique_doctor_slot', ['doctor', 'appointment_date', 'start_time'])
export class Appointment {
  @PrimaryGeneratedColumn()
  appointment_id: number;

  // ---------------- RELATIONS ----------------

  @ManyToOne(() => Doctors, { eager: false })
  @JoinColumn({ name: 'doctor_id' })
  doctor: Doctors;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Patients, { nullable: true, eager: false })
  @JoinColumn({ name: 'patient_id' })
  patient: Patients ;

  // ---------------- CORE FIELDS ----------------

  @Column({ type: 'date' })
  appointment_date: string;

  @Column({ type: 'time' })
  start_time: string;

  @Column({ type: 'time' })
  end_time: string;

  // ---------------- FLAGS ----------------

  @Column({ default: false })
  is_family: boolean;

  @Column({ type: 'boolean', default: false })
  payment_status: boolean;

  // ---------------- ENUM-LIKE FIELDS ----------------

  @Column({ type: 'varchar', length: 50 })
  consulting_type: string; // e.g. online, offline

  @Column({ type: 'varchar', length: 50, default: 'booked' })
  status: string; // booked, cancelled, completed

  @Column({ type: 'varchar', length: 50, nullable: true })
  visit_type: string;

  // ---------------- OPTIONAL META ----------------

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