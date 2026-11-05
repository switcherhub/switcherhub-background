import { Module, Global } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import * as redisStore from 'cache-manager-ioredis';

@Global()
@Module({
  imports: [
    CacheModule.register({
      store: redisStore as any,
      host: 'localhost',
      port: 6379,
      ttl: 300,
    }),
  ],
  exports: [CacheModule],
})
export class GlobalCacheModule {}
