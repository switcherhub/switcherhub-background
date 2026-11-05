import {
  Body,
  Controller,
  Delete,
  NotFoundException,
  Put,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';

import { GetUserAuthId } from 'src/user-auth/decorators/get-user-id.decorator';
import { JwtUserAuthGuard } from 'src/user-auth/guards/jwt-user-auth.guard';
import { UserAuthService } from 'src/user-auth/user-auth/user-auth.service';
import { UserUpdateValidation } from '../dto/user-update.validation';
import { UserService } from '../services/user.service';
import { GetUser } from 'src/user-auth/decorators/get-user.decorator';
import { UserInterface } from '../interfaces/user.interface';
import * as bcrypt from 'bcrypt';

@Controller('users')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly userAuthService: UserAuthService,
  ) {}

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
  async delete(
    @GetUserAuthId() authId: string,
    @Body('password') password: string,
  ) {
    if (!password) {
      throw new NotFoundException('password field is required');
    }

    const userAuth = await this.userAuthService.findOne(authId);

    if (!userAuth?.user) {
      throw new NotFoundException('User not found.');
    }

    const isPasswordValid = bcrypt.compareSync(password, userAuth.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid password.');
    }

    await this.userService.sendAccountDeletionRequestEmail(userAuth.user.id);

    return {
      message: 'Your account will be deleted within 3 days',
    };
  }

  @UseGuards(JwtUserAuthGuard)
  @Put('email/send-code')
  async updateEmailRequest(
    @GetUser() user: UserInterface,
    @Body('email') email: string,
  ) {
    if (!email) {
      throw new NotFoundException('Email not found.');
    }

    return this.userService.updateEmailRequest(user.id, email);
  }

  @UseGuards(JwtUserAuthGuard)
  @Put('email')
  async updateEmail(
    @GetUser() user: UserInterface,
    @Body('code') code: string,
  ) {
    if (!code) {
      throw new NotFoundException('Code not found.');
    }

    return this.userService.updateEmailConfirm(user.id, code);
  }
}
