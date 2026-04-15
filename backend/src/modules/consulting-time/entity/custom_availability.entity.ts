import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Doctors } from '../../doctors/entity/doctor.entity';

@Entity()
export class CustomAvailability {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'date' })
  date: string; // e.g. 2026-04-20

  @Column()
  startTime: string;

  @Column()
  endTime: string;
@Column ({default:15})
  slotDuration:number;
  @ManyToOne(() => Doctors, (doctor) => doctor.id, {
    onDelete: 'CASCADE',
  })
  doctor: Doctors;
}