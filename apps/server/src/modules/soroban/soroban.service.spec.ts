import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { SorobanService } from "./soroban.service";

// Minimal mock for rpc.Server — only what SorobanService uses at construction time
const mockConfig: Record<string, unknown> = {
  SOROBAN_RPC_URL: "https://soroban-testnet.stellar.org",
  STELLAR_NETWORK: "testnet",
  STELLAR_SERVER_SECRET: "SCZANGBA5IIFAHBT7JQUVZ4CSTNVR4JSCPFHLGQVHVKSTQEMGZHCVHNC",
  ISSUER_REGISTRY_CONTRACT_ID: "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM",
  CREDENTIAL_REGISTRY_CONTRACT_ID: "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM",
  REVOCATION_REGISTRY_CONTRACT_ID: "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM",
  PROOF_VERIFIER_CONTRACT_ID_AGE_PROOF: "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM",
  PROOF_VERIFIER_CONTRACT_ID_RESIDENCY_PROOF: "",
  PROOF_VERIFIER_CONTRACT_ID_ACCREDITED_INVESTOR: "",
  PROOF_VERIFIER_CONTRACT_ID_SANCTIONS_CHECK: "",
};

describe("SorobanService", () => {
  let service: SorobanService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SorobanService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultVal?: unknown) => mockConfig[key] ?? defaultVal ?? ""),
          },
        },
      ],
    }).compile();

    service = module.get<SorobanService>(SorobanService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("resolveContractId (via invokeContract error path)", () => {
    it("throws if contract name is not configured", async () => {
      // proof-verifier-residency-proof has empty string config → should throw
      await expect(
        service.invokeContract(
          "proof-verifier-residency-proof",
          "verify",
          [],
          "SCZANGBA5IIFAHBT7JQUVZ4CSTNVR4JSCPFHLGQVHVKSTQEMGZHCVHNC",
        ),
      ).rejects.toThrow("No contract ID configured for: proof-verifier-residency-proof");
    });

    it("does not throw for configured contract names", () => {
      // The contract ID is present in config — verifying no early error
      expect(() => {
        // Access private method via type assertion to test resolution
        (service as unknown as { resolveContractId: (n: string) => string }).resolveContractId(
          "issuer-registry",
        );
      }).not.toThrow();
    });
  });

  describe("toScVal static helper", () => {
    it("converts a boolean to ScVal", () => {
      const scVal = SorobanService.toScVal(true);
      expect(scVal).toBeDefined();
    });

    it("converts a string to ScVal", () => {
      const scVal = SorobanService.toScVal("hello");
      expect(scVal).toBeDefined();
    });

    it("converts a number to ScVal", () => {
      const scVal = SorobanService.toScVal(42);
      expect(scVal).toBeDefined();
    });
  });
});
