import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  Contract,
  Keypair,
  Networks,
  TransactionBuilder,
  BASE_FEE,
  nativeToScVal,
  xdr,
  rpc,
} from "@stellar/stellar-sdk";

export type ContractName =
  | "issuer-registry"
  | "credential-registry"
  | "revocation-registry"
  | "proof-verifier"
  | `proof-verifier-${string}`;

export interface InvokeContractResult {
  txHash: string;
  result: xdr.ScVal | undefined;
}

// Retry delays: 1s, 2s, 4s, 8s, 16s (exponential backoff)
const RETRY_DELAYS_MS = [1000, 2000, 4000, 8000, 16000];

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

@Injectable()
export class SorobanService {
  private readonly logger = new Logger(SorobanService.name);
  private readonly rpcServer: rpc.Server;
  private readonly networkPassphrase: string;
  private readonly contractAddressMap: Record<string, string>;

  constructor(private readonly config: ConfigService) {
    const rpcUrl = this.config.get<string>("SOROBAN_RPC_URL")!;
    const network = this.config.get<string>("STELLAR_NETWORK", "testnet");

    this.rpcServer = new rpc.Server(rpcUrl, { allowHttp: true });

    this.networkPassphrase =
      network === "mainnet"
        ? Networks.PUBLIC
        : network === "futurenet"
          ? Networks.FUTURENET
          : Networks.TESTNET;

    this.contractAddressMap = {
      "issuer-registry": this.config.get<string>("ISSUER_REGISTRY_CONTRACT_ID", ""),
      "credential-registry": this.config.get<string>("CREDENTIAL_REGISTRY_CONTRACT_ID", ""),
      "revocation-registry": this.config.get<string>("REVOCATION_REGISTRY_CONTRACT_ID", ""),
      "proof-verifier-age-proof": this.config.get<string>("PROOF_VERIFIER_CONTRACT_ID_AGE_PROOF", ""),
      "proof-verifier-residency-proof": this.config.get<string>("PROOF_VERIFIER_CONTRACT_ID_RESIDENCY_PROOF", ""),
      "proof-verifier-accredited-investor": this.config.get<string>("PROOF_VERIFIER_CONTRACT_ID_ACCREDITED_INVESTOR", ""),
      "proof-verifier-sanctions-check": this.config.get<string>("PROOF_VERIFIER_CONTRACT_ID_SANCTIONS_CHECK", ""),
    };
  }

  /**
   * Resolve contract address from name.
   */
  private resolveContractId(contractName: ContractName): string {
    const id = this.contractAddressMap[contractName];
    if (!id) {
      throw new Error(`No contract ID configured for: ${contractName}`);
    }
    return id;
  }

  /**
   * Build a contract invocation transaction, simulate it, then sign and submit.
   * Polls until SUCCESS or FAILED. Retries failed RPC calls with exponential backoff.
   * Requirements: 11.1, 11.2, 11.3
   */
  async invokeContract(
    contractName: ContractName,
    method: string,
    args: xdr.ScVal[],
    signerSecret: string,
  ): Promise<InvokeContractResult> {
    const contractId = this.resolveContractId(contractName);
    const contract = new Contract(contractId);
    const signerKeypair = Keypair.fromSecret(signerSecret);

    return this.withRetry(async () => {
      // 1. Load account for fresh sequence number
      const account = await this.rpcServer.getAccount(signerKeypair.publicKey());

      // 2. Build the transaction
      const tx = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(contract.call(method, ...args))
        .setTimeout(30)
        .build();

      // 3. Simulate to get fee estimate and footprint (Requirement 11.1)
      const simResult = await this.rpcServer.simulateTransaction(tx);

      if (rpc.Api.isSimulationError(simResult)) {
        throw new Error(`Simulation failed: ${simResult.error}`);
      }

      if (!rpc.Api.isSimulationSuccess(simResult)) {
        throw new Error("Simulation did not return a success response");
      }

      // 4. Prepare the transaction (applies soroban-specific fields from simulation)
      const preparedTx = rpc.assembleTransaction(tx, simResult).build();

      // 5. Sign
      preparedTx.sign(signerKeypair);

      // 6. Submit
      const sendResponse = await this.rpcServer.sendTransaction(preparedTx);

      if (sendResponse.status === "ERROR") {
        throw new Error(`Transaction send failed: ${JSON.stringify(sendResponse.errorResult)}`);
      }

      // 7. Poll until SUCCESS or FAILED
      const txHash = sendResponse.hash;
      const result = await this.pollTransaction(txHash);

      return { txHash, result };
    });
  }

  /**
   * Read-only simulation — does not submit a transaction.
   * Used for is_issuer, is_revoked queries.
   * Requirement: 11.1
   */
  async simulateContract(
    contractName: ContractName,
    method: string,
    args: xdr.ScVal[],
  ): Promise<rpc.Api.SimulateTransactionSuccessResponse> {
    const contractId = this.resolveContractId(contractName);
    const contract = new Contract(contractId);

    return this.withRetry(async () => {
      // Use a dummy account for simulation — any valid public key works
      const serverSecret = this.config.get<string>("STELLAR_SERVER_SECRET")!;
      const serverKeypair = Keypair.fromSecret(serverSecret);
      const account = await this.rpcServer.getAccount(serverKeypair.publicKey());

      const tx = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(contract.call(method, ...args))
        .setTimeout(30)
        .build();

      const simResult = await this.rpcServer.simulateTransaction(tx);

      if (rpc.Api.isSimulationError(simResult)) {
        throw new Error(`Simulation failed: ${simResult.error}`);
      }

      if (!rpc.Api.isSimulationSuccess(simResult)) {
        throw new Error("Simulation did not return a success response");
      }

      return simResult;
    });
  }

  /**
   * Poll transaction status until SUCCESS or FAILED (or timeout).
   */
  private async pollTransaction(txHash: string): Promise<xdr.ScVal | undefined> {
    const MAX_POLLS = 20;
    const POLL_INTERVAL_MS = 1500;

    for (let i = 0; i < MAX_POLLS; i++) {
      await sleep(POLL_INTERVAL_MS);

      const response = await this.rpcServer.getTransaction(txHash);

      if (response.status === rpc.Api.GetTransactionStatus.SUCCESS) {
        return (response as rpc.Api.GetSuccessfulTransactionResponse).returnValue;
      }

      if (response.status === rpc.Api.GetTransactionStatus.FAILED) {
        throw new Error(`Transaction ${txHash} failed on-chain`);
      }

      // NOT_FOUND means still processing — keep polling
    }

    throw new Error(`Transaction ${txHash} timed out after ${MAX_POLLS} polls`);
  }

  /**
   * Execute fn with exponential backoff retry on error (up to 5 attempts).
   * Requirement: 11.3
   */
  private async withRetry<T>(fn: () => Promise<T>): Promise<T> {
    for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
      try {
        return await fn();
      } catch (err) {
        const isLast = attempt === RETRY_DELAYS_MS.length;
        if (isLast) {
          this.logger.error(
            `Soroban RPC failed after ${attempt + 1} attempts: ${(err as Error).message}`,
          );
          throw err;
        }
        const delay = RETRY_DELAYS_MS[attempt];
        this.logger.warn(
          `Soroban RPC error on attempt ${attempt + 1}, retrying in ${delay}ms: ${(err as Error).message}`,
        );
        await sleep(delay);
      }
    }
    throw new Error("Unreachable");
  }

  /**
   * Expose nativeToScVal for callers building args.
   */
  static toScVal(value: unknown): xdr.ScVal {
    return nativeToScVal(value);
  }
}
