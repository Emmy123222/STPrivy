import { Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { createHash, randomUUID } from "crypto";
import { Keypair, Networks, WebAuth } from "@stellar/stellar-sdk";
import Redis from "ioredis";
import { InjectRedis } from "./redis.provider";
import { PrismaService } from "../../prisma/prisma.service";

export interface JwtPayload {
  sub: string;    // User DB id (UUID)
  address: string; // Stellar public key
  role: string;
  iat?: number;
  exp?: number;
}

const CHALLENGE_TTL_SECONDS = 300; // 5 minutes
const REFRESH_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly serverKeypair: Keypair;
  private readonly networkPassphrase: string;
  private readonly homeDomain: string;

  constructor(
    private readonly config: ConfigService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    @InjectRedis() private readonly redis: Redis,
  ) {
    const serverSecret = this.config.get<string>("STELLAR_SERVER_SECRET")!;
    this.serverKeypair = Keypair.fromSecret(serverSecret);

    const network = this.config.get<string>("STELLAR_NETWORK", "testnet");
    this.networkPassphrase =
      network === "mainnet"
        ? Networks.PUBLIC
        : network === "futurenet"
          ? Networks.FUTURENET
          : Networks.TESTNET;

    this.homeDomain = this.config.get<string>("HOME_DOMAIN", "localhost");
  }

  /**
   * Generate a SEP-10 challenge transaction for the given Stellar public key.
   * Stores the nonce in Redis with a 5-minute TTL.
   * Requirement 1.1
   */
  async generateChallenge(
    publicKey: string,
  ): Promise<{ transaction: string; nonce: string }> {
    const nonce = randomUUID();

    const challengeTx = WebAuth.buildChallengeTx(
      this.serverKeypair,
      publicKey,
      this.homeDomain,
      CHALLENGE_TTL_SECONDS,
      this.networkPassphrase,
      this.homeDomain, // webAuthDomain (required in stellar-sdk v16+)
    );

    // Store nonce with TTL; value encodes the public key for binding
    await this.redis.setex(
      this.nonceKey(nonce),
      CHALLENGE_TTL_SECONDS,
      publicKey,
    );

    return { transaction: challengeTx, nonce };
  }

  /**
   * Verify a signed SEP-10 challenge transaction and return JWT pair.
   * Requirements 1.2, 1.3, 1.8
   */
  async verifyChallengeAndLogin(
    signedXDR: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    let clientPublicKey: string;

    try {
      const { clientAccountID } = WebAuth.readChallengeTx(
        signedXDR,
        this.serverKeypair.publicKey(),
        this.networkPassphrase,
        this.homeDomain,
        this.homeDomain,
      );
      clientPublicKey = clientAccountID;
    } catch (err) {
      this.logger.warn(`readChallengeTx failed: ${(err as Error).message}`);
      throw new UnauthorizedException("Invalid challenge transaction");
    }

    try {
      WebAuth.verifyChallengeTxSigners(
        signedXDR,
        this.serverKeypair.publicKey(),
        this.networkPassphrase,
        [clientPublicKey],
        this.homeDomain,
        this.homeDomain,
      );
    } catch (err) {
      this.logger.warn(
        `verifyChallengeTxSigners failed: ${(err as Error).message}`,
      );
      throw new UnauthorizedException(
        "Invalid or expired challenge transaction",
      );
    }

    // Derive a stable nonce identifier from the XDR and check for replay
    const nonce = this.extractNonceFromXDR(signedXDR);
    if (nonce) {
      const nonceKey = this.nonceKey(nonce);
      const consumed = await this.redis.get(`${nonceKey}:used`);
      if (consumed) {
        throw new UnauthorizedException("Nonce already used");
      }
      // Mark nonce as consumed (keep it for TTL so replays are rejected)
      await this.redis.setex(`${nonceKey}:used`, CHALLENGE_TTL_SECONDS, "1");
    }

    return this.issueTokenPair(clientPublicKey);
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, include: { did: true } });
    if (!user) throw new UnauthorizedException();
    return {
      id: user.id,
      stellarAddress: user.stellarAddress,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
      hasDID: !!user.did,
    };
  }

  /**
   * Issue a new access token from a valid refresh token.
   * Requirements 1.4, 1.5
   */
  async refreshAccessToken(
    refreshToken: string,
  ): Promise<{ accessToken: string }> {
    const key = this.refreshKey(refreshToken);
    const userId = await this.redis.get(key);
    if (!userId) {
      throw new UnauthorizedException("Invalid or expired refresh token");
    }
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException("User not found");

    const payload: JwtPayload = { sub: user.id, address: user.stellarAddress, role: user.role };
    const accessToken = this.jwtService.sign(payload);
    return { accessToken };
  }

  /**
   * Invalidate a refresh token (logout).
   * Requirement 1.6
   */
  async logout(refreshToken: string): Promise<void> {
    await this.redis.del(this.refreshKey(refreshToken));
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private async issueTokenPair(
    publicKey: string,
  ): Promise<{ accessToken: string; refreshToken: string; user: { id: string; stellarAddress: string; role: string; createdAt: string; hasDID: boolean } }> {
    // Upsert user — first login creates the record
    const user = await this.prisma.user.upsert({
      where: { stellarAddress: publicKey },
      create: { stellarAddress: publicKey },
      update: {},
      include: { did: true },
    });

    const payload: JwtPayload = { sub: user.id, address: publicKey, role: user.role };
    const accessToken = this.jwtService.sign(payload);

    const refreshToken = randomUUID();
    await this.redis.setex(
      this.refreshKey(refreshToken),
      REFRESH_TTL_SECONDS,
      user.id,
    );

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        stellarAddress: user.stellarAddress,
        role: user.role,
        createdAt: user.createdAt.toISOString(),
        hasDID: !!(user as typeof user & { did: unknown | null }).did,
      },
    };
  }

  private nonceKey(nonce: string): string {
    return `auth:nonce:${nonce}`;
  }

  private refreshKey(token: string): string {
    return `auth:refresh:${token}`;
  }

  /**
   * Derive a stable nonce identifier from the signed XDR for replay protection.
   * Uses SHA-256 of the XDR string — unique per challenge since the server
   * embeds random bytes in the manage-data value.
   */
  private extractNonceFromXDR(signedXDR: string): string | null {
    try {
      return createHash("sha256").update(signedXDR).digest("hex");
    } catch {
      return null;
    }
  }
}
