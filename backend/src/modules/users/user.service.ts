import { Injectable } from '@nestjs/common';
import { User } from './entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}
  async login(number: string) {
    if (!number) {
      return { message: 'Please enter number first!' };
    }

    const user = await this.userRepo.findOne({
      where: { mobileNumber: number },
    });

    if (!user) {
      return { message: 'Invalid mobile number' };
    }

    // ✅ return safe data only
    const { mobileNumber, name, id } = user;

    return {
      message: 'Login successful',
      user: { id, name, mobileNumber },
    };
  }

  // ✅ CREATE USER
  async createUser(number: string, name: string) {
    if (!number || !name) {
      return { message: 'Please enter all details!' };
    }

    const existingUser = await this.userRepo.findOne({
      where: { mobileNumber: number },
    });

    if (existingUser) {
      return { message: 'Mobile number already registered' };
    }

    const newUser = this.userRepo.create({
      mobileNumber: number,
      name,
    });

    await this.userRepo.save(newUser);

    // ✅ return safe response
    return {
      message: 'User created successfully',
      user: {
        id: newUser.id,
        name: newUser.name,
        mobileNumber: newUser.mobileNumber,
      },
    };
  }
}