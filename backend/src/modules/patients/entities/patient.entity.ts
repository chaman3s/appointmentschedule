import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('patientDetails')
export class Patients {
  @PrimaryGeneratedColumn()
  patient_id: number;
  // ✅ Foreign key column
  @Column()
  user_id: number;
  // ✅ Relation (separate)
  @ManyToOne(() => User, (user) => user.patientDetails)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  patient_name: string;

  @Column()
  patient_age: number;

  @Column()
  gender: string;

  @Column('decimal', { precision: 5, scale: 2 })
  weight: number;

  @Column()
  relation: string;

  @Column({ default: false })
  isprofile: boolean;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  recorded_at: Date;
}