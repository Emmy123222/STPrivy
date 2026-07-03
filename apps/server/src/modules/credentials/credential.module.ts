import { Module } from '@nestjs/common';
import { CredentialService } from './credential.service';
import { CredentialController } from './credential.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { SorobanModule } from '../soroban/soroban.module';
import { IssuerModule } from '../issuers/issuer.module';
import { AuthModule } from '../auth/auth.module';
import { DIDModule } from '../did/did.module';

@Module({
  imports: [PrismaModule, SorobanModule, IssuerModule, AuthModule, DIDModule],
  controllers: [CredentialController],
  providers: [CredentialService],
  exports: [CredentialService],
})
export class CredentialModule {}
