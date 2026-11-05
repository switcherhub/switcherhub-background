import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtUserBlockedAuthGuard extends AuthGuard(
  'jwt-user-blocked-auth',
) {}
