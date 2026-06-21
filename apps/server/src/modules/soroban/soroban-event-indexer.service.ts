import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { SorobanRpc } from "@stellar/stellar-sdk";
import { PrismaService } from "../../prisma/prisma.service";
import Redis from "ioredis";

const LAST_LEDGER_KEY = "soroban:lastLedger";
const BATCH_SIZE = 200; // ledgers per poll

@Injectable()
export class SorobanEventIndexer implements OnModuleDestroy {
  private readonly logger = new Logger(SorobanEventIndexer.name);
  private readonly rpcServer: SorobanRpc.Server;
  private readonly redis: Redis;
  private readonly pollIntervalMs: number;
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const rpcUrl = this.config.get<string>("SOROBAN_RPC_URL")!;
    this.rpcServer = new SorobanRpc.Server(rpcUrl, { allowHttp: true });

    this.redis = new Redis({
      host: this.config.get<string>("REDIS_HOST", "localhost"),
      port: this.config.get<number>("REDIS_PORT", 6379),
    });

    // Default poll interval: 5 seconds, configurable via SOROBAN_INDEXER_INTERVAL_MS
    this.pollIntervalMs = this.config.get<number>("SOROBAN_INDEXER_INTERVAL_MS", 5000);
  }

  /**
   * Start the event indexer from the given ledger (or resume from Redis checkpoint).
   * Requirements: 11.4, 11.5
   */
  async startIndexing(fromLedger: number): Promise<void> {
    if (this.running) {
      this.logger.warn("Event indexer is already running");
      return;
    }

    // Restore checkpoint from Redis (Requirement 11.5)
    const stored = await this.redis.get(LAST_LEDGER_KEY);
    const startLedger = stored ? parseInt(stored, 10) + 1 : fromLedger;

    this.logger.log(`Starting event indexer from ledger ${startLedger}`);
    this.running = true;
    await this.schedulePoll(startLedger);
  }

  /**
   * Stop the indexer (called on module destroy).
   */
  stopIndexing(): void {
    this.running = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.logger.log("Event indexer stopped");
  }

  onModuleDestroy(): void {
    this.stopIndexing();
    this.redis.disconnect();
  }

  /**
   * Schedule the next poll after the configured interval.
   */
  private async schedulePoll(fromLedger: number): Promise<void> {
    if (!this.running) return;

    this.timer = setTimeout(async () => {
      const nextLedger = await this.poll(fromLedger);
      await this.schedulePoll(nextLedger);
    }, this.pollIntervalMs);
  }

  /**
   * Poll a batch of ledgers for Soroban events and persist them.
   * Returns the next ledger to start from.
   */
  async poll(fromLedger: number): Promise<number> {
    try {
      const toLedger = fromLedger + BATCH_SIZE - 1;

      this.logger.debug(`Polling events from ledger ${fromLedger} to ${toLedger}`);

      const response = await this.rpcServer.getEvents({
        startLedger: fromLedger,
        filters: [],
        limit: 10000,
      });

      if (response.events.length > 0) {
        await this.persistEvents(response.events);
        this.logger.log(`Indexed ${response.events.length} events from ledger ${fromLedger}`);
      }

      // Checkpoint: store the last ledger we processed
      const lastLedger = response.latestLedger ?? toLedger;
      await this.redis.set(LAST_LEDGER_KEY, lastLedger.toString());

      return lastLedger + 1;
    } catch (err) {
      this.logger.error(`Failed to poll events from ledger ${fromLedger}: ${(err as Error).message}`);
      // On error, return same fromLedger to retry next cycle
      return fromLedger;
    }
  }

  /**
   * Persist raw Soroban events to the SorobanEvent table.
   * Requirement: 11.4
   */
  private async persistEvents(events: SorobanRpc.Api.RawEventResponse[]): Promise<void> {
    for (const event of events) {
      try {
        await this.prisma.sorobanEvent.create({
          data: {
            contractAddress: event.contractId ?? "",
            eventType: event.type,
            payload: event.value as object,
            ledgerSequence: event.ledger,
            txHash: event.txHash,
          },
        });
      } catch (err) {
        // Log and continue — don't let a single bad event stop the indexer
        this.logger.error(`Failed to persist event ${event.id}: ${(err as Error).message}`);
      }
    }
  }
}
