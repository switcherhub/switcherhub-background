import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtOperatorAuthGuard extends AuthGuard('jwt-auth') {}
