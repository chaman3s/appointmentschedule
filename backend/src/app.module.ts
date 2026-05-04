import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { getDatabaseConfig } from './config/database.config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/users/user.module';
import { DoctorModule } from './modules/doctors/doctors.module';
import { PatientsModule} from './modules/patients/patients.module';
import { ConsultingTimeModule } from './modules/consulting-time/consulting-time.module';
import { UserDoctorModule } from './modules/userdoctor/user-doctor.module';
import { AppointmentsModule } from './modules/appointments/appointments.module';
import { LeaveManagementModule } from './modules/leave-management/leave-management.module';
import { HospitalModule } from './modules/hospital/hospital.module';
import { WhatsappModule } from './modules/whatsapp/whatsapp.module';
import { ThrottlerModule } from '@nestjs/throttler';


@Module({
  imports: [
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60,
          limit: 10,
        },
      ],
      // ✅ makes it available in ALL modules
    }),

    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => getDatabaseConfig(config),
    }),

    AuthModule,
    UserModule,
    DoctorModule,
    PatientsModule,
    ConsultingTimeModule,
    UserDoctorModule,
    AppointmentsModule,
    LeaveManagementModule,
    HospitalModule,
    WhatsappModule,
  ],
})
export class AppModule {}

