import {
 Entity,
 PrimaryGeneratedColumn,
 Column,
 OneToMany,
 OneToOne,
 ManyToOne,
 JoinColumn
} from 'typeorm';

import { Services } from './services.entity';
import { ConsultingTime } from '../../consulting-time/entity/consultingTime.entity';
import { Clinic } from '../../leave-management/entities/Clinic.entity';
import { Hospital } from '../../hospital/entities/hospital.entity';
@Entity('doctors')
export class Doctors {

 @PrimaryGeneratedColumn()
 id: number;

 @Column()
 name: string;

 @Column({
   unique: true,
   length: 15
 })
 mobileNumber: string;

 @Column({
   unique: true,
   nullable: true
 })
 email: string;

 @Column({ select: false })
 password: string;
 @Column ({nullable:true})
 address:string;

 @Column({ default: false })
 isProfileCompleted: boolean;

 @Column({ nullable: true })
 imageUrl: string;

 @Column({ nullable: true })
 specialization: string;

 @Column({
   type: 'int',
   default: 0,
   nullable: true
 })
 experienceYears: number;

 @Column({
   type: 'int',
   default: 15
 })
 reportBefore: number;

 @Column({ nullable: true })
 achievement: string;

 @Column({ nullable: true })
 googleReviewUrl: string;

 @Column({
   type: 'decimal',
   precision: 3,
   scale: 2,
   default: 0
 })
 averageRating: number;

 @Column({
   type: 'int',
   default: 0
 })
 totalReviews: number;

 @Column({ nullable: true })
 doctorSignImage: string;

 @Column({ nullable: true })
 doctorStampImage: string;


 // NEW: doctor belongs to one clinic
 @OneToOne(() => Clinic, (clinic) => clinic.doctor, { nullable: true })
 @JoinColumn()
 clinic: Clinic;


 @OneToMany(
   () => Services,
   service => service.doctor
 )
 services: Services[];

 @OneToMany(
   () => ConsultingTime,
   ct => ct.doctor
 )
 consultingTimes: ConsultingTime[];

@OneToOne(() => Hospital, (hospital) => hospital.doctor)
hospital: Hospital;
}
