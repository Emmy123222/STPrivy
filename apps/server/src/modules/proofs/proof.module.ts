import { Module } from '@nestjs/common';
import { ProofService } from './proof.service';
import { ProofController } from './proof.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { SorobanModule } from '../soroban/soroban.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, SorobanModule, AuthModule],
  providers: [ProofService],
  controllers: [ProofController],
  exports: [ProofService],
})
export class ProofModule {}
