import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import {Doctors} from "./doctor.entity"
@Entity('Services')
export class Services{
   @PrimaryGeneratedColumn()
  service_id: number;
  @Column()
  service_name: string;
 @ManyToOne(() => Doctors, (doctor) => doctor.services, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'doctor_id' }) // maps DB column
  doctor: Doctors;

}