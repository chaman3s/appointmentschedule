// user.entity.ts
import { Entity, PrimaryGeneratedColumn, Column,OneToMany } from 'typeorm';
import { Services } from './services.entity';
// import { ConsultingTime } from './consultingTime.entity';
@Entity('doctors')
export class Doctors {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ unique: true, length: 15 })
  mobileNumber: string;

  @Column({ unique: true })
  email: string;

  @Column({ select: false })
  password: string;
  @Column({ default: false })
  isProfileCompleted: boolean;
  @Column({ nullable: true })
  imageUrl: string;

  @Column( {nullable: true})
  specialization: string;

  @Column({ default:0, nullable: true,type: 'int' })
  experienceYears: number;


  @Column({ nullable: true })
  achievement: string;

  @Column({ nullable: true })
  googleReviewUrl: string;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  averageRating: number;

  @Column({ type: 'int', default: 0 })
  totalReviews: number;

  @Column({ nullable: true })
  doctorSignImage: string;

  @Column({ nullable: true })
  doctorStampImage: string;
  @OneToMany(() => Services, (service) => service.doctor)
  services: Services[];
  //  @OneToMany(() => ConsultingTime, (ct) => ct.doctor)
  // consultingTimes: ConsultingTime[];
}
