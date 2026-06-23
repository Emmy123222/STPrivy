export type Role = 'SUBJECT' | 'ISSUER' | 'ADMIN';

export interface AuthUser {
  id: string;
  stellarAddress: string;
  role: Role;
  createdAt: string;
  hasDID: boolean;
}

export interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}

export interface DIDDocument {
  '@context': string[];
  id: string;
  verificationMethod: Array<{
    id: string;
    type: string;
    controller: string;
    publicKeyMultibase: string;
  }>;
  authentication: string[];
  assertionMethod: string[];
}

export type CredentialStatus = 'ACTIVE' | 'REVOKED' | 'EXPIRED';

export interface Credential {
  id: string;
  issuerId: string;
  issuer?: Issuer;
  subjectDID: string;
  type: string[];
  claims: Record<string, unknown>;
  credentialHash: string;
  issuedAt: string;
  expiresAt: string | null;
  status: CredentialStatus;
  onChainTxHash: string | null;
}

export type ProofStatus = 'PENDING' | 'GENERATING' | 'COMPLETED' | 'FAILED';

export type CircuitId =
  | 'age-proof'
  | 'residency-proof'
  | 'accredited-investor'
  | 'sanctions-check';

export interface ZKProof {
  id: string;
  subjectDID: string;
  credentialId: string;
  circuitId: CircuitId;
  artifact: Record<string, unknown> | null;
  generatedAt: string | null;
  status: ProofStatus;
}

export interface ProofVerification {
  id: string;
  proofId: string;
  verifierDID: string;
  result: boolean;
  verifiedAt: string;
  onChainTxHash: string | null;
}

export interface Issuer {
  id: string;
  did: string;
  stellarAddress: string;
  name: string;
  createdAt: string;
  active: boolean;
  credentialCount?: number;
  onChainTxHash: string | null;
}

export interface AuditLog {
  id: string;
  action: string;
  actorDID: string;
  targetId: string | null;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface PlatformStats {
  totalUsers: number;
  totalCredentials: number;
  totalProofs: number;
  totalIssuers: number;
  activeIssuers: number;
  activeCredentials: number;
  revokedCredentials: number;
}
