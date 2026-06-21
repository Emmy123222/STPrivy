// Domain event names as constants to avoid magic strings
export const DOMAIN_EVENTS = {
  CREDENTIAL_ISSUED: 'CredentialIssued',
  CREDENTIAL_REVOKED: 'CredentialRevoked',
  PROOF_GENERATED: 'ProofGenerated',
  PROOF_VERIFIED: 'ProofVerified',
  VERIFICATION_COMPLETED: 'VerificationCompleted',
  JOB_FAILED: 'JobFailed',
} as const;

export type DomainEventName = (typeof DOMAIN_EVENTS)[keyof typeof DOMAIN_EVENTS];

export interface DomainEvent {
  name: DomainEventName;
  actorDID: string;
  subjectDID?: string;
  resourceId: string;
  timestamp: Date;
  metadata: Record<string, unknown>;
}
