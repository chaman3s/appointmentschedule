import { Controller,UseGuards, Req,Get,Post} from "@nestjs/common";
import { Jwtguard } from '../common/Guard/jwt.guard';
import { UserService } from './user.service';

@Controller('user')
export class  UserController{
    @UseGuards(Jwtguard)
    @Get('profile')
    getProfile(@Req() req) {    
        return this.UserService.getUserProfile(req.user.sub);
    }
}