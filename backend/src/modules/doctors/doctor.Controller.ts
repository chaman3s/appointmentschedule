// doctor.controller.ts
import {
    Controller,
    UseGuards,
    Req,
    Post,
    Body,
    Get,
    Query
} from '@nestjs/common';
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
        return this.doctorServices.getDoctorProfile(req.user.id); // ✅ FIXED
    }

    @UseGuards(Jwtguard, RolesGuard)
    @Roles('doctor')
    @Post('profile')
    createOrUpdate(
        @Req() req,
        @Body() body: UpdateProfileDoctorDto,
    ) {
        return this.doctorServices.createOrUpdate(
            req.user.id,
            body,
        );
    }
    @UseGuards(Jwtguard, RolesGuard)
    @Roles('user')
    @Get('getDoctorlist')
    getDoctors(
        @Query('specialization') specialization?: string,
        @Query('search') search?: string,
    ) {
        return this.doctorServices.getDoctors(specialization, search);
    }
}