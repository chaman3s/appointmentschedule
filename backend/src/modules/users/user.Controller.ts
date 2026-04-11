import { Controller, UseGuards, Req, Get, Patch, Body } from '@nestjs/common';
import { Jwtguard } from '../common/guard/jwt.guard';
import { UserService } from './user.service';
import { RolesGuard } from '../common/guard/roles.guard';
import { Roles } from '../common/decorator/roles.decorator';
import { UpdateUserProfileDto } from './dto/userprofile.dto';

@Controller('user')
export class UserController {
  constructor(private userService: UserService) { } // ✅ REQUIRED

  @UseGuards(Jwtguard, RolesGuard)
  @Roles('user')
  @Get('profile')
  getProfile(@Req() req) {
    return this.userService.getUserProfile(req.user.sub); // ✅ fixed
  }
  @UseGuards(Jwtguard, RolesGuard)
  @Roles('user')
  @Patch('update/profile')
  updateProfile(
    @Req() req,
    @Body() body: UpdateUserProfileDto,
  ) {
    return this.userService.updateUserProfile(
      req.user.sub,
      body,
    );
  }
  
}