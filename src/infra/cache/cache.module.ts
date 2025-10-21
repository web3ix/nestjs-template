import { Module } from '@nestjs/common';
import { RedisCacheService } from './services/redis-cache.service';

@Module({
  providers: [
    {
      provide: 'ICacheService',
      useClass: RedisCacheService,
    },
    RedisCacheService,
  ],
  exports: ['ICacheService', RedisCacheService],
})
export class CacheModule {}
