import { Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export const REDIS_CLIENT = 'REDIS_CLIENT';

export const InjectRedis = () => Inject(REDIS_CLIENT);

export const redisProvider = {
  provide: REDIS_CLIENT,
  useFactory: (config: ConfigService): Redis => {
    const url = config.get<string>('REDIS_URL');
    if (url) return new Redis(url, { lazyConnect: true, maxRetriesPerRequest: null });
    return new Redis({
      host: config.get<string>('REDIS_HOST', 'localhost'),
      port: config.get<number>('REDIS_PORT', 6379),
      lazyConnect: true,
    });
  },
  inject: [ConfigService],
};
