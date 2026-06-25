import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SorobanService } from '../soroban/soroban.service';
import { nativeToScVal } from '@stellar/stellar-sdk';

@Injectable()
export class IssuerService {
  private readonly logger = new Logger(IssuerService.name);

  constructor(
    private readonly sorobanService: SorobanService,
    private readonly config: ConfigService,
  ) {}

  /** Returns true if the given Stellar address is an active issuer on-chain. */
  async isRegistered(stellarAddress: string): Promise<boolean> {
    try {
      const result = await this.sorobanService.simulateContract(
        'issuer-registry',
        'is_issuer',
        [nativeToScVal(stellarAddress, { type: 'address' })],
      );
      const returnVal = result.result?.retval;
      if (!returnVal) return false;
      return returnVal.switch().name === 'scvBool' && returnVal.b();
    } catch (err) {
      this.logger.error(
        `isRegistered check failed for ${stellarAddress}: ${(err as Error).message}`,
      );
      return false;
    }
  }

  /** Register a new issuer address in the on-chain issuer-registry. */
  async addIssuer(stellarAddress: string, name: string): Promise<void> {
    const adminSecret = this.config.get<string>('STELLAR_SERVER_SECRET')!;
    await this.sorobanService.invokeContract(
      'issuer-registry',
      'add_issuer',
      [
        nativeToScVal(stellarAddress, { type: 'address' }),
        nativeToScVal(name, { type: 'string' }),
      ],
      adminSecret,
    );
    this.logger.log(`add_issuer on-chain: ${stellarAddress}`);
  }

  /** Deactivate an issuer in the on-chain issuer-registry (best-effort). */
  async removeIssuer(stellarAddress: string): Promise<void> {
    const adminSecret = this.config.get<string>('STELLAR_SERVER_SECRET')!;
    try {
      await this.sorobanService.invokeContract(
        'issuer-registry',
        'remove_issuer',
        [nativeToScVal(stellarAddress, { type: 'address' })],
        adminSecret,
      );
      this.logger.log(`remove_issuer on-chain: ${stellarAddress}`);
    } catch (err) {
      this.logger.error(
        `remove_issuer on-chain failed for ${stellarAddress}: ${(err as Error).message}`,
      );
    }
  }
}
