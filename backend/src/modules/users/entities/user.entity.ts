import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Patients } from '../../patients/entities/patient.entity';

@Entity('users')
export class User {

  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ unique: true, length: 15 })
  mobileNumber: string;
  @OneToMany(() => Patients, (patient) => patient.user)
  patientDetails: Patients[]; // ✅ FIXED
}