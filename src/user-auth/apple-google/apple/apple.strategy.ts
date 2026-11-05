import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-apple';
import { AuthService } from 'src/user-auth/services/authorization.service';

@Injectable()
export class AppleStrategy extends PassportStrategy(Strategy, 'apple') {
  constructor(private readonly authService: AuthService) {
    super({
      clientID: process.env.APPLE_CLIENT_ID,
      teamID: process.env.APPLE_TEAM_ID,
      keyID: process.env.APPLE_KEY_ID,
      privateKeyLocation: process.env.APPLE_PRIVATE_KEY_LOCATION,
      callbackURL: 'http://localhost:3000/auth/apple/callback',
      scope: ['email', 'name'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    const user = {
      email: profile.email,
      firstName: profile.name ? profile.name.firstName : null,
      lastName: profile.name ? profile.name.lastName : null,
      accessToken,
    };
    done(null, user);
  }
}
