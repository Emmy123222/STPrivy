# Requirements Document

## Introduction

zkKYC is a privacy-preserving compliance infrastructure platform built on the Stellar network. It enables users to prove regulatory compliance (age, nationality, accreditation status, sanctions screening) to verifiers without revealing their underlying personal data. The system issues W3C Verifiable Credentials (VCs) from authorized KYC providers, generates ZK proofs using Noir circuits, anchors issuer/credential registries on Soroban smart contracts, and provides a full audit trail — all while keeping PII off-chain.

The V1 architecture is a NestJS modular monolith (`apps/server/`) backed by PostgreSQL (Prisma ORM), Redis, and BullMQ, fronted by a Next.js web application (`apps/web/`), with Soroban smart contracts written in Rust (`contracts/`) and Noir ZK circuits (`circuits/`).

---

## Glossary

- **DID**: Decentralized Identifier — a globally unique, self-sovereign identifier anchored to a Stellar account (e.g., `did:stellar:<public_key>`).
- **VC**: Verifiable Credential — a W3C-standard credential attesting to a subject's KYC attributes (country, age, accredited status).
- **ZK Proof**: Zero-Knowledge Proof — a cryptographic proof that a claim is true without revealing the underlying data.
- **Noir Circuit**: An arithmetic circuit written in the Noir language that encodes ZK proof logic.
- **Witness**: Private inputs (credential claims) fed into a Noir circuit to produce a proof.
- **Public Inputs**: Values revealed as part of the ZK proof, visible to verifiers (e.g., `age_over_18: true`).
- **Issuer**: A trusted KYC provider authorized in the Soroban Issuer Registry to issue VCs to subjects.
- **Subject**: A user who holds VCs and generates ZK proofs to prove compliance.
- **Verifier**: A DeFi protocol, RWA platform, or dApp that requests and evaluates ZK proofs.
- **Credential Hash**: A one-way hash of a credential's contents stored on-chain; no PII is stored on Stellar.
- **Soroban**: The smart contract platform on Stellar, contracts written in Rust.
- **Stellar Account**: A keypair-based account on the Stellar network identified by a public key (G…).
- **Freighter**: A Stellar browser wallet extension used for transaction signing.
- **LOBSTR / xBull**: Alternative Stellar wallet integrations.
- **SEP-10**: Stellar's wallet authentication standard — a challenge/response protocol using the Stellar SDK.
- **Horizon**: Stellar's REST API server for submitting transactions and querying chain state.
- **Soroban RPC**: The RPC endpoint for interacting with Soroban smart contracts.
- **Issuer Registry Contract**: Soroban contract maintaining the set of trusted KYC issuer addresses.
- **Credential Registry Contract**: Soroban contract storing credential hashes (no PII).
- **Revocation Registry Contract**: Soroban contract tracking revoked credential IDs.
- **Proof Verifier Contract**: Soroban contract that accepts and validates ZK proof submissions.
- **Audit Log**: An immutable, append-only record of system events for compliance purposes.
- **Session**: A JWT-based authenticated session created after successful SEP-10 wallet authentication.
- **Domain Event**: An internal NestJS event signaling a state change (e.g., `CredentialIssued`).
- **System**: The zkKYC NestJS server application.
- **Auth_Module**: The subsystem handling SEP-10 wallet authentication and JWT sessions.
- **DID_Module**: The subsystem responsible for DID creation and resolution for Stellar accounts.
- **Credential_Module**: The subsystem responsible for issuing, storing, and verifying W3C VCs.
- **Proof_Module**: The subsystem responsible for Noir ZK proof generation and verification.
- **Verification_Module**: The subsystem performing compliance policy evaluation against proof outputs.
- **Revocation_Module**: The subsystem managing credential revocation.
- **Stellar_Module**: The subsystem handling Stellar account management, Horizon integration, and transaction building.
- **Soroban_Module**: The subsystem handling Soroban contract deployment, invocation, and event indexing.
- **Audit_Module**: The subsystem consuming domain events and writing audit log entries.

---

## Requirements

### Requirement 1: Stellar Wallet Authentication (SEP-10)

**User Story:** As a user, I want to authenticate with my Stellar wallet (Freighter, LOBSTR, or xBull) using the SEP-10 challenge/response protocol, so that I can access the zkKYC system without a password.

#### Acceptance Criteria

1. WHEN a client calls `GET /auth/challenge` with a Stellar public key, THE Auth_Module SHALL generate a SEP-10 challenge transaction, return it as a base64-encoded XDR string, and store the associated nonce with a short TTL.
2. WHEN a client submits a signed SEP-10 challenge transaction to `POST /auth/login`, THE Auth_Module SHALL verify the transaction signatures against the provided Stellar public key and return a signed JWT access token and a refresh token.
3. WHEN a client submits an invalid, expired, or tampered SEP-10 challenge transaction, THE Auth_Module SHALL reject the request and return a 401 Unauthorized response.
4. WHEN a client submits a valid refresh token to `POST /auth/refresh`, THE Auth_Module SHALL issue a new JWT access token with a refreshed expiry.
5. WHEN a client submits an expired or revoked refresh token to `POST /auth/refresh`, THE Auth_Module SHALL return a 401 Unauthorized response.
6. WHEN a client calls `POST /auth/logout`, THE Auth_Module SHALL invalidate the current session tokens and prevent their further use.
7. THE Auth_Module SHALL enforce JWT expiry on all protected endpoints and return 401 for expired tokens.
8. IF a SEP-10 challenge nonce has already been used, THEN THE Auth_Module SHALL reject the request and return a 401 Unauthorized response to prevent replay attacks.

---

### Requirement 2: Decentralized Identifier (DID) Management

**User Story:** As a user, I want a DID created for my Stellar account, so that I have a self-sovereign identity to attach credentials to.

#### Acceptance Criteria

1. WHEN an authenticated user calls `POST /did/create`, THE DID_Module SHALL generate a DID using the `did:stellar` method derived from the user's Stellar public key, store it linked to the user's account, and return the DID document.
2. WHEN a DID already exists for a Stellar account and the user calls `POST /did/create`, THE DID_Module SHALL return the existing DID document rather than creating a duplicate.
3. WHEN a caller requests `GET /did/:id` with a valid DID, THE DID_Module SHALL resolve and return the DID document.
4. WHEN a caller requests `GET /did/:id` with an unknown DID, THE DID_Module SHALL return a 404 Not Found response.
5. THE DID_Module SHALL store each DID linked to exactly one Stellar account address in the database.

---

### Requirement 3: Verifiable Credential Issuance

**User Story:** As an authorized KYC issuer, I want to issue Verifiable Credentials attesting to a subject's KYC attributes, so that subjects can later prove compliance without re-sharing their data.

#### Acceptance Criteria

1. WHEN an authorized issuer calls `POST /credentials` with a valid subject DID and KYC claims (`country`, `age`, `accredited`), THE Credential_Module SHALL create a W3C-compliant VC, sign it with the issuer's key, persist the credential metadata, and return the VC.
2. WHEN a credential is issued, THE Credential_Module SHALL compute the credential hash and submit it to the Soroban Credential Registry Contract via the Soroban_Module.
3. WHEN a caller attempts to issue a credential with an unregistered or inactive issuer DID, THE Credential_Module SHALL reject the request with a 403 Forbidden response.
4. WHEN a caller requests `GET /credentials/:id` for a credential they are authorized to view, THE Credential_Module SHALL return the full VC.
5. WHEN a caller requests `GET /credentials/:id` for a non-existent credential, THE Credential_Module SHALL return a 404 Not Found response.
6. WHEN a credential is issued, THE Credential_Module SHALL emit a `CredentialIssued` domain event.
7. THE Credential_Module SHALL store credential metadata (id, issuer DID, subject DID, type, issued-at, expires-at, status, on-chain tx hash) in the database.
8. THE Credential_Module SHALL never store raw PII (passport number, full name, address) in the database — only structured claims (`country`, `age`, `accredited`) and the credential hash.

---

### Requirement 4: Verifiable Credential Verification

**User Story:** As a verifier, I want to verify the authenticity of a Verifiable Credential, so that I can confirm it was issued by a trusted issuer and has not been tampered with.

#### Acceptance Criteria

1. WHEN a caller submits a VC to `POST /credentials/verify`, THE Credential_Module SHALL verify the issuer's cryptographic signature and return a verification result indicating valid or invalid.
2. WHEN a submitted VC has been revoked, THE Credential_Module SHALL return a verification result indicating the credential is revoked.
3. WHEN a submitted VC has an expired `expirationDate`, THE Credential_Module SHALL return a verification result indicating the credential is expired.
4. WHEN a submitted VC has claims that do not match the issuer signature, THE Credential_Module SHALL return a verification result indicating invalid signature.

---

### Requirement 5: ZK Proof Generation

**User Story:** As a subject, I want to generate a ZK proof from my credential attributes, so that I can prove compliance (e.g., age ≥ 18, country == "US") without revealing my underlying credential data.

#### Acceptance Criteria

1. WHEN an authenticated subject calls `POST /proofs/generate` with a credential ID and circuit parameters, THE Proof_Module SHALL enqueue a proof generation job and return a job ID immediately.
2. WHEN the proof generation job runs, THE Proof_Module SHALL compile the specified Noir circuit, generate a witness from the credential's private claims, produce a ZK proof using Barretenberg, persist proof metadata, and emit a `ProofGenerated` domain event.
3. WHEN a credential referenced in a proof generation request does not belong to the requesting subject, THE Proof_Module SHALL return a 403 Forbidden response.
4. WHEN a credential referenced in proof generation is revoked or expired, THE Proof_Module SHALL return a 422 Unprocessable Entity response.
5. THE Proof_Module SHALL support the following Noir circuit types: `age-proof`, `residency-proof`, `accredited-investor`, `sanctions-check`.
6. THE Proof_Module SHALL store proof metadata (id, subject DID, credential ID, circuit ID, generated-at, status) in the database.

---

### Requirement 6: ZK Proof Verification

**User Story:** As a verifier, I want to verify a ZK proof on-chain via the Soroban Proof Verifier Contract, so that I get a tamper-proof, on-chain verification result.

#### Acceptance Criteria

1. WHEN a caller submits a proof artifact and public inputs to `POST /proofs/verify`, THE Proof_Module SHALL first verify the proof locally using Barretenberg and, if valid, submit it to the Soroban Proof Verifier Contract.
2. WHEN the Soroban Proof Verifier Contract returns `true`, THE Proof_Module SHALL return a verification result of `{ valid: true, txHash }`.
3. WHEN the proof is invalid locally or the Soroban contract returns `false`, THE Proof_Module SHALL return a verification result of `{ valid: false, reason }` without submitting to the contract if invalid locally.
4. WHEN a proof is successfully verified, THE Proof_Module SHALL emit a `ProofVerified` domain event.
5. THE Proof_Module SHALL persist proof verification results (proof ID, verified-at, result, verifier identity, on-chain tx hash) in the database.

---

### Requirement 7: Compliance Policy Evaluation

**User Story:** As a verifier, I want to evaluate a subject's ZK proof against a compliance policy, so that I can make an access control decision (allow/deny).

#### Acceptance Criteria

1. WHEN a verifier submits a ZK proof and a policy definition to `POST /verification/evaluate`, THE Verification_Module SHALL evaluate the proof's public outputs against all policy rules and return an access decision of `allow` or `deny`.
2. WHEN all policy rules are satisfied by the proof's public outputs, THE Verification_Module SHALL return an `allow` decision.
3. WHEN any policy rule is not satisfied, THE Verification_Module SHALL return a `deny` decision and include the list of failing rules.
4. WHEN a verification is completed, THE Verification_Module SHALL emit a `VerificationCompleted` domain event.
5. THE Verification_Module SHALL persist each verification result (subject DID, verifier ID, policy ID, decision, evaluated-at) in the database.

---

### Requirement 8: Credential Revocation

**User Story:** As an authorized issuer, I want to revoke credentials I have issued, so that compromised or outdated credentials can no longer be used.

#### Acceptance Criteria

1. WHEN an authorized issuer calls `POST /revocations` with a valid credential ID they issued, THE Revocation_Module SHALL mark the credential as revoked in the database, submit the revocation to the Soroban Revocation Registry Contract, and return a confirmation.
2. WHEN a caller attempts to revoke a credential issued by a different issuer, THE Revocation_Module SHALL return a 403 Forbidden response.
3. WHEN a caller requests `GET /revocations/:credentialId`, THE Revocation_Module SHALL return the revocation status and revocation timestamp if applicable.
4. WHEN a credential is revoked, THE Revocation_Module SHALL emit a `CredentialRevoked` domain event.
5. WHEN a revoked credential is used in proof generation or verification, THE System SHALL reject the operation with a 422 Unprocessable Entity response.

---

### Requirement 9: Issuer Registry Management

**User Story:** As a system administrator, I want to manage a registry of authorized KYC issuers on-chain, so that only trusted entities can issue credentials accepted by the system.

#### Acceptance Criteria

1. WHEN an admin registers an issuer via `POST /issuers`, THE Soroban_Module SHALL invoke `add_issuer` on the Issuer Registry Contract with the issuer's Stellar address and persist the issuer record in the database.
2. WHEN an admin removes an issuer via `DELETE /issuers/:id`, THE Soroban_Module SHALL invoke `remove_issuer` on the Issuer Registry Contract and set the issuer as inactive in the database.
3. WHEN the Credential_Module checks issuer authorization, THE System SHALL query the Issuer Registry Contract's `is_issuer` function to confirm the issuer is active on-chain.
4. WHEN an issuer DID is not present in the on-chain Issuer Registry, THE Credential_Module SHALL reject credential issuance requests with a 403 Forbidden response.

---

### Requirement 10: Stellar Account and Transaction Management

**User Story:** As a system operator, I want the platform to manage Stellar account interactions, so that on-chain operations are reliable and auditable.

#### Acceptance Criteria

1. THE Stellar_Module SHALL generate Stellar keypairs for system-managed accounts (e.g., issuer service accounts) using the Stellar SDK.
2. WHEN a transaction is submitted to Horizon, THE Stellar_Module SHALL sign it with the appropriate keypair and submit via the Horizon transactions endpoint.
3. IF a Horizon submission fails with a retryable error (network timeout, sequence number conflict), THEN THE Stellar_Module SHALL retry the submission with updated sequence number and exponential backoff, up to 5 attempts.
4. THE Stellar_Module SHALL expose methods to fetch account details, balances, and transaction history from Horizon.
5. WHEN a Stellar transaction is confirmed, THE Stellar_Module SHALL return the transaction hash and ledger sequence number.

---

### Requirement 11: Soroban Contract Interaction

**User Story:** As a system operator, I want the platform to reliably invoke Soroban smart contracts, so that on-chain state (issuer registry, credential hashes, revocations, proofs) is kept consistent with off-chain state.

#### Acceptance Criteria

1. THE Soroban_Module SHALL support contract invocation simulation via `simulateTransaction` before submitting to validate fee estimation and detect errors.
2. WHEN a Soroban contract function is invoked, THE Soroban_Module SHALL build the contract call transaction, simulate it, sign it, and submit it via Soroban RPC.
3. WHEN a contract invocation fails due to a Soroban RPC error, THE Soroban_Module SHALL retry with exponential backoff and log the failure.
4. THE Soroban_Module SHALL index Soroban contract events into the database, storing contract address, event type, and payload for each event.
5. WHEN the event indexer starts, THE Soroban_Module SHALL resume indexing from the last processed ledger sequence stored in Redis to avoid missing events.

---

### Requirement 12: Background Job Processing

**User Story:** As a system operator, I want long-running tasks (ZK proof generation, on-chain submissions) processed asynchronously, so that API responses remain fast.

#### Acceptance Criteria

1. WHEN a ZK proof generation request is accepted, THE System SHALL enqueue the task in BullMQ and return a job ID immediately.
2. WHEN a BullMQ job fails, THE System SHALL retry the job according to the configured retry policy and emit a failure event after exhausting retries.
3. WHEN a job completes, THE System SHALL update the corresponding proof record status in the database.
4. THE System SHALL expose `GET /proofs/jobs/:jobId` for clients to poll job status using the returned job ID.

---

### Requirement 13: Audit Logging

**User Story:** As a compliance officer, I want all significant system events recorded in an immutable audit log, so that I can demonstrate regulatory compliance.

#### Acceptance Criteria

1. WHEN the Audit_Module receives any of the domain events (`CredentialIssued`, `CredentialRevoked`, `ProofGenerated`, `ProofVerified`, `VerificationCompleted`), THE Audit_Module SHALL write an audit log entry containing event type, actor, subject, timestamp, and relevant metadata.
2. THE Audit_Module SHALL never delete or modify existing audit log entries.
3. WHEN an audit log entry is written, THE Audit_Module SHALL store it in the `audit_logs` database table with a unique entry ID and precise UTC timestamp.

---

### Requirement 14: Data Integrity and Persistence

**User Story:** As a developer, I want all system entities persisted in PostgreSQL via Prisma, so that data is durable and queryable with type safety.

#### Acceptance Criteria

1. THE System SHALL persist all entities (users, wallets, dids, issuers, credentials, proof_requests, proofs, verifications, revocations, audit_logs) in PostgreSQL using Prisma ORM.
2. WHEN a database write fails due to a constraint violation, THE System SHALL return a 409 Conflict or 422 Unprocessable Entity response as appropriate.
3. THE System SHALL use Prisma migrations to manage all schema changes in a version-controlled manner.
4. THE System SHALL define referential integrity constraints (foreign keys) between related entities.

---

### Requirement 15: API Security

**User Story:** As a system operator, I want all API endpoints protected by appropriate authentication and authorization, so that unauthorized access is prevented.

#### Acceptance Criteria

1. THE System SHALL protect all non-public endpoints with JWT authentication and return 401 for unauthenticated requests.
2. THE System SHALL enforce role-based access control (RBAC) with at minimum `subject`, `issuer`, and `admin` roles.
3. WHEN a user with insufficient role attempts an authorized action, THE System SHALL return a 403 Forbidden response.
4. THE System SHALL validate and sanitize all incoming request payloads using NestJS validation pipes and return 400 Bad Request for malformed inputs.
5. THE System SHALL apply rate limiting on authentication endpoints to mitigate brute-force attacks.
