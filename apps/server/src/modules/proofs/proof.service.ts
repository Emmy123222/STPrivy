import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { PrismaService } from "../../prisma/prisma.service";
import { SorobanService } from "../soroban/soroban.service";
import { DOMAIN_EVENTS } from "../../events/domain-events";
import { ProofStatus, Prisma } from "@prisma/client";
import { nativeToScVal, xdr } from "@stellar/stellar-sdk";

@Injectable()
export class ProofService {
  private readonly logger = new Logger(ProofService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly soroban: SorobanService,
    private readonly events: EventEmitter2,
    @InjectQueue("proof-generation") private readonly proofQueue: Queue,
  ) {}

  async listBySubject(subjectDID: string) {
    return this.prisma.zKProof.findMany({
      where: { subjectDID },
      orderBy: { generatedAt: "desc" },
    });
  }

  async listVerifications(verifierDID: string) {
    return this.prisma.proofVerification.findMany({
      where: { verifierDID },
      orderBy: { verifiedAt: "desc" },
    });
  }

  async generateProof(
    subjectDID: string,
    credentialId: string,
    circuitId: string,
  ) {
    const credential = await this.prisma.credential.findUnique({
      where: { id: credentialId },
    });
    if (!credential) throw new NotFoundException("Credential not found");
    if (credential.subjectDID !== subjectDID)
      throw new ForbiddenException("Credential does not belong to you");
    if (credential.status !== "ACTIVE")
      throw new BadRequestException("Credential is not active");

    const proof = await this.prisma.zKProof.create({
      data: {
        subjectDID,
        credentialId,
        circuitId,
        status: ProofStatus.PENDING,
      },
    });

    await this.proofQueue.add("generate-proof", {
      proofId: proof.id,
      subjectDID,
      credentialId,
      circuitId,
      claims: credential.claims as Record<string, unknown>,
    });

    this.logger.log(`Proof generation enqueued: ${proof.id} (${circuitId})`);
    return proof;
  }

  async verifyProof(proofId: string, verifierDID: string) {
    const proof = await this.prisma.zKProof.findUnique({
      where: { id: proofId },
    });
    if (!proof) throw new NotFoundException("Proof not found");
    if (proof.status !== ProofStatus.COMPLETED)
      throw new BadRequestException(
        `Proof not ready (status: ${proof.status})`,
      );

    const artifact = proof.artifact as Record<string, unknown> | null;
    const valid = !!(artifact?.proof && artifact?.publicInputs);

    let onChainTxHash: string | null = null;

    if (valid && artifact) {
      try {
        // Encode Groth16 proof and public inputs into Soroban byte format.
        const proofBytes = this.encodeGroth16Proof(
          artifact.proof as Record<string, string[]>,
        );
        const publicScalars = this.encodePublicInputs(
          artifact.publicInputs as string[],
        );

        // Build ScVal args: circuit_id (string), proof (bytes), public_inputs (vec<bytes>)
        const publicInputsScVal = xdr.ScVal.scvVec(
          publicScalars.map((b) => nativeToScVal(b, { type: "bytes" })),
        );

        const result = await this.soroban.invokeContract(
          "kyc-registry",
          "verify_proof",
          [
            nativeToScVal(proof.circuitId, { type: "string" }),
            nativeToScVal(proofBytes, { type: "bytes" }),
            publicInputsScVal,
          ],
          process.env.STELLAR_SERVER_SECRET!,
        );
        onChainTxHash = result.txHash;
      } catch (err) {
        this.logger.warn(
          `On-chain verification skipped: ${(err as Error).message}`,
        );
      }
    }

    const verification = await this.prisma.proofVerification.create({
      data: {
        proofId,
        verifierDID,
        result: valid,
        onChainTxHash,
        metadata: (artifact ??
          Prisma.JsonNull) as unknown as Prisma.InputJsonValue,
      },
    });

    this.events.emit(DOMAIN_EVENTS.PROOF_VERIFIED, {
      name: DOMAIN_EVENTS.PROOF_VERIFIED,
      actorDID: verifierDID,
      subjectDID: proof.subjectDID,
      resourceId: proofId,
      timestamp: new Date(),
      metadata: { valid, onChainTxHash },
    });

    return verification;
  }

  /**
   * Encode a snarkjs proof.json into the flat binary format expected by the
   * Soroban Groth16 verifier contract:
   *   pi_a  (G1, 96 bytes) || pi_b (G2, 192 bytes) || pi_c (G1, 96 bytes)
   *
   * snarkjs outputs points as arrays of hex strings (decimal for BN254,
   * or hex for BLS12-381). We pad each coordinate to the required byte width.
   */
  private encodeGroth16Proof(proof: Record<string, string[]>): Buffer {
    const g1 = (pt: string[]) => {
      const buf = Buffer.alloc(96);
      Buffer.from(BigInt(pt[0]).toString(16).padStart(96, "0"), "hex").copy(
        buf,
        0,
      );
      Buffer.from(BigInt(pt[1]).toString(16).padStart(96, "0"), "hex").copy(
        buf,
        48,
      );
      return buf;
    };
    const g2 = (pt: string[][]) => {
      const buf = Buffer.alloc(192);
      // BLS12-381 G2 point: x = [x0, x1], y = [y0, y1], each 48 bytes
      const coords = [pt[0][0], pt[0][1], pt[1][0], pt[1][1]];
      coords.forEach((c, i) => {
        Buffer.from(BigInt(c).toString(16).padStart(96, "0"), "hex").copy(
          buf,
          i * 48,
        );
      });
      return buf;
    };

    const pi_a = g1(proof.pi_a as string[]);
    const pi_b = g2(proof.pi_b as unknown as string[][]);
    const pi_c = g1(proof.pi_c as string[]);
    return Buffer.concat([pi_a, pi_b, pi_c]);
  }

  /**
   * Encode public inputs (array of decimal strings) into a list of 32-byte
   * big-endian buffers — one per public signal.
   */
  private encodePublicInputs(publicInputs: string[]): Buffer[] {
    return publicInputs.map((v) => {
      const buf = Buffer.alloc(32);
      const hex = BigInt(v).toString(16).padStart(64, "0");
      Buffer.from(hex, "hex").copy(buf);
      return buf;
    });
  }
}
