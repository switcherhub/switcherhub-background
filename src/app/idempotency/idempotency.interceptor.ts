import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { IdempotencyStore } from './idempotency.store';

/**
 * Replays the first response for a repeated `Idempotency-Key` on the same route,
 * so retries/double-taps never create duplicate emails/consents/deals (spec FR-017,
 * AC22, AC30). Apply with @UseInterceptors(IdempotencyInterceptor) on mutation routes.
 * Requests without the header pass through unchanged.
 */
@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(private readonly store: IdempotencyStore) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const headerKey =
      req.headers?.['idempotency-key'] ?? req.headers?.['Idempotency-Key'];
    if (!headerKey || typeof headerKey !== 'string') {
      return next.handle();
    }

    const cacheKey = `${req.method}:${req.route?.path ?? req.url}:${headerKey}`;
    const cached = this.store.get(cacheKey);
    if (cached !== undefined) {
      return of(cached);
    }

    return next.handle().pipe(tap((response) => this.store.set(cacheKey, response)));
  }
}
