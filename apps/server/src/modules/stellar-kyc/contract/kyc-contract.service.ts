import { Injectable, Logger } from '@nestjs/common';
import {
  Contract,
  xdr,
  TransactionBuilder,
  Networks,
  Keypair,
  BASE_FEE,
  Account,
  Address,
  rpc,
} from '@stellar/stellar-sdk';

export interface ContractConfig {
  contractId: string;
  rpcUrl: string;
  networkPassphrase: string;
  secretKey: string;
}

export interface VerificationStatus {
  verified: boolean;
  data?: {
    wallet: string;
    country: string;
    age_over_18: boolean;
    issued_at: number;
    expires_at: number;
    proof_hash: string;
    issuer: string;
  };
}

interface VerificationRecord {
  wallet: string;
  country: string;
  age_over_18: boolean;
  issued_at: number;
  expires_at: number;
  proof_hash: string;
  issuer: string;
}

@Injectable()
export class KycContractService {
  private readonly logger = new Logger(KycContractService.name);
  private config: ContractConfig;
  private mockVerificationStore: Map<string, VerificationRecord> = new Map();
  private useMockMode: boolean = true;
  private rpc: rpc.Server;
  private contract: Contract;
  private keypair: Keypair;

  constructor() {
    this.config = {
      contractId: process.env.KYC_REGISTRY_CONTRACT_ID || '',
      rpcUrl: process.env.SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org',
      networkPassphrase: process.env.STELLAR_NETWORK_PASSPHRASE || 'Test SDF Network ; September 2015',
      secretKey: process.env.STELLAR_SERVER_SECRET || '',
    };

    // Initialize RPC client with allowHttp for development
    this.rpc = new rpc.Server(this.config.rpcUrl, { allowHttp: true });

    // Initialize keypair if secret is provided
    if (this.config.secretKey) {
      this.keypair = Keypair.fromSecret(this.config.secretKey);
    }

    // BN254 is now supported in soroban-sdk 26.0.0
    // Use mock mode only if contract ID or secret key is not set
    if (!this.config.contractId || !this.config.secretKey) {
      this.logger.warn('KYC_REGISTRY_CONTRACT_ID or STELLAR_SERVER_SECRET not set. Contract operations will be mocked.');
      this.useMockMode = true;
    } else {
      try {
        this.contract = new Contract(this.config.contractId);
        this.logger.log(`Contract initialized with ID: ${this.config.contractId}`);
        this.useMockMode = false;
      } catch (error) {
        this.logger.error(`Failed to initialize contract: ${error.message}`);
        this.useMockMode = true;
      }
    }
  }

  /**
   * Initialize the contract with backend public key and admin
   */
  async initialize(
    backendPublicKey: string,
    adminAddress: string,
    version: string = '1.0.0',
  ): Promise<string> {
    this.logger.log(`Initializing KYC contract with backend key: ${backendPublicKey}, admin: ${adminAddress}`);
    
    if (this.useMockMode) {
      const mockTxHash = `mock_init_${Date.now()}`;
      this.logger.log(`Contract initialized (mock). Transaction: ${mockTxHash}`);
      return mockTxHash;
    }

    try {
      // Get account info
      const account = await this.rpc.getAccount(this.keypair.publicKey());
      
      // Build transaction with proper ScVal encoding
      const tx = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: this.config.networkPassphrase,
      })
        .addOperation(
          this.contract.call(
            'initialize',
            xdr.ScVal.scvBytes(Buffer.from(backendPublicKey, 'hex')),
            Address.fromString(adminAddress).toScVal(),
            xdr.ScVal.scvString(version),
          ),
        )
        .setTimeout(30)
        .build();

      // Sign transaction
      tx.sign(this.keypair);

      // Submit transaction
      const result = await this.rpc.sendTransaction(tx);
      this.logger.log(`Contract initialized. Transaction: ${result.hash}`);
      return result.hash;
    } catch (error) {
      this.logger.error(`Error initializing contract: ${error.message}`);
      throw error;
    }
  }

  /**
   * Submit a proof to the contract for verification
   */
  async buildVerifyProofTransaction(
    userPublicKey: string,
    circuitId: string,
    proof: string,
    publicInputs: string[],
  ): Promise<string> {
    this.logger.log(`Building verify_proof transaction for circuit: ${circuitId}`);
    
    if (this.useMockMode) {
      this.logger.log(`Mock mode: returning empty XDR`);
      return '';
    }

    try {
      // Get user account info
      const account = await this.rpc.getAccount(userPublicKey);
      
      // Build transaction with proper ScVal encoding
      const tx = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: this.config.networkPassphrase,
      })
        .addOperation(
          this.contract.call(
            'verify_proof',
            xdr.ScVal.scvString(circuitId),
            xdr.ScVal.scvBytes(Buffer.from(proof, 'hex')),
            xdr.ScVal.scvVec(publicInputs.map(input => xdr.ScVal.scvBytes(Buffer.from(input, 'hex')))),
          ),
        )
        .setTimeout(30)
        .build();

      // Return unsigned transaction as XDR (base64 by default)
      const xdrString = tx.toXDR();
      this.logger.log(`Transaction XDR length: ${xdrString.length}`);
      this.logger.log(`Transaction XDR (first 100 chars): ${xdrString.substring(0, 100)}`);
      this.logger.log(`Transaction XDR (last 100 chars): ${xdrString.substring(xdrString.length - 100)}`);
      return xdrString;
    } catch (error) {
      this.logger.error(`Error building transaction: ${error.message}`);
      throw error;
    }
  }

  async submitSignedTransaction(signedXdr: string): Promise<string> {
    this.logger.log(`Submitting signed transaction`);
    
    if (this.useMockMode) {
      this.logger.log(`Mock mode: returning mock transaction hash`);
      return 'mock-tx-hash';
    }

    try {
      const tx = TransactionBuilder.fromXDR(signedXdr, this.config.networkPassphrase);
      
      // Submit transaction
      const result = await this.rpc.sendTransaction(tx);
      
      return result.hash;
    } catch (error) {
      this.logger.error(`Error submitting transaction: ${error.message}`);
      throw error;
    }
  }

  async verifyProof(
    circuitId: string,
    proof: string,
    publicInputs: string[],
  ): Promise<boolean> {
    this.logger.log(`Verifying proof for circuit: ${circuitId} (server-signed mode)`);
    
    if (this.useMockMode) {
      this.logger.log(`Proof verified (mock). Result: true`);
      return true;
    }

    try {
      // Get account info
      const account = await this.rpc.getAccount(this.keypair.publicKey());
      
      // Build transaction with proper ScVal encoding
      const tx = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: this.config.networkPassphrase,
      })
        .addOperation(
          this.contract.call(
            'verify_proof',
            xdr.ScVal.scvString(circuitId),
            xdr.ScVal.scvBytes(Buffer.from(proof, 'hex')),
            xdr.ScVal.scvVec(publicInputs.map(input => xdr.ScVal.scvBytes(Buffer.from(input, 'hex')))),
          ),
        )
        .setTimeout(30)
        .build();

      // Sign transaction
      tx.sign(this.keypair);

      // Simulate transaction first to check if it would succeed
      try {
        const simResult = await this.rpc.simulateTransaction(tx);
        this.logger.log(`Simulation result: ${JSON.stringify(simResult)}`);
      } catch (simError) {
        this.logger.error(`Simulation failed: ${simError.message}`);
        return false;
      }

      // Submit transaction
      const result = await this.rpc.sendTransaction(tx);
      
      // Wait for transaction to be confirmed
      let txResult = await this.rpc.getTransaction(result.hash);
      while (txResult.status === rpc.Api.GetTransactionStatus.NOT_FOUND) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        txResult = await this.rpc.getTransaction(result.hash);
      }
      
      if (txResult.status === rpc.Api.GetTransactionStatus.SUCCESS) {
        // For now, assume verification succeeded if transaction succeeded
        // TODO: Parse actual return value when SDK documentation is available
        this.logger.log(`Proof verified. Transaction succeeded`);
        return true;
      } else {
        this.logger.error(`Transaction failed: ${txResult.status}`);
        return false;
      }
    } catch (error) {
      this.logger.error(`Error verifying proof: ${error.message}`);
      throw error;
    }
  }

  /**
   * Submit a signed attestation to the contract for verification
   * Note: This function is kept for backward compatibility but now delegates to verifyProof
   */
  async verifyAttestation(
    wallet: string,
    attestationPayload: string,
    signature: string,
  ): Promise<string> {
    this.logger.log(`Submitting attestation for wallet: ${wallet}`);
    
    if (this.useMockMode) {
      try {
        const payload = JSON.parse(attestationPayload);
        const record: VerificationRecord = {
          wallet,
          country: payload.country || 'US',
          age_over_18: payload.age_over_18 !== undefined ? payload.age_over_18 : true,
          issued_at: payload.issued_at || Date.now(),
          expires_at: payload.expires_at || Date.now() + 365 * 24 * 60 * 60 * 1000,
          proof_hash: this.generateMockProofHash(wallet, attestationPayload),
          issuer: payload.issuer || 'mock-issuer',
        };
        
        this.mockVerificationStore.set(wallet.toLowerCase(), record);
        const mockTxHash = `mock_verify_${Date.now()}`;
        this.logger.log(`Attestation verified (mock). Transaction: ${mockTxHash}`);
        return mockTxHash;
      } catch (error) {
        this.logger.error(`Error parsing attestation payload: ${error.message}`);
        throw new Error('Invalid attestation payload');
      }
    }
    
    // For real implementation, parse the attestation to extract proof and public inputs
    // Then call verifyProof
    try {
      const payload = JSON.parse(attestationPayload);
      const circuitId = payload.circuit_id || 'age-proof';
      const proof = payload.proof;
      const publicInputs = payload.public_inputs || [];
      
      const verified = await this.verifyProof(circuitId, proof, publicInputs);
      
      if (verified) {
        // Store verification record
        const record: VerificationRecord = {
          wallet,
          country: payload.country || 'US',
          age_over_18: payload.age_over_18 !== undefined ? payload.age_over_18 : true,
          issued_at: payload.issued_at || Date.now(),
          expires_at: payload.expires_at || Date.now() + 365 * 24 * 60 * 60 * 1000,
          proof_hash: this.generateMockProofHash(wallet, attestationPayload),
          issuer: payload.issuer || 'verified-issuer',
        };
        
        this.mockVerificationStore.set(wallet.toLowerCase(), record);
        const mockTxHash = `verify_${Date.now()}`;
        this.logger.log(`Attestation verified. Transaction: ${mockTxHash}`);
        return mockTxHash;
      } else {
        throw new Error('Proof verification failed');
      }
    } catch (error) {
      this.logger.error(`Error in verifyAttestation: ${error.message}`);
      throw error;
    }
  }

  /**
   * Revoke a user's verification (admin only)
   */
  async revokeUser(wallet: string): Promise<string> {
    this.logger.log(`Revoking verification for wallet: ${wallet}`);
    
    if (this.useMockMode) {
      this.mockVerificationStore.delete(wallet.toLowerCase());
      const mockTxHash = `mock_revoke_${Date.now()}`;
      this.logger.log(`User revoked (mock). Transaction: ${mockTxHash}`);
      return mockTxHash;
    }

    try {
      // Get account info
      const account = await this.rpc.getAccount(this.keypair.publicKey());
      
      // Build transaction with proper ScVal encoding
      const tx = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: this.config.networkPassphrase,
      })
        .addOperation(
          this.contract.call(
            'revoke',
            Address.fromString(this.keypair.publicKey()).toScVal(),
            Address.fromString(wallet).toScVal(),
          ),
        )
        .setTimeout(30)
        .build();

      // Sign transaction
      tx.sign(this.keypair);

      // Submit transaction
      const result = await this.rpc.sendTransaction(tx);
      this.logger.log(`User revoked. Transaction: ${result.hash}`);
      return result.hash;
    } catch (error) {
      this.logger.error(`Error revoking user: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check if a wallet is verified
   */
  async isVerified(wallet: string): Promise<boolean> {
    try {
      if (this.useMockMode) {
        const record = this.mockVerificationStore.get(wallet.toLowerCase());
        if (record) {
          const now = Date.now();
          return record.expires_at > now;
        }
        return false;
      }

      // For now, use mock mode for isVerified since ledger key access requires more complex setup
      // TODO: Implement proper ledger entry reading when SDK documentation is available
      this.logger.debug(`Checking verification status for wallet: ${wallet} (using mock for now)`);
      const record = this.mockVerificationStore.get(wallet.toLowerCase());
      if (record) {
        const now = Date.now();
        return record.expires_at > now;
      }
      return false;
    } catch (error) {
      this.logger.error(`Error checking verification status: ${error.message}`);
      return false;
    }
  }

  /**
   * Get verification data for a wallet
   */
  async getVerification(wallet: string): Promise<VerificationStatus> {
    try {
      if (this.useMockMode) {
        const record = this.mockVerificationStore.get(wallet.toLowerCase());
        if (record) {
          const now = Date.now();
          if (record.expires_at > now) {
            return {
              verified: true,
              data: record,
            };
          }
          return { verified: false };
        }
        return { verified: false };
      }

      // For now, use mock mode for getVerification since ledger key access requires more complex setup
      // TODO: Implement proper ledger entry reading when SDK documentation is available
      this.logger.debug(`Getting verification data for wallet: ${wallet} (using mock for now)`);
      const record = this.mockVerificationStore.get(wallet.toLowerCase());
      if (record) {
        const now = Date.now();
        if (record.expires_at > now) {
          return {
            verified: true,
            data: record,
          };
        }
        return { verified: false };
      }
      return { verified: false };
    } catch (error) {
      this.logger.error(`Error getting verification data: ${error.message}`);
      return { verified: false };
    }
  }

  /**
   * Rotate the backend public key (admin only)
   */
  async rotateBackendKey(newPublicKey: string): Promise<string> {
    this.logger.log('Rotating backend public key...');
    
    if (this.useMockMode) {
      const mockTxHash = `mock_rotate_${Date.now()}`;
      this.logger.log(`Backend key rotated (mock). Transaction: ${mockTxHash}`);
      return mockTxHash;
    }

    try {
      // Get account info
      const account = await this.rpc.getAccount(this.keypair.publicKey());
      
      // Build transaction with proper ScVal encoding
      const tx = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: this.config.networkPassphrase,
      })
        .addOperation(
          this.contract.call(
            'rotate_backend_key',
            Address.fromString(this.keypair.publicKey()).toScVal(),
            xdr.ScVal.scvBytes(Buffer.from(newPublicKey, 'hex')),
          ),
        )
        .setTimeout(30)
        .build();

      // Sign transaction
      tx.sign(this.keypair);

      // Submit transaction
      const result = await this.rpc.sendTransaction(tx);
      this.logger.log(`Backend key rotated. Transaction: ${result.hash}`);
      return result.hash;
    } catch (error) {
      this.logger.error(`Error rotating backend key: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update the contract configuration
   */
  updateConfig(config: Partial<ContractConfig>): void {
    this.config = { ...this.config, ...config };
    this.logger.log('Contract configuration updated');
  }

  /**
   * Generate a mock proof hash for development testing
   */
  private generateMockProofHash(wallet: string, payload: string): string {
    const data = `${wallet}:${payload}:${Date.now()}`;
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `mock_hash_${Math.abs(hash).toString(16)}`;
  }
}
