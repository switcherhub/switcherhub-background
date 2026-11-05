import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import { PasswordlessAuthService } from './passwordless-auth.service';

/**
 * Passwordless email auth (spec §8.3). Public, pre-account.
 *   POST /auth/challenge { contact | email }  -> sends a 6-digit code
 *   POST /auth/verify    { contact | email, code } -> session tokens
 */
@Controller('auth')
export class PasswordlessAuthController {
  constructor(private readonly service: PasswordlessAuthService) {}

  @Post('challenge')
  async challenge(
    @Body('contact') contact?: string,
    @Body('email') email?: string,
  ): Promise<{ resendAfter: string }> {
    const address = contact ?? email;
    if (!address || !address.trim()) {
      throw new BadRequestException('A contact (email) is required.');
    }
    return this.service.challenge(address);
  }

  @Post('verify')
  async verify(
    @Body('code') code: string,
    @Body('contact') contact?: string,
    @Body('email') email?: string,
  ) {
    const address = contact ?? email;
    if (!address || !code) {
      throw new BadRequestException('Contact and code are required.');
    }
    return this.service.verify(address, code);
  }
}
