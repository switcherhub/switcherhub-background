import { Controller, Get, UseGuards } from '@nestjs/common';
import { MeService } from '../services/me.service';
import { JwtUserBlockedAuthGuard } from 'src/user-auth/guards/jwt-user-blocked-auth.guard';
import { GetUser } from 'src/user-auth/decorators/get-user.decorator';
import { UserEntity } from '../entities/user.entity';

@Controller('users/me')
export class MeController {
  constructor(private readonly meService: MeService) {}

  @UseGuards(JwtUserBlockedAuthGuard)
  @Get()
  async getUserByToken(@GetUser() user: UserEntity): Promise<any> {
    return this.meService.getMe(user);
  }
}
