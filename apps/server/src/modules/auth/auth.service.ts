import { Injectable, Inject, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import {
  Keypair,
  Networks,
  TransactionBuilder,
  Transaction,
  Account,
  Operation,
} from '@stellar/stellar-sdk';
import type Redis from 'ioredis';
import { PrismaService } from '../../prisma/prisma.service';
import { REDIS_CLIENT } from '../redis/redis.module';
import { LoginDto } from './dto/login.dto';

const NONCE_TTL_SECONDS = 300; // 5 minutes
const NONCE_PREFIX = 'auth:challenge:';

@Injectable()
export class AuthService {
  private readonly networkPassphrase: string;

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {
    const net = this.config.get<string>('STELLAR_NETWORK', 'testnet');
    this.networkPassphrase =
      net === 'mainnet' ? Networks.PUBLIC : Networks.TESTNET;
  }

  // ── Step 1: issue a challenge transaction the wallet signs ────────────────
  async generateChallenge(
    address: string,
  ): Promise<{ nonce: string; xdr: string }> {
    const nonce = `zkkyc:${randomBytes(16).toString('hex')}`;
    const xdr = this.buildChallengeXdr(address, nonce);

    // Store both so login can re-build the hash without relying on timestamps
    await this.redis.set(
      `${NONCE_PREFIX}${address}`,
      JSON.stringify({ nonce, xdr }),
      'EX',
      NONCE_TTL_SECONDS,
    );

    return { nonce, xdr };
  }

  // ── Step 2: verify the signed transaction and issue a JWT ─────────────────
  async login(dto: LoginDto): Promise<{ accessToken: string; user: object }> {
    const { address, nonce, signedXdr } = dto;

    const stored = await this.redis.get(`${NONCE_PREFIX}${address}`);
    if (!stored) throw new UnauthorizedException('Challenge expired or not found');

    const { nonce: storedNonce, xdr: challengeXdr } = JSON.parse(stored) as {
      nonce: string;
      xdr: string;
    };

    if (storedNonce !== nonce) {
      throw new UnauthorizedException('Invalid nonce');
    }

    // Single-use — delete immediately
    await this.redis.del(`${NONCE_PREFIX}${address}`);

    if (!this.verifyChallengeXdr(address, challengeXdr, signedXdr)) {
      throw new UnauthorizedException('Signature verification failed');
    }

    const user = await this.findOrCreateUser(address);
    const hasDID = await this.prisma.dID.findUnique({ where: { userId: user.id } });

    const payload = { sub: user.id, address: user.stellarAddress, role: user.role };
    const accessToken = await this.jwtService.signAsync(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        stellarAddress: user.stellarAddress,
        role: user.role,
        createdAt: user.createdAt,
        hasDID: !!hasDID,
      },
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  private buildChallengeXdr(address: string, nonce: string): string {
    // Source is the user's account with sequence 0 — this tx is never submitted
    const account = new Account(address, '0');
    const tx = new TransactionBuilder(account, {
      fee: '100',
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(
        Operation.manageData({
          name: 'zkkyc_auth',
          value: Buffer.from(nonce, 'utf8'),
        }),
      )
      .setTimeout(300)
      .build();
    return tx.toXDR();
  }

  private verifyChallengeXdr(
    address: string,
    challengeXdr: string,
    signedXdr: string,
  ): boolean {
    try {
      const challenge = new Transaction(challengeXdr, this.networkPassphrase);
      const signed = new Transaction(signedXdr, this.networkPassphrase);

      // The hash the wallet signed is the challenge transaction's hash
      const txHash = challenge.hash();
      const keypair = Keypair.fromPublicKey(address);
      const hint = keypair.signatureHint();

      for (const ds of signed.signatures) {
        if (ds.hint().equals(hint)) {
          return keypair.verify(txHash, ds.signature());
        }
      }
      return false;
    } catch (e) {
      console.error('[auth] verifyChallengeXdr error:', e);
      return false;
    }
  }

  private async findOrCreateUser(address: string) {
    const existing = await this.prisma.user.findUnique({
      where: { stellarAddress: address },
    });
    if (existing) return existing;
    return this.prisma.user.create({ data: { stellarAddress: address } });
  }
}
