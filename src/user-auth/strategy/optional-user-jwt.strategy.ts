import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserAuthService } from '../user-auth/user-auth.service';

@Injectable()
export class OptionalUserJwtStrategy extends PassportStrategy(
  Strategy,
  'optional-jwt-user-auth',
) {
  constructor(private readonly userAuthService: UserAuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  async validate(payload: any) {
    let auth = null;
    try {
      auth = await this.userAuthService.findUserByAuthId(payload.sub);
    } catch (e) {}

    return { userId: payload.sub, email: payload.email, user: auth };
  }
}
