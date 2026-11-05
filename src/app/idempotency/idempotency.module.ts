import { Global, Module } from '@nestjs/common';
import { IdempotencyStore } from './idempotency.store';
import { IdempotencyInterceptor } from './idempotency.interceptor';

/**
 * Global so any feature module can apply @UseInterceptors(IdempotencyInterceptor)
 * on mutation routes without re-providing the store.
 */
@Global()
@Module({
  providers: [IdempotencyStore, IdempotencyInterceptor],
  exports: [IdempotencyStore, IdempotencyInterceptor],
})
export class IdempotencyModule {}
