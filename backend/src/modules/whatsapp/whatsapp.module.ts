import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';


import { WhatsappService } from './whatsapp.service';
import { WhatsappController } from './whatsapp.controller';

import { User } from '../users/entities/user.entity';
import { Appointment } from '../appointments/entities/appointment.entity';
import { Doctors } from '../doctors/entity/doctor.entity';
import { WhatsappThrottlerGuard } from '../common/Guard/Whatsapp.Guard';

import { AppointmentsModule } from '../appointments/appointments.module';
import { ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Appointment, Doctors]),
    AppointmentsModule,

    // 🔥 THIS IS REQUIRED
    ThrottlerModule.forRoot([
      {
        ttl: 60,
        limit: 5,
      },
    ]),
  ],
  controllers: [WhatsappController],
  providers: [WhatsappService],
})
export class WhatsappModule {}