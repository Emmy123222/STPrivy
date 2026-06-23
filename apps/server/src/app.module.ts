import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bullmq';
import { APP_GUARD } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import configuration from './config/configuration';
import { envValidationSchema } from './config/env.validation';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './modules/redis/redis.module';
import { StellarModule } from './modules/stellar/stellar.module';
import { SorobanModule } from './modules/soroban/soroban.module';
import { AuthModule } from './modules/auth/auth.module';
import { DIDModule } from './modules/did/did.module';

@Module({
  imports: [
    // Global config with Joi validation
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema: envValidationSchema,
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
    }),

    // Global synchronous event bus
    EventEmitterModule.forRoot({
      wildcard: false,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 20,
      verboseMemoryLeak: true,
      ignoreErrors: false,
    }),

    // Rate limiting — 20 requests / 60 s per IP globally
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 20 }]),

    // BullMQ root connection (queues registered per-module in later phases)
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('redis.host', 'localhost'),
          port: config.get<number>('redis.port', 6379),
        },
      }),
    }),

    // Infrastructure
    PrismaModule,
    RedisModule,
    StellarModule,
    SorobanModule,

    // Feature modules
    AuthModule,
    DIDModule,
  ],
  providers: [
    // Apply rate-limiting globally
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
