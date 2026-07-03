import { Controller, Post, Body, Get, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { IsString, IsNotEmpty, IsArray } from 'class-validator';
import { TransactionService } from './transactions/transaction.service';
import { KycContractService } from './contract/kyc-contract.service';
import { Ed25519SignerService } from './signer/ed25519-signer.service';

export class SubmitVerificationDto {
  wallet: string;
  country: string;
  age: number;
  proofHash: string;
  expiresInDays?: number;
}

export class RevokeVerificationDto {
  wallet: string;
}

export class RotateKeyDto {
  newPublicKey: string;
}

export class VerifyGroth16ProofDto {
  @IsString() @IsNotEmpty()
  circuitId: string;
  
  @IsString() @IsNotEmpty()
  proof: string;
  
  @IsArray()
  @IsString({ each: true })
  publicInputs: string[];
}

export class BuildVerifyProofTransactionDto {
  @IsString() @IsNotEmpty()
  userPublicKey: string;
  
  @IsString() @IsNotEmpty()
  circuitId: string;
  
  @IsString() @IsNotEmpty()
  proof: string;
  
  @IsArray()
  @IsString({ each: true })
  publicInputs: string[];
}

export class SubmitSignedTransactionDto {
  @IsString() @IsNotEmpty()
  signedXdr: string;
}

@Controller('stellar-kyc')
export class StellarKycController {
  constructor(
    private readonly transactionService: TransactionService,
    private readonly contractService: KycContractService,
    private readonly signerService: Ed25519SignerService,
  ) {}

  /**
   * Submit a verification to the Soroban contract
   */
  @Post('verify')
  @HttpCode(HttpStatus.OK)
  async submitVerification(@Body() dto: SubmitVerificationDto) {
    const result = await this.transactionService.submitVerification(
      dto.wallet,
      dto.country,
      dto.age,
      dto.proofHash,
      dto.expiresInDays || 365,
    );
    return result;
  }

  /**
   * Revoke a user's verification
   */
  @Post('revoke')
  @HttpCode(HttpStatus.OK)
  async revokeVerification(@Body() dto: RevokeVerificationDto) {
    const result = await this.transactionService.revokeVerification(dto.wallet);
    return result;
  }

  /**
   * Check if a wallet is verified
   */
  @Get('verified/:wallet')
  async isVerified(@Param('wallet') wallet: string) {
    const verified = await this.transactionService.checkVerificationStatus(wallet);
    return { verified };
  }

  /**
   * Get verification details for a wallet
   */
  @Get('verification/:wallet')
  async getVerification(@Param('wallet') wallet: string) {
    const details = await this.transactionService.getVerificationDetails(wallet);
    return details;
  }

  /**
   * Rotate the backend signing key
   */
  @Post('rotate-key')
  @HttpCode(HttpStatus.OK)
  async rotateKey(@Body() dto: RotateKeyDto) {
    const result = await this.transactionService.rotateBackendKey(dto.newPublicKey);
    return result;
  }

  /**
   * Get the backend public key
   */
  @Get('public-key')
  getPublicKey() {
    return { publicKey: this.signerService.getPublicKey() };
  }

  /**
   * Initialize the contract (admin only)
   */
  @Post('initialize')
  @HttpCode(HttpStatus.OK)
  async initializeContract(@Body() dto: { backendPublicKey: string; adminAddress: string; version?: string }) {
    const txHash = await this.contractService.initialize(
      dto.backendPublicKey,
      dto.adminAddress,
      dto.version || '1.0.0',
    );
    return { txHash };
  }

  /**
   * Verify a Groth16 proof on-chain (server-signed)
   */
  @Post('verify-proof')
  @HttpCode(HttpStatus.OK)
  async verifyGroth16Proof(@Body() dto: VerifyGroth16ProofDto) {
    const result = await this.contractService.verifyProof(
      dto.circuitId,
      dto.proof,
      dto.publicInputs,
    );
    return { verified: result };
  }

  /**
   * Build unsigned transaction for proof verification (user signs)
   */
  @Post('build-verify-proof-tx')
  @HttpCode(HttpStatus.OK)
  async buildVerifyProofTransaction(@Body() dto: BuildVerifyProofTransactionDto) {
    const unsignedXdr = await this.contractService.buildVerifyProofTransaction(
      dto.userPublicKey,
      dto.circuitId,
      dto.proof,
      dto.publicInputs,
    );
    return { unsignedXdr };
  }

  /**
   * Submit a signed transaction to the network
   */
  @Post('submit-signed-tx')
  @HttpCode(HttpStatus.OK)
  async submitSignedTransaction(@Body() dto: SubmitSignedTransactionDto) {
    const txHash = await this.contractService.submitSignedTransaction(dto.signedXdr);
    return { txHash };
  }
}
