import {
  CanActivate,
  ExecutionContext,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { OperatorRoleEnum } from '../types/operator-role.enum';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<OperatorRoleEnum[]>(
      'roles',
      context.getHandler(),
    );
    if (!requiredRoles) {
      return true;
    }

    const { user: operator } = context.switchToHttp().getRequest();

    if (!operator) {
      throw new InternalServerErrorException(
        'RolesGuard should be used before JwtAuthGuard',
      );
    }

    return (
      operator &&
      operator.role &&
      requiredRoles.some((role) => operator.role === role)
    );
  }
}
