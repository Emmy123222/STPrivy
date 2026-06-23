import { Module } from '@nestjs/common';
import { DIDService } from './did.service';
import { DIDController } from './did.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  providers: [DIDService],
  controllers: [DIDController],
  exports: [DIDService],
})
export class DIDModule {}
