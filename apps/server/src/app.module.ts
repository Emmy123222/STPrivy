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
import { AuthModule } from './modules/auth/auth.module';
import { RedisModule } from './modules/redis/redis.module';
import { StellarModule } from './modules/stellar/stellar.module';
import { SorobanModule } from './modules/soroban/soroban.module';
import { DIDModule } from './modules/did/did.module';
import { CredentialModule } from './modules/credentials/credential.module';
import { ProofModule } from './modules/proofs/proof.module';
import { AdminModule } from './modules/admin/admin.module';
import { IssuerModule } from './modules/issuers/issuer.module';
import { VeriffModule } from './modules/veriff/veriff.module';
import { StellarKycModule } from './modules/stellar-kyc/stellar-kyc.module';

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

    // Rate limiting — 200 requests / 60 s per IP globally
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 200 }]),

    // BullMQ root connection (queues registered per-module in later phases)
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url = config.get<string>('REDIS_URL');
        const connection = url
          ? { url }
          : { host: config.get<string>('redis.host', 'localhost'), port: config.get<number>('redis.port', 6379) };
        return { connection };
      },
    }),

    // Infrastructure
    PrismaModule,

    // Auth: SEP-10 + JWT
    AuthModule,
    RedisModule,
    StellarModule,
    SorobanModule,

    // Feature modules
    DIDModule,
    CredentialModule,
    ProofModule,
    IssuerModule,
    AdminModule,
    VeriffModule,
    StellarKycModule,
  ],
  providers: [
    // Apply rate-limiting globally
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
