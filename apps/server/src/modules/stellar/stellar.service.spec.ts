import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { StellarService } from "./stellar.service";
import { Keypair, Networks } from "@stellar/stellar-sdk";

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeConfigService(overrides: Record<string, string> = {}): ConfigService {
  const defaults: Record<string, string> = {
    HORIZON_URL: "https://horizon-testnet.stellar.org",
    STELLAR_NETWORK: "testnet",
    ...overrides,
  };
  return {
    get: <T = string>(key: string, fallback?: T): T =>
      (defaults[key] as unknown as T) ?? fallback!,
  } as unknown as ConfigService;
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("StellarService", () => {
  let service: StellarService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StellarService,
        {
          provide: ConfigService,
          useValue: makeConfigService(),
        },
      ],
    }).compile();

    service = module.get<StellarService>(StellarService);
  });

  // ── generateKeypair ──────────────────────────────────────────────────────

  describe("generateKeypair", () => {
    it("returns a public key starting with G and a secret key starting with S", () => {
      const kp = service.generateKeypair();
      expect(kp.publicKey).toMatch(/^G[A-Z2-7]{55}$/);
      expect(kp.secretKey).toMatch(/^S[A-Z2-7]{55}$/);
    });

    it("returns a different keypair each call", () => {
      const kp1 = service.generateKeypair();
      const kp2 = service.generateKeypair();
      expect(kp1.publicKey).not.toBe(kp2.publicKey);
    });

    it("returns a keypair where the secret reconstructs the same public key", () => {
      const kp = service.generateKeypair();
      const reconstructed = Keypair.fromSecret(kp.secretKey).publicKey();
      expect(reconstructed).toBe(kp.publicKey);
    });
  });

  // ── getAccount ───────────────────────────────────────────────────────────

  describe("getAccount", () => {
    it("calls Horizon loadAccount and returns account record shape", async () => {
      const fakeAccount = {
        id: "GABC",
        sequenceNumber: () => "12345",
        balances: [{ asset_type: "native", balance: "100.0000000" }],
      };

      // @ts-expect-error accessing private for testing
      jest.spyOn(service.server, "loadAccount").mockResolvedValueOnce(fakeAccount as any);

      const result = await service.getAccount("GABC");
      expect(result.id).toBe("GABC");
      expect(result.sequence).toBe("12345");
      expect(result.balances).toHaveLength(1);
    });
  });

  // ── getTransactionHistory ────────────────────────────────────────────────

  describe("getTransactionHistory", () => {
    it("returns a mapped array of transaction records", async () => {
      const fakeRecords = [
        { id: "t1", hash: "abc", ledger_attr: 1000, created_at: "2024-01-01T00:00:00Z" },
        { id: "t2", hash: "def", ledger_attr: 1001, created_at: "2024-01-02T00:00:00Z" },
      ];

      const mockCall = jest.fn().mockResolvedValueOnce({ records: fakeRecords });
      const mockLimit = jest.fn().mockReturnValue({ call: mockCall });
      const mockOrder = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockForAccount = jest.fn().mockReturnValue({ order: mockOrder });
      const mockTransactions = jest.fn().mockReturnValue({ forAccount: mockForAccount });

      // @ts-expect-error accessing private for testing
      service.server.transactions = mockTransactions;

      const result = await service.getTransactionHistory("GABC");
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ id: "t1", hash: "abc", ledger: 1000, createdAt: "2024-01-01T00:00:00Z" });
      expect(result[1]).toEqual({ id: "t2", hash: "def", ledger: 1001, createdAt: "2024-01-02T00:00:00Z" });
    });
  });

  // ── buildAndSubmitTx ─────────────────────────────────────────────────────

  describe("buildAndSubmitTx", () => {
    const signerSecret = Keypair.random().secret();
    const signerPublicKey = Keypair.fromSecret(signerSecret).publicKey();

    function makeFakeAccount(sequence = "100") {
      // Minimal AccountResponse-like object accepted by TransactionBuilder
      return {
        id: signerPublicKey,
        sequenceNumber: () => sequence,
        sequence,
        incrementSequenceNumber: jest.fn(),
        accountId: () => signerPublicKey,
        balances: [],
        signers: [],
        flags: {},
        thresholds: { low_threshold: 0, med_threshold: 0, high_threshold: 0 },
      } as any;
    }

    it("submits a transaction and returns txHash and ledger on success", async () => {
      // @ts-expect-error accessing private for testing
      jest.spyOn(service.server, "loadAccount").mockResolvedValue(makeFakeAccount());
      // @ts-expect-error accessing private for testing
      jest.spyOn(service.server, "submitTransaction").mockResolvedValueOnce({
        hash: "tx_hash_abc",
        ledger: 42,
      } as any);

      const result = await service.buildAndSubmitTx([], signerSecret);
      expect(result.txHash).toBe("tx_hash_abc");
      expect(result.ledger).toBe(42);
    });

    it("retries on sequence number conflict and succeeds on second attempt", async () => {
      jest.useFakeTimers();

      // @ts-expect-error accessing private for testing
      jest.spyOn(service.server, "loadAccount").mockResolvedValue(makeFakeAccount());

      const seqError = Object.assign(new Error("Transaction failed"), {
        response: {
          data: {
            extras: { result_codes: { transaction: "tx_bad_seq" } },
          },
        },
      });

      // @ts-expect-error accessing private for testing
      const submitSpy = jest.spyOn(service.server, "submitTransaction")
        .mockRejectedValueOnce(seqError)
        .mockResolvedValueOnce({ hash: "tx_retry_ok", ledger: 50 } as any);

      const promise = service.buildAndSubmitTx([], signerSecret);

      // Let the microtasks (first submit, first catch) run
      await Promise.resolve();
      await Promise.resolve();

      // Advance past the first retry delay (1000ms)
      jest.advanceTimersByTime(1100);

      // Let remaining microtasks (second submit) run
      await Promise.resolve();
      await Promise.resolve();

      jest.useRealTimers();

      const result = await promise;
      expect(submitSpy).toHaveBeenCalledTimes(2);
      expect(result.txHash).toBe("tx_retry_ok");
    });

    it("throws immediately on a non-retryable error", async () => {
      // @ts-expect-error accessing private for testing
      jest.spyOn(service.server, "loadAccount").mockResolvedValue(makeFakeAccount());

      const nonRetryableErr = new Error("tx_failed: insufficient funds");
      // @ts-expect-error accessing private for testing
      jest.spyOn(service.server, "submitTransaction").mockRejectedValueOnce(nonRetryableErr);

      await expect(service.buildAndSubmitTx([], signerSecret)).rejects.toThrow(
        "tx_failed: insufficient funds",
      );
    });
  });

  // ── Network passphrase ───────────────────────────────────────────────────

  describe("network passphrase selection", () => {
    it("uses PUBLIC passphrase for mainnet", async () => {
      const mainnetModule = await Test.createTestingModule({
        providers: [
          StellarService,
          { provide: ConfigService, useValue: makeConfigService({ STELLAR_NETWORK: "mainnet" }) },
        ],
      }).compile();

      const mainnetService = mainnetModule.get<StellarService>(StellarService);
      // @ts-expect-error accessing private
      expect(mainnetService.networkPassphrase).toBe(Networks.PUBLIC);
    });

    it("uses TESTNET passphrase by default", () => {
      // @ts-expect-error accessing private
      expect(service.networkPassphrase).toBe(Networks.TESTNET);
    });
  });
});
