import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtUserAuthGuard extends AuthGuard(
  'optional-jwt-user-auth',
) {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      return (await super.canActivate(context)) as boolean;
    } catch (err) {
      // Якщо неавторизований — просто пропускаємо
      return true;
    }
  }

  handleRequest(err, user, info, context) {
    // Просто повертаємо user або null — без помилок
    return user || null;
  }
}
