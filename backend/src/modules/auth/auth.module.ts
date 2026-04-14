import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthServices } from './auth.service';
import { AuthController } from './auth.Controller';
import { UserModule } from '../users/user.module';
import { DoctorModule } from '../doctors/doctors.module';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from '../common/Guard/jwt.strategy';

@Module({
  imports: [
    UserModule,
    DoctorModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1d' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthServices, JwtStrategy], // ✅ ADD THIS
})
export class AuthModule {}