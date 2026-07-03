import { Injectable, Logger } from '@nestjs/common';
import { Keypair } from '@stellar/stellar-sdk';

export interface AttestationData {
  wallet: string;
  verified: boolean;
  country: string;
  age_over_18: boolean;
  issued_at: number;
  expires_at: number;
  nonce: string;
  proof_hash: string;
  issuer: string;
}

export interface SignedAttestation {
  payload: string;
  signature: string;
}

@Injectable()
export class Ed25519SignerService {
  private readonly logger = new Logger(Ed25519SignerService.name);
  private keypair: Keypair;

  constructor() {
    // Initialize with keypair from environment or generate new one
    const secretKey = process.env.STELLAR_BACKEND_SECRET_KEY;
    if (secretKey) {
      this.keypair = Keypair.fromSecret(secretKey);
    } else {
      this.keypair = Keypair.random();
      this.logger.warn(
        'No STELLAR_BACKEND_SECRET_KEY provided. Generated random keypair. ' +
        `Public Key: ${this.keypair.publicKey()} - Save this for production!`,
      );
    }
  }

  /**
   * Get the public key for signature verification
   */
  getPublicKey(): string {
    return this.keypair.publicKey();
  }

  /**
   * Get the secret key (use with caution)
   */
  getSecretKey(): string {
    return this.keypair.secret();
  }

  /**
   * Sign an attestation payload
   */
  signAttestation(data: AttestationData): SignedAttestation {
    const payload = this.serializePayload(data);
    const payloadBuffer = Buffer.from(payload);
    const signature = this.keypair.sign(payloadBuffer).toString('base64');

    this.logger.debug(`Signed attestation for wallet: ${data.wallet}`);

    return {
      payload,
      signature,
    };
  }

  /**
   * Serialize attestation data to a deterministic string format
   * Format: wallet|verified|country|age_over_18|issued_at|expires_at|nonce|proof_hash|issuer
   */
  private serializePayload(data: AttestationData): string {
    return [
      data.wallet,
      data.verified.toString(),
      data.country,
      data.age_over_18.toString(),
      data.issued_at.toString(),
      data.expires_at.toString(),
      data.nonce,
      data.proof_hash,
      data.issuer,
    ].join('|');
  }

  /**
   * Generate a cryptographically secure random nonce
   */
  generateNonce(): string {
    const nonce = Buffer.alloc(32);
    crypto.getRandomValues(nonce);
    return Buffer.from(nonce).toString('hex');
  }
}
