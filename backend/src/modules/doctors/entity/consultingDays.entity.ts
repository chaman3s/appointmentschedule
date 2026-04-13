import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { ConsultingTime } from './consultingTime.entity';

@Entity()
export class ConsultingDay {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  day: string; // MONDAY, TUESDAY etc

  @ManyToOne(() => ConsultingTime, (ct) => ct.days, {
    onDelete: 'CASCADE',
  })
  consultingTime: ConsultingTime;
}