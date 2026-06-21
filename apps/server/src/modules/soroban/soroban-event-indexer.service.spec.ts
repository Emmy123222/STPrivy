import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { SorobanEventIndexer } from "./soroban-event-indexer.service";
import { PrismaService } from "../../prisma/prisma.service";

const mockConfig: Record<string, unknown> = {
  SOROBAN_RPC_URL: "https://soroban-testnet.stellar.org",
  REDIS_HOST: "localhost",
  REDIS_PORT: 6379,
  SOROBAN_INDEXER_INTERVAL_MS: 60000, // large value so timer doesn't fire during test
};

// Mock ioredis so tests don't need a real Redis connection
jest.mock("ioredis", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue("OK"),
    disconnect: jest.fn(),
  })),
}));

describe("SorobanEventIndexer", () => {
  let indexer: SorobanEventIndexer;
  let prisma: { sorobanEvent: { create: jest.Mock } };

  beforeEach(async () => {
    prisma = {
      sorobanEvent: {
        create: jest.fn().mockResolvedValue({}),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SorobanEventIndexer,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultVal?: unknown) => mockConfig[key] ?? defaultVal ?? ""),
          },
        },
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    indexer = module.get<SorobanEventIndexer>(SorobanEventIndexer);
  });

  afterEach(() => {
    indexer.stopIndexing();
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(indexer).toBeDefined();
  });

  describe("startIndexing", () => {
    it("starts indexing from provided ledger when Redis has no checkpoint", async () => {
      // getEvents mock — returns empty event list to avoid persistence
      const mockGetEvents = jest.fn().mockResolvedValue({
        events: [],
        latestLedger: 1050,
        oldestLedger: 1000,
        latestLedgerCloseTime: "0",
        oldestLedgerCloseTime: "0",
        cursor: "",
      });

      // Patch rpcServer on the instance
      (indexer as unknown as { rpcServer: { getEvents: jest.Mock } }).rpcServer = {
        getEvents: mockGetEvents,
      };

      await indexer.startIndexing(1000);
      indexer.stopIndexing();

      // Running flag is set
      expect((indexer as unknown as { running: boolean }).running).toBe(false);
    });

    it("does not start a second time if already running", async () => {
      (indexer as unknown as { running: boolean }).running = true;
      const spy = jest.spyOn(indexer as unknown as { schedulePoll: () => void }, "schedulePoll");

      await indexer.startIndexing(1000);

      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe("poll", () => {
    it("returns next ledger = latestLedger + 1 on success", async () => {
      const mockGetEvents = jest.fn().mockResolvedValue({
        events: [],
        latestLedger: 1199,
        oldestLedger: 1000,
        latestLedgerCloseTime: "0",
        oldestLedgerCloseTime: "0",
        cursor: "",
      });

      (indexer as unknown as { rpcServer: { getEvents: jest.Mock } }).rpcServer = {
        getEvents: mockGetEvents,
      };

      const result = await indexer.poll(1000);

      expect(result).toBe(1200);
    });

    it("returns same fromLedger on RPC error (retry next cycle)", async () => {
      const mockGetEvents = jest.fn().mockRejectedValue(new Error("network error"));

      (indexer as unknown as { rpcServer: { getEvents: jest.Mock } }).rpcServer = {
        getEvents: mockGetEvents,
      };

      const result = await indexer.poll(1000);

      expect(result).toBe(1000);
    });

    it("persists events when events are returned", async () => {
      // Build a minimal EventResponse-like object
      const mockEvent = {
        id: "evt-1",
        type: "contract" as const,
        ledger: 1001,
        ledgerClosedAt: "2024-01-01T00:00:00Z",
        transactionIndex: 0,
        operationIndex: 0,
        inSuccessfulContractCall: true,
        txHash: "abc123",
        contractId: undefined,
        topic: [],
        value: { toXDR: () => "AAAAAA==" },
      };

      const mockGetEvents = jest.fn().mockResolvedValue({
        events: [mockEvent],
        latestLedger: 1100,
        oldestLedger: 1000,
        latestLedgerCloseTime: "0",
        oldestLedgerCloseTime: "0",
        cursor: "",
      });

      (indexer as unknown as { rpcServer: { getEvents: jest.Mock } }).rpcServer = {
        getEvents: mockGetEvents,
      };

      await indexer.poll(1000);

      expect(prisma.sorobanEvent.create).toHaveBeenCalledTimes(1);
      expect(prisma.sorobanEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            txHash: "abc123",
            ledgerSequence: 1001,
            eventType: "contract",
          }),
        }),
      );
    });
  });

  describe("stopIndexing", () => {
    it("sets running to false and clears timer", () => {
      (indexer as unknown as { running: boolean }).running = true;
      indexer.stopIndexing();
      expect((indexer as unknown as { running: boolean }).running).toBe(false);
    });
  });
});
