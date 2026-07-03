import { Injectable, Logger } from '@nestjs/common';
import { Ed25519SignerService, AttestationData } from '../signer/ed25519-signer.service';

export interface VerificationResult {
  wallet: string;
  verified: boolean;
  country: string;
  age_over_18: boolean;
  issued_at: number;
  expires_at: number;
  proof_hash: string;
  nonce: string;
}

@Injectable()
export class AttestationService {
  private readonly logger = new Logger(AttestationService.name);

  constructor(private readonly signerService: Ed25519SignerService) {}

  /**
   * Create a signed attestation for a verified user
   */
  async createAttestation(
    wallet: string,
    country: string,
    age: number,
    proofHash: string,
    expiresInDays: number = 365,
  ): Promise<VerificationResult> {
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + expiresInDays * 24 * 60 * 60;
    const nonce = this.signerService.generateNonce();

    const attestationData: AttestationData = {
      wallet,
      verified: true,
      country,
      age_over_18: age >= 18,
      issued_at: now,
      expires_at: expiresAt,
      nonce,
      proof_hash: proofHash,
      issuer: 'backend',
    };

    const signedAttestation = this.signerService.signAttestation(attestationData);

    this.logger.log(`Created attestation for wallet: ${wallet}`);

    return {
      wallet: attestationData.wallet,
      verified: attestationData.verified,
      country: attestationData.country,
      age_over_18: attestationData.age_over_18,
      issued_at: attestationData.issued_at,
      expires_at: attestationData.expires_at,
      proof_hash: attestationData.proof_hash,
      nonce: attestationData.nonce,
    };
  }

  /**
   * Validate attestation data structure
   */
  validateAttestationData(data: any): data is AttestationData {
    return (
      typeof data.wallet === 'string' &&
      typeof data.verified === 'boolean' &&
      typeof data.country === 'string' &&
      typeof data.age_over_18 === 'boolean' &&
      typeof data.issued_at === 'number' &&
      typeof data.expires_at === 'number' &&
      typeof data.nonce === 'string' &&
      typeof data.proof_hash === 'string' &&
      typeof data.issuer === 'string'
    );
  }
}
