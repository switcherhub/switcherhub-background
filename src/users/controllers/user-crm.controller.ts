import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Put,
  UseGuards,
} from '@nestjs/common';

import { GetUserAuthId } from 'src/user-auth/decorators/get-user-id.decorator';
import { JwtUserAuthGuard } from 'src/user-auth/guards/jwt-user-auth.guard';
import { UserAuthService } from 'src/user-auth/user-auth/user-auth.service';
import { UserUpdateValidation } from '../dto/user-update.validation';
import { UserService } from '../services/user.service';

@Controller('users')
export class UserCrmController {
  constructor(
    private readonly userService: UserService,
    private readonly userAuthService: UserAuthService,
  ) {}

  @UseGuards(JwtUserAuthGuard)
  @Get('me')
  async getUserByToken(@GetUserAuthId() authId: string): Promise<any> {
    try {
      const user = await this.userAuthService.findOne(authId);
      return user.user;
    } catch (error) {
      console.error('Error getting user by token:', error);
      throw new NotFoundException(error);
    }
  }

  @UseGuards(JwtUserAuthGuard)
  @Put()
  async update(
    @GetUserAuthId() authId: string,
    @Body() dto: UserUpdateValidation,
  ) {
    const user = await this.userAuthService.findUserByAuthId(authId);
    const updateData = {
      ...dto,
      id: user.id,
    };

    return this.userService.update(updateData);
  }

  @UseGuards(JwtUserAuthGuard)
  @Delete('delete')
  async delete(@GetUserAuthId() authId: string) {
    const user = await this.userAuthService.findUserByAuthId(authId);
    if (!user) {
      throw new NotFoundException('User not found.');
    }
    await this.userService.remove(user.id);
  }
}
