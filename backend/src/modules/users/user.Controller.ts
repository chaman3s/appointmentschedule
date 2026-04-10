import { Controller, UseGuards, Req, Get } from '@nestjs/common';
import { Jwtguard } from '../common/guard/jwt.guard';
import { UserService } from './user.service';

@Controller('user')
export class UserController {
  constructor(private userService: UserService) {} // ✅ REQUIRED

  @UseGuards(Jwtguard)
  @Get('profile')
  getProfile(@Req() req) {
    return this.userService.getUserProfile(req.user.sub); // ✅ fixed
  }
}