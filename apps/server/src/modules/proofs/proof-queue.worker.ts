import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DOMAIN_EVENTS } from '../../events/domain-events';
import { ProofStatus, Prisma } from '@prisma/client';
import { writeFileSync, existsSync, rmSync, mkdtempSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface ProofJobData {
  proofId: string;
  subjectDID: string;
  credentialId: string;
  circuitId: string;
  claims: Record<string, unknown>;
}

// Valid circuit IDs — also used to validate filesystem paths.
const KNOWN_CIRCUITS = new Set([
  'age-proof',
  'residency-proof',
  'accredited-investor',
  'sanctions-check',
]);

/**
 * Circom circuit file names (without extension) match the directory name
 * using camelCase inside the src/ folder.
 */
const CIRCUIT_FILE: Record<string, string> = {
  'age-proof': 'main',
  'residency-proof': 'main',
  'accredited-investor': 'main',
  'sanctions-check': 'main',
};

@Processor('proof-generation', { concurrency: 4 })
export class ProofGenerationWorker extends WorkerHost {
  private readonly logger = new Logger(ProofGenerationWorker.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
  ) {
    super();
  }

  async process(job: Job<ProofJobData>): Promise<void> {
    const { proofId, subjectDID, credentialId, circuitId, claims } = job.data;

    this.logger.log(`Processing proof job ${proofId} for circuit ${circuitId}`);

    if (!KNOWN_CIRCUITS.has(circuitId)) {
      await this.failProof(proofId);
      throw new Error(`Unknown circuit type: ${circuitId}`);
    }

    let workDir: string | undefined;

    try {
      await this.prisma.zKProof.update({
        where: { id: proofId },
        data: { status: ProofStatus.GENERATING },
      });

      const circuitsBase = join(process.cwd(), '../../circuits');
      const circuitDir = join(circuitsBase, circuitId);
      if (!existsSync(circuitDir)) {
        throw new Error(`Circuit directory not found: ${circuitId}`);
      }

      // Isolated working directory so concurrent jobs don't clobber each other
      workDir = mkdtempSync(join(tmpdir(), `proof-${circuitId}-`));

      const circomFile = join(circuitDir, 'src', `${CIRCUIT_FILE[circuitId]}.circom`);
      const ptauFile = join(circuitsBase, 'pot12_final.ptau');
      const zkeyFile = join(circuitDir, 'target', `${circuitId}.zkey`);
      const vkeyFile = join(circuitDir, 'target', 'verification_key.json');

      // ── Step 1: Compile circuit (if not already compiled) ──────────────────
      const r1csFile = join(circuitDir, 'target', 'main.r1cs');
      const wasmFile = join(circuitDir, 'target', 'main_js', 'main.wasm');

      if (!existsSync(r1csFile) || !existsSync(wasmFile)) {
        this.logger.log(`Compiling ${circuitId}`);
        await execAsync(
          `circom ${circomFile} --r1cs --wasm --output ${join(circuitDir, 'target')}`,
        );
      }

      // ── Step 2: Trusted setup (if .zkey not present) ───────────────────────
      if (!existsSync(zkeyFile)) {
        if (!existsSync(ptauFile)) {
          throw new Error(
            `Powers of Tau file not found at ${ptauFile}. ` +
            `Download it: https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_12.ptau`,
          );
        }
        this.logger.log(`Running trusted setup for ${circuitId}`);
        const zkey0 = join(workDir, 'circuit_0000.zkey');
        await execAsync(
          `snarkjs groth16 setup ${r1csFile} ${ptauFile} ${zkey0}`,
        );
        await execAsync(
          `snarkjs zkey contribute ${zkey0} ${zkeyFile} --name="initial" -v -e="entropy"`,
        );
        await execAsync(`snarkjs zkey export verificationkey ${zkeyFile} ${vkeyFile}`);
      }

      // ── Step 3: Write witness input ────────────────────────────────────────
      const inputPath = join(workDir, 'input.json');
      const inputData = this.buildInput(circuitId, claims);
      writeFileSync(inputPath, JSON.stringify(inputData));

      // ── Step 4: Generate witness ───────────────────────────────────────────
      const witnessPath = join(workDir, 'witness.wtns');
      this.logger.log(`Generating witness for ${circuitId} (job ${proofId})`);
      await execAsync(
        `node ${join(circuitDir, 'target', 'main_js', 'generate_witness.js')} ` +
        `${wasmFile} ${inputPath} ${witnessPath}`,
      );

      // ── Step 5: Generate Groth16 proof ─────────────────────────────────────
      const proofJsonPath = join(workDir, 'proof.json');
      const publicJsonPath = join(workDir, 'public.json');
      this.logger.log(`Generating Groth16 proof for ${circuitId} (job ${proofId})`);
      await execAsync(
        `snarkjs groth16 prove ${zkeyFile} ${witnessPath} ${proofJsonPath} ${publicJsonPath}`,
      );

      // ── Step 6: Read and store artifacts ───────────────────────────────────
      const { readFileSync } = await import('fs');
      const proofJson = JSON.parse(readFileSync(proofJsonPath, 'utf8'));
      const publicJson = JSON.parse(readFileSync(publicJsonPath, 'utf8'));

      await this.prisma.zKProof.update({
        where: { id: proofId },
        data: {
          status: ProofStatus.COMPLETED,
          artifact: {
            proof: proofJson,
            publicInputs: publicJson,
            circuitId,
          } as unknown as Prisma.InputJsonValue,
          generatedAt: new Date(),
        },
      });

      this.events.emit(DOMAIN_EVENTS.PROOF_GENERATED, {
        name: DOMAIN_EVENTS.PROOF_GENERATED,
        actorDID: subjectDID,
        subjectDID,
        resourceId: proofId,
        timestamp: new Date(),
        metadata: { circuitId, credentialId },
      });

      this.logger.log(`Proof ${proofId} generated (circuit: ${circuitId})`);
    } catch (error) {
      this.logger.error(`Proof generation failed for ${proofId}: ${(error as Error).message}`);
      await this.failProof(proofId);
      throw error;
    } finally {
      if (workDir && existsSync(workDir)) {
        rmSync(workDir, { recursive: true, force: true });
      }
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job<ProofJobData>) {
    this.logger.log(`Job ${job.id} completed`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<ProofJobData>, error: Error) {
    this.logger.error(`Job ${job.id} failed: ${error.message}`);
  }

  // ── Input builders ──────────────────────────────────────────────────────────

  /**
   * Map credential claims to the circuit's input.json format.
   * All signal values must be strings (snarkjs requirement for large integers).
   */
  private buildInput(circuitId: string, claims: Record<string, unknown>): Record<string, unknown> {
    switch (circuitId) {
      case 'age-proof': {
        const age = this.requireInt(claims.age, 'age', 0, 150);
        return { age: String(age), threshold: '18' };
      }

      case 'residency-proof': {
        const country = this.requireString(claims.country, 'country');
        const code = this.encodeCountry(country);
        // Allowed countries: US, GB, CA, AU, DE, FR, JP, SG, CH, NL
        const allowed = ['US','GB','CA','AU','DE','FR','JP','SG','CH','NL']
          .map(c => String(this.encodeCountry(c)));
        return {
          country_code: String(code),
          allowed_countries: allowed,
          allowed_count: '10',
        };
      }

      case 'accredited-investor': {
        const accredited = this.requireBoolean(claims.accredited, 'accredited');
        const age = this.requireInt(claims.age, 'age', 0, 150);
        return { accredited: accredited ? '1' : '0', age: String(age) };
      }

      case 'sanctions-check': {
        const hash = this.computeSanctionsHash(claims);
        return {
          sanctions_hash: String(hash),
          clean_list_commitment: '0',
        };
      }

      default:
        throw new Error(`Unknown circuit: ${circuitId}`);
    }
  }

  private requireInt(value: unknown, field: string, min: number, max: number): number {
    const num = typeof value === 'number' ? value : NaN;
    if (!Number.isInteger(num) || num < min || num > max) {
      throw new Error(`Invalid claim "${field}": expected integer in [${min}, ${max}]`);
    }
    return num;
  }

  private requireBoolean(value: unknown, field: string): boolean {
    if (typeof value !== 'boolean') {
      throw new Error(`Invalid claim "${field}": expected boolean`);
    }
    return value;
  }

  private requireString(value: unknown, field: string): string {
    if (typeof value !== 'string' || value.length === 0) {
      throw new Error(`Invalid claim "${field}": expected non-empty string`);
    }
    return value;
  }

  /**
   * Encode a 2-letter ISO country code as a single field element.
   * Uses: code = charCode[0] * 256 + charCode[1]
   */
  private encodeCountry(code: string): number {
    const upper = code.toUpperCase();
    if (!/^[A-Z]{2}$/.test(upper)) {
      throw new Error(`Invalid country code: ${code}`);
    }
    return upper.charCodeAt(0) * 256 + upper.charCodeAt(1);
  }

  private computeSanctionsHash(claims: Record<string, unknown>): number {
    const data = JSON.stringify(claims);
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    // Ensure non-zero and non-equal to commitment (0)
    return hash === 0 ? 1 : Math.abs(hash);
  }

  private async failProof(proofId: string) {
    await this.prisma.zKProof.update({
      where: { id: proofId },
      data: { status: ProofStatus.FAILED },
    });
  }
}
