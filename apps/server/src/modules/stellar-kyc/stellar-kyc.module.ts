import { Module } from '@nestjs/common';
import { Ed25519SignerService } from './signer/ed25519-signer.service';
import { AttestationService } from './attestation/attestation.service';
import { KycContractService } from './contract/kyc-contract.service';
import { TransactionService } from './transactions/transaction.service';
import { StellarKycController } from './stellar-kyc.controller';

@Module({
  controllers: [StellarKycController],
  providers: [
    Ed25519SignerService,
    AttestationService,
    KycContractService,
    TransactionService,
  ],
  exports: [
    Ed25519SignerService,
    AttestationService,
    KycContractService,
    TransactionService,
  ],
})
export class StellarKycModule {}
