import { Injectable, Logger } from '@nestjs/common';
import { KycContractService } from '../contract/kyc-contract.service';
import { Ed25519SignerService, SignedAttestation } from '../signer/ed25519-signer.service';
import { AttestationService, VerificationResult } from '../attestation/attestation.service';

export interface OnChainVerificationResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

@Injectable()
export class TransactionService {
  private readonly logger = new Logger(TransactionService.name);

  constructor(
    private readonly contractService: KycContractService,
    private readonly signerService: Ed25519SignerService,
    private readonly attestationService: AttestationService,
  ) {}

  /**
   * Complete end-to-end flow: create attestation, sign it, and submit to contract
   */
  async submitVerification(
    wallet: string,
    country: string,
    age: number,
    proofHash: string,
    expiresInDays: number = 365,
  ): Promise<OnChainVerificationResult> {
    try {
      this.logger.log(`Starting verification flow for wallet: ${wallet}`);

      // Step 1: Create attestation
      const verificationResult = await this.attestationService.createAttestation(
        wallet,
        country,
        age,
        proofHash,
        expiresInDays,
      );

      // Step 2: Sign attestation
      const signedAttestation = this.signerService.signAttestation({
        wallet: verificationResult.wallet,
        verified: verificationResult.verified,
        country: verificationResult.country,
        age_over_18: verificationResult.age_over_18,
        issued_at: verificationResult.issued_at,
        expires_at: verificationResult.expires_at,
        nonce: verificationResult.nonce,
        proof_hash: verificationResult.proof_hash,
        issuer: 'backend',
      });

      // Step 3: Submit to contract
      const txHash = await this.contractService.verifyAttestation(
        wallet,
        signedAttestation.payload,
        signedAttestation.signature,
      );

      this.logger.log(`Verification completed successfully. Transaction: ${txHash}`);

      return {
        success: true,
        txHash,
      };
    } catch (error) {
      this.logger.error(`Verification flow failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Revoke a user's verification on-chain
   */
  async revokeVerification(wallet: string): Promise<OnChainVerificationResult> {
    try {
      this.logger.log(`Revoking verification for wallet: ${wallet}`);

      const txHash = await this.contractService.revokeUser(wallet);

      this.logger.log(`Revocation completed successfully. Transaction: ${txHash}`);

      return {
        success: true,
        txHash,
      };
    } catch (error) {
      this.logger.error(`Revocation failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Check verification status on-chain
   */
  async checkVerificationStatus(wallet: string): Promise<boolean> {
    try {
      return await this.contractService.isVerified(wallet);
    } catch (error) {
      this.logger.error(`Error checking verification status: ${error.message}`);
      return false;
    }
  }

  /**
   * Get verification details from contract
   */
  async getVerificationDetails(wallet: string) {
    try {
      return await this.contractService.getVerification(wallet);
    } catch (error) {
      this.logger.error(`Error getting verification details: ${error.message}`);
      return { verified: false };
    }
  }

  /**
   * Rotate backend signing key
   */
  async rotateBackendKey(newPublicKey: string): Promise<OnChainVerificationResult> {
    try {
      this.logger.log('Rotating backend signing key...');

      const txHash = await this.contractService.rotateBackendKey(newPublicKey);

      this.logger.log(`Key rotation completed successfully. Transaction: ${txHash}`);

      return {
        success: true,
        txHash,
      };
    } catch (error) {
      this.logger.error(`Key rotation failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
