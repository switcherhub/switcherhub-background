import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import { LocalAuthGuard } from '../guards/local-auth.guard';
import { JwtOperatorAuthGuard } from '../guards/jwt-auth.guard';
import { LoginValidation } from '../validation/login.validation';
import { RecoverValidation } from '../dto/recover.validation';
import { ResetValidation } from '../dto/reset.validation';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(
    @Body() operator: LoginValidation,
  ): Promise<{ accessToken: string }> {
    return this.authService.login(operator);
  }

  @Get('protected')
  @UseGuards(JwtOperatorAuthGuard)
  getProtected() {
    return 'Protected route';
  }

  @Put('recovery')
  async recovery(@Body() body: RecoverValidation) {
    return this.authService.recovery(body.email);
  }

  @Put('reset')
  async reset(@Body() body: ResetValidation) {
    return this.authService.resetPassword(body);
  }
}
