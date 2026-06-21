# Implementation Plan: zkKYC on Stellar

## Overview

Incremental implementation of the zkKYC platform. Each task builds on the previous, wiring modules together progressively. Tasks are ordered so core infrastructure comes first, then domain modules, then on-chain integrations, then ZK proof machinery. Tasks marked `*` are optional and can be skipped for a faster MVP.

---

## Tasks

- [x] 1. Update project structure and shared infrastructure
  - Update `apps/server/prisma/schema.prisma` with the full schema: add `Wallet`, `SorobanEvent` models; add `stellarAddress` to `User`; add `credentialHash` and `onChainTxHash` fields to `Credential`; add `onChainTxHash` to `Revocation` and `ProofVerification`
  - Run `prisma migrate dev` to apply schema changes
  - Install new dependencies: `@stellar/stellar-sdk`, `@noir-lang/noir_js`, `@aztec/bb.js`, `@mavennet/stllr-did-resolver`
  - Update `apps/server/src/config/env.validation.ts` with new required env vars: `STELLAR_NETWORK`, `HORIZON_URL`, `SOROBAN_RPC_URL`, `STELLAR_SERVER_SECRET`, `ISSUER_REGISTRY_CONTRACT_ID`, `CREDENTIAL_REGISTRY_CONTRACT_ID`, `REVOCATION_REGISTRY_CONTRACT_ID`, `PROOF_VERIFIER_CONTRACT_ID_*`
  - _Requirements: 14.1, 14.3, 14.4_

- [x] 2. Implement Stellar Module
  - [x] 2.1 Implement `StellarService` in `src/modules/stellar/`
    - `generateKeypair()` — Keypair.random() from stellar-sdk
    - `getAccount(publicKey)` — Horizon server.loadAccount()
    - `buildAndSubmitTx(operations, signerSecret)` — build, sign, submit via Horizon; retry sequence-number conflicts and timeouts up to 5 times with exponential backoff (1s, 2s, 4s, 8s, 16s)
    - `getTransactionHistory(publicKey)` — Horizon account transactions
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_
  - [ ]* 2.2 Write property test for Stellar retry logic
    - Mock Horizon to fail N times then succeed; assert transaction is eventually submitted
    - Feature: zkkyc (supporting Requirements 10.3)

- [-] 3. Implement Soroban Module
  - [-] 3.1 Implement `SorobanService` in `src/modules/soroban/`
    - `invokeContract(contractName, method, args, signerSecret)` — build InvokeHostFunction op, simulate via SorobanRpc, sign, submit, poll until SUCCESS/FAILED
    - `simulateContract(contractName, method, args)` — read-only simulation for is_issuer, is_revoked queries
    - Contract address map loaded from config (one env var per contract)
    - Retry failed RPC calls with exponential backoff up to 5 attempts
    - _Requirements: 11.1, 11.2, 11.3_
  - [-] 3.2 Implement `SorobanEventIndexer` in `src/modules/soroban/`
    - `startIndexing(fromLedger)` — poll `getEvents` in batches of 200 ledgers on a configurable interval
    - Store/restore last processed ledger in Redis key `soroban:lastLedger`
    - Persist each event to `SorobanEvent` table
    - _Requirements: 11.4, 11.5_
  - [ ]* 3.3 Write property test for Soroban event indexer
    - For any sequence of N mock events, assert all N are persisted after indexing
    - For restart scenario (Redis has checkpoint), assert indexing resumes from stored ledger
    - Feature: zkkyc (supporting Requirements 11.5)

- [ ] 4. Checkpoint — Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Implement Auth Module (SEP-10)
  - [ ] 5.1 Implement `AuthService` in `src/modules/auth/`
    - `generateChallenge(publicKey)` — `Utils.buildChallengeTx(serverKeypair, publicKey, ...)`, store nonce in Redis with 5-min TTL, return base64 XDR
    - `verifyChallengeAndLogin(signedXDR)` — `Utils.readChallengeTx()` + `Utils.verifyChallengeTxSigners()`, check nonce not already used, mark nonce consumed, create JWT pair
    - `refreshAccessToken(refreshToken)` — validate refresh token in Redis, return new access token
    - `logout(refreshToken)` — remove refresh token from Redis
    - JWT signed with RS256; refresh tokens stored in Redis with 7-day TTL
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.8_
  - [ ] 5.2 Implement `AuthController` with `GET /auth/challenge`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`
    - Apply `ThrottlerGuard` on login and challenge endpoints
    - _Requirements: 1.1, 1.2, 1.4, 1.6, 15.5_
  - [ ] 5.3 Implement `JwtAuthGuard` and `RolesGuard` for use across all modules
    - _Requirements: 1.7, 15.1, 15.2, 15.3_
  - [ ]* 5.4 Write property tests for Auth Module
    - **Property 1: Valid SEP-10 challenge produces parseable XDR** — generate random valid G… keypairs, assert challenge XDR is valid
    - **Property 2: Valid SEP-10 login returns token pair** — generate keypairs, sign challenge, assert accessToken and refreshToken returned
    - **Property 3: Invalid or replayed login inputs are rejected with 401** — tampered XDR, replayed nonce, assert 401
    - Feature: zkkyc, Properties 1, 2, 3
    - _Requirements: 1.1, 1.2, 1.3, 1.8_

- [ ] 6. Implement DID Module
  - [ ] 6.1 Implement `DIDService` in `src/modules/did/`
    - `createOrFetchDID(stellarPublicKey)` — check DB first (upsert), construct `did:stellar:<publicKey>` document with Ed25519/JsonWebKey2020 verification method
    - `resolveDID(did)` — fetch from DB, return DIDDocument or null
    - _Requirements: 2.1, 2.2, 2.5_
  - [ ] 6.2 Implement `DIDController` with `POST /did/create` (JWT-protected) and `GET /did/:id` (public)
    - Return 404 on unknown DID
    - _Requirements: 2.3, 2.4_
  - [ ]* 6.3 Write property tests for DID Module
    - **Property 4: DID creation is idempotent** — for random Stellar public keys, call create twice, assert same DID string and exactly one DB row
    - **Property 5: DID create → resolve round-trip** — create then resolve, assert document format `did:stellar:<publicKey>` and field equivalence
    - Feature: zkkyc, Properties 4, 5
    - _Requirements: 2.1, 2.2, 2.3, 2.5_

- [ ] 7. Implement Issuer Registry (Soroban contract + NestJS service)
  - [ ] 7.1 Implement Soroban `issuer-registry` contract in `contracts/issuer-registry/`
    - `add_issuer(env, issuer: Address, name: String)` — admin auth required, store IssuerRecord
    - `remove_issuer(env, issuer: Address)` — admin auth required
    - `is_issuer(env, issuer: Address) -> bool` — read-only
    - Unit tests with Soroban SDK test harness: add then is_issuer=true, remove then is_issuer=false, non-admin cannot add
    - _Requirements: 9.1, 9.2, 9.3, 9.4_
  - [ ] 7.2 Implement `IssuerService` in `src/modules/issuers/` with `POST /issuers` and `DELETE /issuers/:id`
    - `registerIssuer(stellarAddress, name)` — persist to DB, call `SorobanService.invokeContract('issuer-registry', 'add_issuer', ...)`
    - `deregisterIssuer(id)` — set active=false in DB, call `remove_issuer` on chain
    - `isRegistered(issuerAddress)` — call `SorobanService.simulateContract('issuer-registry', 'is_issuer', ...)`
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [ ] 8. Implement Credential Module
  - [ ] 8.1 Implement `CredentialService` in `src/modules/credentials/`
    - `issueCredential(issuerDID, subjectDID, claims)` — verify issuer via `IssuerService.isRegistered()`, build W3C VC with Ed25519Signature2020, compute credential hash (SHA-256), persist record, invoke `SorobanService.invokeContract('credential-registry', 'issue_credential', ...)`, emit `CredentialIssued` event
    - `getCredential(id, requesterDID)` — fetch and enforce ownership/role
    - `verifyCredential(vc)` — verify Ed25519 signature against issuer public key, check revocation status, check expiry
    - Only store `country`, `age`, `accredited` in `claims` JSON — no other PII
    - _Requirements: 3.1, 3.2, 3.3, 3.6, 3.7, 3.8, 4.1, 4.2, 4.3, 4.4_
  - [ ] 8.2 Implement `CredentialController` with `POST /credentials`, `GET /credentials/:id`, `POST /credentials/verify`
    - Guard `POST /credentials` with `RolesGuard(ISSUER)`
    - _Requirements: 3.1, 3.3, 3.4, 3.5_
  - [ ]* 8.3 Write property tests for Credential Module
    - **Property 6: Issued VC contains all required W3C fields** — generate random valid claims, assert @context, id, type, issuer, issuanceDate, credentialSubject, proof all present
    - **Property 7: Credential hash is deterministic** — same inputs always produce same hash
    - **Property 8: Unregistered issuer always rejected** — generate random DIDs not in registry, assert 403
    - **Property 9: No PII in stored credential records** — issue credential, inspect DB record, assert only country/age/accredited present
    - **Property 10: Issue then verify round-trip** — issue VC, verify it, assert valid=true
    - **Property 11: Tampered VC fails verification** — mutate credentialSubject field, assert valid=false reason=invalid_signature
    - Feature: zkkyc, Properties 6, 7, 8, 9, 10, 11
    - _Requirements: 3.1, 3.2, 3.3, 3.8, 4.1, 4.4_

- [ ] 9. Checkpoint — Ensure all tests pass, ask the user if questions arise.

- [ ] 10. Implement Revocation Module
  - [ ] 10.1 Implement Soroban `revocation-registry` contract in `contracts/revocation-registry/`
    - `revoke_credential(env, credential_hash: BytesN<32>)` — issuer auth required, store revocation timestamp
    - `is_revoked(env, credential_hash: BytesN<32>) -> bool` — read-only
    - Soroban SDK unit tests: revoke then is_revoked=true, unrevoked returns false
    - _Requirements: 8.1, 8.3, 8.5_
  - [ ] 10.2 Implement `RevocationService` and `RevocationController` in `src/modules/revocation/`
    - `revokeCredential(credentialId, issuerDID)` — verify issuer ownership (403 if mismatch), update DB status=REVOKED, invoke `SorobanService.invokeContract('revocation-registry', 'revoke_credential', ...)`, emit `CredentialRevoked` event
    - `getRevocationStatus(credentialId)` — return revocation record or `{ revoked: false }`
    - `POST /revocations` (ISSUER role), `GET /revocations/:credentialId` (public)
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_
  - [ ]* 10.3 Write property tests for Revocation Module
    - **Property 18: Revoke then query round-trip** — revoke credential, query status, assert revoked=true and revokedAt non-null
    - **Property 19: Cross-issuer revocation returns 403** — generate credentials with mismatched issuer DID, assert 403
    - Feature: zkkyc, Properties 18, 19
    - _Requirements: 8.1, 8.2, 8.3_

- [ ] 11. Implement Noir Circuits
  - [ ] 11.1 Implement `circuits/age-proof/src/main.nr`
    - Private input: `age: u64`; public input: `threshold: pub u64`
    - Constraint: `assert(age >= threshold)`
    - `nargo test` with valid and invalid witness test cases
    - Pre-compile: `nargo compile` and `bb write_vk --scheme ultra_honk -b target/age_proof.json -o target/vk`
    - _Requirements: 5.5_
  - [ ] 11.2 Implement `circuits/residency-proof/src/main.nr`
    - Private input: `country_code: [u8; 2]`; public inputs: `allowed_countries: pub [[u8; 2]; 10]`, `allowed_count: pub u64`
    - Constraint: country_code is in the allowed set
    - Pre-compile and generate verification key
    - _Requirements: 5.5_
  - [ ] 11.3 Implement `circuits/accredited-investor/src/main.nr`
    - Private inputs: `accredited: bool`, `age: u64`; no public inputs
    - Constraints: `assert(accredited == true)`, `assert(age >= 18)`
    - Pre-compile and generate verification key
    - _Requirements: 5.5_
  - [ ] 11.4 Implement `circuits/sanctions-check/src/main.nr`
    - Private input: `sanctions_hash: Field`; public input: `clean_list_commitment: pub Field`
    - Constraint: `assert(sanctions_hash != clean_list_commitment)`
    - Pre-compile and generate verification key
    - _Requirements: 5.5_

- [ ] 12. Implement Soroban Proof Verifier Contracts
  - [ ] 12.1 Implement `contracts/proof-verifier/` Soroban contract in Rust
    - `initialize(env, vk: Bytes)` — store verification key in contract storage
    - `verify_proof(env, proof: Bytes, public_inputs: Bytes) -> bool` — UltraHonk verification logic
    - Deploy one instance per circuit, each initialized with the corresponding `target/vk` bytes
    - Soroban SDK unit tests with pre-generated proof fixtures: valid proof returns true, tampered proof returns false
    - _Requirements: 6.1, 6.2, 6.3_

- [ ] 13. Implement Proof Module
  - [ ] 13.1 Set up BullMQ `proof-generation` queue and `ProofGenerationWorker` in `src/modules/proofs/`
    - Configure `@nestjs/bullmq` with Redis connection
    - Worker loads pre-compiled Noir circuit artifact from `circuits/<circuit>/target/<circuit>.json`
    - Worker instantiates `Noir` + `UltraHonkBackend` from `@noir-lang/noir_js` and `@aztec/bb.js`
    - Worker generates witness from credential private claims + public inputs
    - Worker generates UltraHonk proof, persists artifact to `ZKProof.artifact`, updates status to COMPLETED, emits `ProofGenerated` event
    - _Requirements: 5.1, 5.2, 12.1, 12.3_
  - [ ] 13.2 Implement `ProofService` in `src/modules/proofs/`
    - `enqueueProofGeneration(subjectDID, credentialId, params)` — validate credential ownership (403), check not revoked/expired (422), enqueue BullMQ job, persist `ZKProof` with PENDING status, return `{ jobId }`
    - `verifyProof(proofId, verifierDID)` — load artifact, instantiate `UltraHonkBackend`, call `backend.verifyProof()` locally; if valid, call `SorobanService.invokeContract('proof-verifier-<circuit>', 'verify_proof', ...)` and return `{ valid: true, txHash }`; if invalid locally, return `{ valid: false, reason }` without Soroban call; emit `ProofVerified` event; persist result
    - `getJobStatus(jobId)` — proxy BullMQ job state
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 6.1, 6.2, 6.3, 6.4, 6.5_
  - [ ] 13.3 Implement `ProofController` with `POST /proofs/generate`, `POST /proofs/verify`, `GET /proofs/jobs/:jobId`
    - JWT-protected; validate ownership on generate
    - _Requirements: 5.1, 5.3, 6.1, 12.4_
  - [ ]* 13.4 Write property tests for Proof Module (non-circuit logic)
    - **Property 12: Proof generation returns job ID synchronously** — call enqueue, assert jobId returned without awaiting completion
    - **Property 13: Revoked credential rejected in proof generation** — revoke credential, call enqueue, assert 422
    - **Property 15: Tampered proof bytes fail local verification without Soroban call** — mutate proof bytes, assert valid=false and mock Soroban not called
    - **Property 22: Completed job updates proof record status** — mock worker completion, assert ZKProof.status=COMPLETED and generatedAt set
    - Feature: zkkyc, Properties 12, 13, 15, 22
    - _Requirements: 5.1, 5.3, 6.3, 12.3_
  - [ ]* 13.5 Write integration test for proof round-trip using pre-generated fixtures
    - **Property 14: Valid proof verifies locally and on-chain** — use pre-built age-proof fixture, call verifyProof with mock Soroban, assert valid=true
    - Feature: zkkyc, Property 14
    - _Requirements: 6.1, 6.2_

- [ ] 14. Checkpoint — Ensure all tests pass, ask the user if questions arise.

- [ ] 15. Implement Verification Module
  - [ ] 15.1 Implement `VerificationService` and controller in `src/modules/verification/`
    - `evaluatePolicy(proofPublicOutputs, policy)` — pure function, evaluate each PolicyRule against outputs, return `AccessDecision`
    - `persistAndEmit(subjectDID, verifierDID, policyId, decision)` — persist to `Verification` table, emit `VerificationCompleted` event
    - `POST /verification/evaluate` — JWT-protected
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_
  - [ ]* 15.2 Write property tests for Verification Module
    - **Property 16: Policy allow — all rules satisfied** — generate random policies and matching public outputs, assert allow with no failing rules
    - **Property 17: Policy deny — at least one failing rule** — generate policies with at least one violated rule, assert deny enumerates all failing rules
    - Feature: zkkyc, Properties 16, 17
    - _Requirements: 7.1, 7.2, 7.3_

- [ ] 16. Implement Audit Module
  - [ ] 16.1 Implement `AuditConsumer` in `src/modules/audit/`
    - Subscribe to `CredentialIssued`, `CredentialRevoked`, `ProofGenerated`, `ProofVerified`, `VerificationCompleted` via `@OnEvent`
    - For each event, insert an `AuditLog` record — insert only, never update or delete
    - _Requirements: 13.1, 13.2, 13.3_
  - [ ]* 16.2 Write property tests for Audit Module
    - **Property 20: Domain events produce audit log entries** — publish each of 5 event types, assert matching DB entry created per event
    - **Property 21: Audit log is append-only** — run sequence of operations, assert row count never decreases and no existing row changes
    - Feature: zkkyc, Properties 20, 21
    - _Requirements: 13.1, 13.2_

- [ ] 17. Wire BullMQ retry and failure handling
  - Configure retry policy (3 retries, exponential backoff 1s/4s/16s) on `proof-generation` queue
  - Emit `JobFailed` domain event after exhausting retries; `AuditConsumer` handles it
  - Update `ZKProof` record to `status: FAILED` on exhausted retries
  - _Requirements: 12.2, 12.3_

- [ ] 18. Implement global API security and validation
  - Apply `JwtAuthGuard` globally with `@Public()` decorator exceptions for challenge and login
  - Apply `ValidationPipe` globally with `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`
  - Configure `ThrottlerModule` for `/auth/*` endpoints
  - Implement global exception filter returning standardized `ErrorResponse` shape
  - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_

- [ ] 19. Final Checkpoint — Ensure all tests pass, ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Property tests use `fast-check` with `numRuns: 100`
- Circuit pre-compilation (`nargo compile` + `bb write_vk`) must be done once and artifacts committed to the repo before tasks 13.1 onward
- Soroban contract deployments require `ISSUER_REGISTRY_CONTRACT_ID` etc. set in environment before running integration tests
- UltraHonk on-chain verification requires `--limits unlimited` on testnet until Stellar Protocol 26
- All domain events are emitted synchronously via NestJS `EventEmitter2`
