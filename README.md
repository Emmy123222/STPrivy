# STPrivy — Privacy-Preserving KYC on Stellar

STPrivy is a zero-knowledge KYC compliance platform built on the Stellar network. It lets users prove regulatory compliance — age, nationality, accredited investor status, sanctions clearance — to protocols and applications **without revealing any underlying personal data**. Everything is anchored to Soroban smart contracts on Stellar testnet.

---

## What We Built

### The Core Idea

Traditional KYC forces users to hand over raw personal data to every service they use. STPrivy flips this: a user goes through KYC once, receives a **W3C Verifiable Credential** signed by an authorized issuer, and can then generate a **zero-knowledge proof** from that credential to prove specific claims (e.g. "I am over 18") to any verifier — without revealing their name, date of birth, passport number, or any other raw data.

The verifier never sees the credential. They only see the proof and its public outputs.

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  Next.js 14 Frontend (port 3001)         │
│  Freighter / LOBSTR / xBull wallet  ──►  SEP-10 Auth     │
└──────────────────────────┬──────────────────────────────┘
                           │ REST API
┌──────────────────────────▼──────────────────────────────┐
│               NestJS Backend (port 3002)                 │
│                                                          │
│  Auth ── DID ── Credentials ── Proofs ── Admin           │
│                      │              │                    │
│              PostgreSQL (Prisma)    │                    │
│                                     ▼                   │
│                           Soroban RPC (testnet)          │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│              Soroban Smart Contracts (Rust)              │
│                                                          │
│  issuer-registry  ──  revocation-registry  ──  proof-    │
│                                                verifier  │
└─────────────────────────────────────────────────────────┘
```

**Stack:**
- **Frontend:** Next.js 14 (App Router), TailwindCSS, shadcn/ui, TanStack Query
- **Backend:** NestJS, Prisma ORM, PostgreSQL, JWT (HS256), EventEmitter2
- **Blockchain:** Stellar testnet, Soroban smart contracts (Rust), `@stellar/stellar-sdk`
- **ZK:** Noir circuits (4 written), `bb.js` UltraHonk backend *(proof generation is mocked — see Honest Status below)*
- **Auth:** SEP-10 challenge/response (Stellar's wallet authentication standard)

---

## Features Built

### Authentication
- **SEP-10 wallet auth** — users connect their Stellar wallet, sign a challenge transaction, and receive a JWT. No passwords, no email, fully self-sovereign.
- Auto 401 handling: expired tokens clear the session and redirect to the connect page.

### DID (Decentralized Identity)
- Each Stellar account gets a `did:stellar:<public_key>` identifier.
- DID documents are stored in PostgreSQL and returned in W3C DID Document format with an Ed25519 verification method.

### Verifiable Credentials (W3C)
- Users self-submit KYC claims (country, age, accredited status).
- The platform's authorized issuer signs the credential using **Ed25519Signature2020** with the server's Stellar keypair.
- Before signing, the backend checks the **issuer-registry contract on-chain** to confirm the issuer is active.
- Credential hash (SHA-256) is stored in DB; it gets anchored to the **revocation-registry contract on-chain when revoked**.
- Credentials are W3C compliant: `@context`, `type`, `issuer`, `issuanceDate`, `credentialSubject`, `proof`.

### ZK Proofs
- Users can request a ZK proof from a credential for a specific circuit (`age-proof`, `residency-proof`, `accredited-investor`, `sanctions-check`).
- Proofs go through a lifecycle: `PENDING → GENERATING → COMPLETED`.
- Completed proofs can be submitted for on-chain verification via the **proof-verifier contract** on Stellar testnet.

### Proof Request Workflow (Verifier → Subject)
- A verifier creates a proof request specifying the required circuit, purpose, and expiry.
- The system generates a shareable deep link (`/kyc/respond?requestId=...`).
- The subject visits the link, selects a completed proof matching the required circuit, and approves or rejects the request.
- Requests are persisted in DB with status: `PENDING → APPROVED / REJECTED / EXPIRED`.

### Smart Contracts (deployed on Stellar testnet)
Three Rust contracts deployed and verified on Stellar testnet:

| Contract | Address | Purpose |
|---|---|---|
| `issuer-registry` | `CANCMXEGGKETATRNH7MSAQZTJ3M3IG4D6NZPYYF5BVWWYR6PZS46TA7T` | Maintains the whitelist of authorized KYC issuers |
| `revocation-registry` | `CBV6NUS4XGRIOLWK37VG4SBP7OR4FLW3H4NTZGPNC4DPYZVNMJ37KSDF` | Stores hashes of revoked credentials with timestamps |
| `proof-verifier` (age-proof) | `CC4PCG66IJW6YJYVVY2TRC3ZHZA46BHPB6MVXE2URGZ6XE4G7W6DVP7U` | Verifies UltraHonk ZK proofs against a stored verification key |

**On-chain interactions wired end-to-end:**
- `is_issuer(address)` — checked before every credential issuance
- `revoke_credential(hash)` — called when a credential is revoked (transaction submitted to chain, visible on Stellar Expert)
- `is_revoked(hash)` — secondary on-chain check during credential verification
- `remove_issuer(address)` — called when an issuer is deactivated in the admin panel
- `verify_proof(proof, public_inputs)` — called when a user submits their proof for on-chain verification

### Admin Dashboard
- Real-time platform stats (total users, credentials, proofs, active issuers) pulled from the live database.
- Audit log of all system events (credential issued, revoked, proofs generated/verified).
- Live health check — pings both PostgreSQL and Stellar RPC with measured response latency.

### Credential Revocation
- An issuer can revoke any credential they issued.
- Revocation writes the credential hash to the **revocation-registry Soroban contract** (on-chain, confirmed on Stellar Explorer).
- Subsequent verification checks both the DB status and the on-chain registry as a secondary source of truth.

---

## Honest Status — What's Real vs. Mock

We want to be fully transparent about what is production-grade, what is wired but limited, and what is intentionally mocked for this submission.

### What is Real and Working

| Feature | Status |
|---|---|
| SEP-10 wallet authentication | ✅ Real — signs and verifies actual Stellar transactions |
| JWT session management | ✅ Real |
| DID creation (`did:stellar`) | ✅ Real — stored, resolved, W3C compliant |
| W3C VC issuance with Ed25519 signature | ✅ Real — cryptographically signed with server keypair |
| Credential hash (SHA-256) | ✅ Real — computed deterministically from claims + issuer + subject |
| `is_issuer` on-chain check (issuer-registry) | ✅ Real — queries live Soroban contract on Stellar testnet |
| `revoke_credential` on-chain (revocation-registry) | ✅ Real — transaction submitted to Stellar testnet, visible on Stellar Expert |
| `is_revoked` on-chain check | ✅ Real — queries live revocation-registry contract |
| Proof request workflow | ✅ Real — persisted in DB, full lifecycle |
| Admin stats + audit log | ✅ Real — pulled from live database |
| Live health check (DB + Stellar RPC) | ✅ Real — pings both services with latency measurement |
| 3 Soroban contracts deployed on testnet | ✅ Real — verified on Stellar Explorer |

### What Uses Mock / Dummy Data

**1. KYC Claims — Self-submitted, no real KYC provider**

We designed the UI to integrate with a third-party KYC provider (the flow shows a SumSub-style handoff). However, **we did not subscribe to SumSub or any identity verification service** — doing so requires a paid business account and is not feasible for a hackathon submission without funding. As a result, the KYC claims (`country`, `age`, `accredited`) are **self-submitted by the user** through a form in the frontend.

There is no document verification, liveness check, or identity validation happening. The user types in their own data and the system issues a credential based on that.

In a production system, the issuer backend would receive verified claims from SumSub (or Persona, Jumio, etc.) via webhook after the user completes a real identity check, and only then sign and issue the credential.

**2. ZK Proof Generation — Mock artifacts, real circuit files**

The Noir circuits are written and exist in the `circuits/` folder (`age-proof`, `residency-proof`, `accredited-investor`, `sanctions-check`). The circuit logic and constraints are correct. However, **actual proof generation using `bb.js` / UltraHonk is not wired up** in the backend. Instead, `proof.service.ts` generates a mock artifact:

```typescript
// What currently runs (placeholder):
const mockArtifact = {
  proof: Buffer.from(`mock-proof-${proofId}`).toString('hex'),
  publicInputs: Buffer.from(JSON.stringify({ circuitId, claims })).toString('hex'),
};
```

```typescript
// What should run in production:
const backend = new UltraHonkBackend(circuit.bytecode);
const { proof, publicInputs } = await backend.generateProof(witness);
```

This means:
- The proof lifecycle (`PENDING → GENERATING → COMPLETED`) works correctly end-to-end.
- The proof artifact is stored in the database and can be viewed in the UI.
- When submitted to the on-chain `verify_proof` contract, the transaction executes but the contract returns `false` — the mock proof bytes don't satisfy the VK-binding check the contract performs.
- The verifier dashboard and proof request approval flow work correctly, they just work with this mock artifact.

Wiring `bb.js` to the compiled Noir circuits is the next concrete engineering task.

**3. Verifier and Subject Demo Accounts — Test keypairs from docs**

The verifier and subject accounts shown in the demo use pre-funded test keypairs from our `docs/contracts.md` file. These are Stellar testnet accounts with no real-world identity attached. We use them to demonstrate the full flow (verifier creates request → subject receives it → subject approves with a proof) without requiring the judge to connect a real Freighter wallet.

**4. Proof Verifier Contracts — Only age-proof is deployed**

Only the `proof-verifier-age-proof` contract is deployed on testnet. The three other circuits (`residency-proof`, `accredited-investor`, `sanctions-check`) have placeholder contract IDs in the environment config. When a proof for those circuits is submitted for on-chain verification, the backend skips it gracefully and logs a warning. Each circuit requires compiling, generating a verification key, and deploying a separate contract instance — planned for the next phase.

**5. Credential-Registry Contract — Not deployed**

The design called for a `credential-registry` contract to anchor credential hashes at issuance time. This contract was not deployed (the env contains a placeholder address). Currently, credential hashes are only written to the revocation-registry when revoked. Issuance-time anchoring is a planned improvement.

**6. Issuer Registration — Pre-configured, no frontend to add new issuers on-chain**

The platform issuer (`GDFIG4YYAMBOKJ2RGXGYXGZKEOGLBOB5GP6RURA6MPNNH2BPF27S2UQV`) was pre-registered in the issuer-registry contract at deploy time. The backend `IssuerService.addIssuer()` method is implemented and correctly calls `add_issuer` on the Soroban contract, but there is no admin UI to register new issuers yet. A platform admin would need to call the API directly.

**7. DID — Database only, no on-chain anchoring**

DID documents are stored in PostgreSQL only. There is no on-chain DID registry contract. The `did:stellar` method is deterministic (derived from the Stellar public key), which provides self-sovereignty without requiring a registry. On-chain anchoring is a future enhancement.

---

## Running Locally

### Prerequisites
- Node.js 20+
- PostgreSQL running locally or via Docker
- A Stellar testnet account funded with XLM (for the server keypair — needed to pay Soroban transaction fees)

### Setup

```bash
git clone https://github.com/johnsmccain/STPrivy.git
cd STPrivy
npm install
```

**Backend** (`apps/server/.env`):
```env
DATABASE_URL=postgresql://user:password@localhost:5432/stprivy
JWT_SECRET=your-jwt-secret-here
STELLAR_NETWORK=testnet
SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
STELLAR_SERVER_SECRET=<admin-keypair-secret>
STELLAR_SERVER_PUBLIC=<admin-keypair-public>
ISSUER_PUBLIC_KEY=<issuer-keypair-public>
ISSUER_SECRET_KEY=<issuer-keypair-secret>
ISSUER_REGISTRY_CONTRACT_ID=CANCMXEGGKETATRNH7MSAQZTJ3M3IG4D6NZPYYF5BVWWYR6PZS46TA7T
REVOCATION_REGISTRY_CONTRACT_ID=CBV6NUS4XGRIOLWK37VG4SBP7OR4FLW3H4NTZGPNC4DPYZVNMJ37KSDF
PROOF_VERIFIER_CONTRACT_ID_AGE_PROOF=CC4PCG66IJW6YJYVVY2TRC3ZHZA46BHPB6MVXE2URGZ6XE4G7W6DVP7U
```

**Frontend** (`apps/web/.env.local`):
```env
NEXT_PUBLIC_API_URL=http://localhost:3002/api/v1
```

**Database:**
```bash
cd apps/server
npx prisma db push
```

**Start:**
```bash
# Terminal 1
cd apps/server && npm run start:dev

# Terminal 2
cd apps/web && npm run dev
```

Frontend: `http://localhost:3001` — Backend: `http://localhost:3002`

---

## Project Structure

```
STPrivy/
├── apps/
│   ├── server/                    # NestJS backend
│   │   ├── src/modules/
│   │   │   ├── auth/              # SEP-10 auth, JWT strategy
│   │   │   ├── did/               # did:stellar creation + resolution
│   │   │   ├── credentials/       # W3C VC issuance, verification, revocation
│   │   │   ├── proofs/            # ZK proof lifecycle + proof request workflow
│   │   │   ├── issuers/           # Issuer registry (DB + on-chain sync)
│   │   │   ├── admin/             # Stats, audit log, health check
│   │   │   └── soroban/           # Soroban contract invocation layer
│   │   └── prisma/schema.prisma
│   └── web/                       # Next.js 14 frontend
│       └── src/app/
│           ├── connect/           # Wallet connection (SEP-10)
│           ├── dashboard/         # User dashboard
│           ├── kyc/               # KYC form, proof generation, respond to requests
│           ├── credentials/       # View issued credentials
│           ├── proofs/            # Proof list + detail view
│           ├── verifier/          # Create proof requests
│           ├── admin/             # Admin panel
│           └── status/            # Live platform status page
├── contracts/                     # Soroban smart contracts (Rust)
│   ├── issuer-registry/
│   ├── revocation-registry/
│   └── proof-verifier/
├── circuits/                      # Noir ZK circuits
│   ├── age-proof/
│   ├── residency-proof/
│   ├── accredited-investor/
│   └── sanctions-check/
└── docs/                          # Design doc, requirements, contracts reference
```

---

## On-Chain Verification

Revocation transactions are live on Stellar testnet. You can verify them independently:

**Revocation Registry (transactions show revoked credential hashes):**
https://stellar.expert/explorer/testnet/contract/CBV6NUS4XGRIOLWK37VG4SBP7OR4FLW3H4NTZGPNC4DPYZVNMJ37KSDF

**Issuer Registry (platform issuer is registered here):**
https://stellar.expert/explorer/testnet/contract/CANCMXEGGKETATRNH7MSAQZTJ3M3IG4D6NZPYYF5BVWWYR6PZS46TA7T

---

## What's Next

- **Real ZK proof generation** — wire `bb.js` UltraHonk prover to compiled Noir circuits via a BullMQ background worker
- **Real KYC provider** — SumSub / Persona webhook to receive verified claims before issuing credentials
- **Deploy remaining proof-verifier contracts** — one per circuit for residency, accreditation, sanctions
- **Credential-registry contract** — anchor credential hashes at issuance, not just at revocation
- **On-chain DID anchoring** — write DID documents to a Stellar contract
- **Verifier policy engine** — multi-proof requirements, thresholds, expiry rules
- **Admin UI for on-chain issuer management** — frontend to register/deregister issuers via `add_issuer`

---

## Closing Note

This is an honest work-in-progress. The on-chain contracts are real and verifiable on Stellar Explorer. The credential cryptography (Ed25519 signing, SHA-256 hashing, W3C VC format) is real. The end-to-end flow — wallet auth → DID → issue credential → generate proof → request/respond → revoke — works locally. The two big honest gaps are ZK proof generation (mock artifacts instead of real Noir proofs) and KYC claim verification (self-submitted instead of third-party verified). We documented both clearly rather than hiding them.
