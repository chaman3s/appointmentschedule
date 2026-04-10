import { Controller, UseGuards, Req, Get, Patch, Body } from '@nestjs/common';
import { Jwtguard } from '../common/guard/jwt.guard';
import { DoctorServices } from './doctor.service';
import { UpdateProfileDoctorDto } from './dto/updateprofile.doctor.dto';
import { Roles } from '../common/decorator/roles.decorator';
import { RolesGuard } from '../common/guard/roles.guard';

@Controller('doctors')
export class DoctorController {
    constructor(private doctorServices: DoctorServices) { }
    @UseGuards(Jwtguard, RolesGuard)
    @Roles('doctor')
    @Get('profile')
    getProfile(@Req() req) {
        return this.doctorServices.getDoctorProfile(req.user.sub);
    }
    @UseGuards(Jwtguard, RolesGuard)
    @Roles('doctor')
    @Patch('update/profile')
    updateProfile(
        @Req() req,
        @Body() body: UpdateProfileDoctorDto,
    ) {
        return this.doctorServices.updateDoctorProfile(
            req.user.sub,
            body,
        );
    }
    @UseGuards(Jwtguard, RolesGuard)
    @Roles('doctor')
    @Patch('onboarding')
    updateProfileOnBoarding(
        @Req() req,
        @Body() body: UpdateProfileDoctorDto,
    ) {
        return this.doctorServices.onboardingDoctorProfile(
            req.user.sub,body)
        }
    }