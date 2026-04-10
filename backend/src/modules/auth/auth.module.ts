import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthServices } from './auth.service';
import { AuthController } from './auth.Controller';
import { UserModule } from '../users/user.module';
import { DoctorModule } from '../doctors/doctors.module';

@Module({
  imports: [
    UserModule,
    DoctorModule,
    JwtModule.register({
      secret: 'mySecretKey',
      signOptions: { expiresIn: '1d' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthServices],
})
export class AuthModule {}