import { ForbiddenException, Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserAuthService } from '../user-auth/user-auth.service';

@Injectable()
export class UserJwtStrategy extends PassportStrategy(
  Strategy,
  'jwt-user-auth',
) {
  constructor(private readonly userAuthService: UserAuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  async validate(payload: any) {
    const auth = await this.userAuthService.findUserByAuthId(payload.sub);

    if (auth.isBlocked) {
      throw new ForbiddenException('Forbidden');
    }

    return { userId: payload.sub, email: payload.email, user: auth };
  }
}
