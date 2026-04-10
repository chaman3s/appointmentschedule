// user.entity.ts
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('users') // table name in DB
export class User {

  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ unique: true, length: 15 })
  mobileNumber: string;
  @Column({ default: false })
  isProfileCompleted: boolean;

}