import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  Keypair,
  Networks,
  TransactionBuilder,
  BASE_FEE,
  Horizon,
  xdr,
} from "@stellar/stellar-sdk";

export interface AccountRecord {
  id: string;
  sequence: string;
  balances: Horizon.HorizonApi.BalanceLine[];
}

export interface TransactionRecord {
  id: string;
  hash: string;
  ledger: number;
  createdAt: string;
}

export interface SubmitResult {
  txHash: string;
  ledger: number;
}

// Retry delays: 1s, 2s, 4s, 8s, 16s (exponential backoff)
const RETRY_DELAYS_MS = [1000, 2000, 4000, 8000, 16000];

// Horizon error codes that are retryable
const RETRYABLE_RESULT_CODES = new Set([
  "tx_bad_seq", // sequence number conflict
]);

function isRetryableError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;

  // Network / timeout errors
  const msg = err.message.toLowerCase();
  if (
    msg.includes("timeout") ||
    msg.includes("econnreset") ||
    msg.includes("econnrefused") ||
    msg.includes("network")
  ) {
    return true;
  }

  // Horizon transaction_failed with retryable result codes
  const horizonErr = err as { response?: { data?: { extras?: { result_codes?: { transaction?: string } } } } };
  const txCode = horizonErr?.response?.data?.extras?.result_codes?.transaction;
  if (txCode && RETRYABLE_RESULT_CODES.has(txCode)) {
    return true;
  }

  return false;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

@Injectable()
export class StellarService {
  private readonly logger = new Logger(StellarService.name);
  private readonly server: Horizon.Server;
  private readonly networkPassphrase: string;

  constructor(private readonly config: ConfigService) {
    const horizonUrl = this.config.get<string>("HORIZON_URL")!;
    const network = this.config.get<string>("STELLAR_NETWORK", "testnet");

    this.server = new Horizon.Server(horizonUrl);

    this.networkPassphrase =
      network === "mainnet"
        ? Networks.PUBLIC
        : network === "futurenet"
          ? Networks.FUTURENET
          : Networks.TESTNET;
  }

  /**
   * Generate a new random Stellar keypair.
   * Requirement 10.1
   */
  generateKeypair(): { publicKey: string; secretKey: string } {
    const kp = Keypair.random();
    return {
      publicKey: kp.publicKey(),
      secretKey: kp.secret(),
    };
  }

  /**
   * Load an account from Horizon.
   * Requirement 10.4
   */
  async getAccount(publicKey: string): Promise<AccountRecord> {
    const account = await this.server.loadAccount(publicKey);
    return {
      id: account.id,
      sequence: account.sequenceNumber(),
      balances: account.balances,
    };
  }

  /**
   * Build, sign, and submit a transaction via Horizon.
   * Retries sequence-number conflicts and network timeouts up to 5 times
   * with exponential backoff (1s, 2s, 4s, 8s, 16s).
   * Requirements 10.2, 10.3, 10.5
   */
  async buildAndSubmitTx(
    operations: xdr.Operation[],
    signerSecret: string,
  ): Promise<SubmitResult> {
    const signerKeypair = Keypair.fromSecret(signerSecret);

    for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
      try {
        // Always reload the account to get a fresh sequence number
        const account = await this.server.loadAccount(
          signerKeypair.publicKey(),
        );

        const tx = new TransactionBuilder(account, {
          fee: BASE_FEE,
          networkPassphrase: this.networkPassphrase,
        })
          .setTimeout(30);

        for (const op of operations) {
          tx.addOperation(op);
        }

        const transaction = tx.build();
        transaction.sign(signerKeypair);

        const result = await this.server.submitTransaction(transaction);

        return {
          txHash: result.hash,
          ledger: result.ledger,
        };
      } catch (err) {
        const isLast = attempt === RETRY_DELAYS_MS.length;

        if (!isRetryableError(err) || isLast) {
          this.logger.error(
            `Transaction submission failed (attempt ${attempt + 1}): ${(err as Error).message}`,
          );
          throw err;
        }

        const delay = RETRY_DELAYS_MS[attempt];
        this.logger.warn(
          `Retryable error on attempt ${attempt + 1}, retrying in ${delay}ms: ${(err as Error).message}`,
        );
        await sleep(delay);
      }
    }

    // Unreachable, but satisfies TypeScript
    throw new Error("Transaction submission failed after all retries");
  }

  /**
   * Fetch transaction history for a Stellar account from Horizon.
   * Requirement 10.4
   */
  async getTransactionHistory(publicKey: string): Promise<TransactionRecord[]> {
    const transactions = await this.server
      .transactions()
      .forAccount(publicKey)
      .order("desc")
      .limit(200)
      .call();

    return transactions.records.map((tx) => ({
      id: tx.id,
      hash: tx.hash,
      ledger: tx.ledger_attr,
      createdAt: tx.created_at,
    }));
  }
}
