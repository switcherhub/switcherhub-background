import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Put,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { OAuth2Client } from 'google-auth-library';
import { UserAuthInterface } from 'src/user-auth/user-auth/user-auth.interface';
import { AuthService } from '../services/authorization.service';
import { JwtUserAuthGuard } from '../guards/jwt-user-auth.guard';
import { LocalAuthGuard } from '../guards/local-auth.guard';
import { LoginDto } from './login.dto';
import { RegisterDto } from './register.dto';
import { RegistrationService } from './registration.service';

import { UserService } from 'src/users/services/user.service';
import { UserAuthService } from '../user-auth/user-auth.service';
import { GetUserAuthId } from '../decorators/get-user-id.decorator';
import axios from 'axios';
import { UserRoleEnum } from 'src/users/interfaces/user-role.enum';

@Controller('user-auth')
export class AuthUserController {
  private googleClient: OAuth2Client;

  constructor(
    private readonly authService: AuthService,
    private readonly jwtService: JwtService,
    private readonly registrationService: RegistrationService,
    private readonly userService: UserService,
    private readonly userAuthService: UserAuthService,
  ) {
    this.googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  }

  @Post('register')
  async register(@Body() body: RegisterDto): Promise<UserAuthInterface> {
    body.email = body.email.replace(/\s+/g, '').toLowerCase();

    return await this.registrationService.register(body);
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Body() body: LoginDto) {
    body.email = body.email.replace(/\s+/g, '').toLowerCase();

    const user = await this.userService.findActiveUserForLogin(body.email);

    if (user.activeRole === UserRoleEnum.EMPLOYER) {
      throw new BadRequestException(
        'Account role is not allowed to login in application',
      );
    }

    return this.authService.login(body.email);
  }

  @UseGuards(LocalAuthGuard)
  @Post('hr/login')
  async hrLogin(@Body() body: LoginDto) {
    body.email = body.email.replace(/\s+/g, '').toLowerCase();

    const user = await this.userService.findActiveUserForLogin(body.email);

    if (user.activeRole !== UserRoleEnum.EMPLOYER) {
      throw new BadRequestException(
        'Account role is not allowed to login as HR',
      );
    }

    return this.authService.login(body.email);
  }

  @UseGuards(LocalAuthGuard)
  @Delete('delete')
  async remove(@Body() body: LoginDto): Promise<void> {
    const res = await this.authService.login(body.email);

    if (res.access_token) {
      const user = await this.userAuthService.findOne(res.id);
      await this.userService.remove(user.user.id);
    }
  }

  @Post('refresh')
  async refresh(@Body('refresh_token') refreshToken: string) {
    if (!refreshToken) {
      throw new UnauthorizedException('Token not found');
    }
    const user = await this.authService.getUserByRefreshToken(refreshToken);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const payload = { email: user.email, sub: user.id };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  @UseGuards(JwtUserAuthGuard)
  @Get('protected')
  getProtectedRoute() {
    return { status: true };
  }

  @Post('confirm-email')
  async confirmEmail(@Body('email') email: string, @Body('code') code: string) {
    email = email.replace(/\s+/g, '').toLowerCase();

    return await this.authService.confirmEmail(email, code);
  }

  @Post('confirm-code')
  async confitmCode(
    @Body('email') email: string,
    @Body('code') code: string,
  ): Promise<{
    status: string;
    message: string;
  }> {
    email = email.replace(/\s+/g, '').toLowerCase();

    return this.userService.confirmCode(email, code);
  }

  @Post('send-new-code')
  async sendNewCode(@Body('email') email: string) {
    email = email.replace(/\s+/g, '').toLowerCase();

    return await this.authService.sendNewCode(email);
  }

  @Post('send-recovery-code')
  async sendRecoveryCode(@Body('email') email: string) {
    email = email.replace(/\s+/g, '').toLowerCase();

    return await this.authService.sendRecoveryCode(email);
  }

  @Post('change-password')
  async changePassword(
    @Body('email') email: string,
    @Body('newPassword') newPassword: string,
    @Body('code') code: string,
  ) {
    if (!email || !newPassword || !code) {
      throw new BadRequestException('Some fields are missing');
    }

    email = email.replace(/\s+/g, '').toLowerCase();

    const user = await this.userService.findOneByEmail(email);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.codeAuthorization !== code) {
      throw new BadRequestException('Invalid code');
    }

    if (user.codeAuthorization === code) {
      const userAuth = await this.userAuthService.findOneByEmail(email);
      userAuth.isVerified = true;

      await this.userAuthService.update(userAuth);
    }

    await this.authService.changePassword(email, newPassword);
    return { message: 'Password changed' };
  }

  @Post('google')
  async googleLogin(@Body('token') token: string): Promise<any> {
    const ticket = await this.googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload) {
      throw new UnauthorizedException('Invalid Google token');
    }

    const user = await this.authService.findOrCreateGoogleUser(payload);
    return this.authService.login(user.email);
  }

  @Post('google/access-token')
  async googleLoginByAccessToken(@Body('token') token: string): Promise<any> {
    try {
      const response = await axios.get(
        'https://www.googleapis.com/oauth2/v1/userinfo?alt=json',
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      // console.log('Google response:', response);

      const data = response.data;

      if (!data || !data.email) {
        console.error('Invalid Google access token response:', data);
        throw new UnauthorizedException('Invalid Google access token');
      }

      const user = await this.authService.findOrCreateGoogleUser(data);
      console.log('User found or created:', user);
      const res = await this.authService.login(user.email);
      console.log('Login response:', res);
      return res;
    } catch (error) {
      throw new UnauthorizedException('Failed to authenticate with Google');
    }
  }

  @Post('apple')
  async appleLogin(@Body('token') token: string): Promise<any> {
    if (!token) {
      throw new UnauthorizedException('Apple token is missing');
    }
    const user = await this.authService.findOrCreateAppleUser(token);

    return this.authService.login(user.email);
  }

  @Post('facebook')
  async facebookLogin(@Body('token') token: string): Promise<any> {
    const user = await this.authService.findOrCreateFacebookUser(token);
    return this.authService.login(user.email);
  }

  @Put('password')
  @UseGuards(JwtUserAuthGuard)
  async changePasswordAuth(
    @GetUserAuthId() authId: string,
    @Body('newPassword') newPassword: string,
  ) {
    if (!newPassword) {
      throw new BadRequestException('newPassword field is missing');
    }

    const userAuth = await this.userAuthService.findOne(authId);

    if (!userAuth) {
      throw new UnauthorizedException('User not found');
    }

    await this.authService.changePassword(userAuth.email, newPassword);
    return { message: 'Password changed' };
  }
}
