import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { Keypair } from '@stellar/stellar-sdk';
import { PrismaService } from '../../prisma/prisma.service';

export interface DIDDocument {
  '@context': string[];
  id: string;
  verificationMethod: VerificationMethod[];
  authentication: string[];
  assertionMethod: string[];
}

interface VerificationMethod {
  id: string;
  type: string;
  controller: string;
  publicKeyMultibase: string;
}

@Injectable()
export class DIDService {
  constructor(private readonly prisma: PrismaService) {}

  async createDID(userId: string, stellarAddress: string): Promise<DIDDocument> {
    const existing = await this.prisma.dID.findUnique({ where: { userId } });
    if (existing) {
      throw new ConflictException('DID already exists for this user');
    }

    const did = `did:stellar:${stellarAddress}`;
    const document = this.buildDIDDocument(did, stellarAddress);

    await this.prisma.dID.create({
      data: { id: did, userId, document: document as object },
    });

    return document;
  }

  async resolveDID(stellarAddress: string): Promise<DIDDocument> {
    const did = `did:stellar:${stellarAddress}`;
    const record = await this.prisma.dID.findUnique({ where: { id: did } });
    if (!record) {
      throw new NotFoundException(`DID not found: ${did}`);
    }
    return record.document as unknown as DIDDocument;
  }

  private buildDIDDocument(did: string, stellarAddress: string): DIDDocument {
    const keyId = `${did}#key-1`;
    const rawKey = Keypair.fromPublicKey(stellarAddress).rawPublicKey();
    // multibase base64url encoding — 'u' prefix per the multibase spec
    const publicKeyMultibase = `u${Buffer.from(rawKey).toString('base64url')}`;

    return {
      '@context': [
        'https://www.w3.org/ns/did/v1',
        'https://w3id.org/security/suites/ed25519-2020/v1',
      ],
      id: did,
      verificationMethod: [
        {
          id: keyId,
          type: 'Ed25519VerificationKey2020',
          controller: did,
          publicKeyMultibase,
        },
      ],
      authentication: [keyId],
      assertionMethod: [keyId],
    };
  }
}
