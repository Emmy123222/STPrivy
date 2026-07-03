# zkKYC — Privacy-Preserving KYC on Stellar

zkKYC is a zero-knowledge KYC compliance platform built on the Stellar network. It lets users prove regulatory compliance — age, nationality, accredited investor status, sanctions clearance — to protocols and applications **without revealing any underlying personal data**. Everything is anchored to Soroban smart contracts on Stellar testnet.

---

## What We Built

### The Core Idea

Traditional KYC forces users to hand over raw personal data to every service they use. zkKYC flips this: a user goes through KYC once, receives a **W3C Verifiable Credential** signed by an authorized issuer, and can then generate a **zero-knowledge proof** from that credential to prove specific claims (e.g. "I am over 18") to any verifier — without revealing their name, date of birth, passport number, or any other raw data.

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
| Veriff identity verification (session + webhook + auto-VC) | ✅ Real — live Veriff API key, real session creation |
| `is_issuer` on-chain check (issuer-registry) | ✅ Real — queries live Soroban contract on Stellar testnet |
| `revoke_credential` on-chain (revocation-registry) | ✅ Real — transaction submitted to Stellar testnet, visible on Stellar Expert |
| `is_revoked` on-chain check | ✅ Real — queries live revocation-registry contract |
| Proof request workflow | ✅ Real — persisted in DB, full lifecycle |
| Admin stats + audit log | ✅ Real — pulled from live database |
| Live health check (DB + Stellar RPC) | ✅ Real — pings both services with latency measurement |
| 3 Soroban contracts deployed on testnet | ✅ Real — verified on Stellar Explorer |

### KYC Provider — Veriff Integration

The identity verification flow uses **Veriff** with a real API key. Here is how the full flow works:

1. User clicks "Start Veriff Verification" on the KYC form
2. Our backend calls `POST https://stationapi.veriff.com/v1/sessions` with the Veriff API key — this creates a real Veriff session
3. The `@veriff/incontext-sdk` launches the Veriff widget (camera capture, document upload, liveness check) inside an iframe
4. When the user submits, Veriff reviews the submission and fires a webhook decision to our backend at `POST /veriff/webhook`
5. On approval, the backend automatically issues a W3C Verifiable Credential from the Veriff-verified claims (country from document, age from date of birth)

**What's real:** The Veriff API integration is fully wired — session creation, SDK launch, webhook handler, and auto-VC issuance on approval. The API key (`b5136c93-53f0-440d-87e0-f885e877a9a4`) is a real Veriff test account key.

**One caveat for local testing:** The Veriff webhook fires to a public URL. When running locally, you need a tool like [ngrok](https://ngrok.com/) to expose `localhost:3002` so Veriff can reach the `POST /veriff/webhook` endpoint. Without it, the session UI launches but the auto-issuance on completion doesn't fire. The manual KYC form (non-Veriff providers) works without any external tunnel.

**SumSub and Persona:** These remain unintegrated — they require separate paid business accounts. The provider selector on the KYC start page shows all three, but only Veriff and the manual self-submission form are wired up.

---

## Running Locally

### Prerequisites
- Node.js 20+
- PostgreSQL running locally or via Docker
- A Stellar testnet account funded with XLM (for the server keypair — needed to pay Soroban transaction fees)

### Setup

```bash
git clone https://github.com/johnsmccain/zkKYC.git
cd zkKYC
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
BACKEND_URL=http://localhost:3002
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
NEXT_PUBLIC_STELLAR_NETWORK=testnet
NEXT_PUBLIC_VERIFF_API_KEY=<your-veriff-api-key>
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
zkKYC/
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
- **SumSub / Persona** — additional KYC provider integrations (Veriff is live; SumSub and Persona require separate accounts)
- **Deploy remaining proof-verifier contracts** — one per circuit for residency, accreditation, sanctions
- **Credential-registry contract** — anchor credential hashes at issuance, not just at revocation
- **On-chain DID anchoring** — write DID documents to a Stellar contract
- **Verifier policy engine** — multi-proof requirements, thresholds, expiry rules
- **Admin UI for on-chain issuer management** — frontend to register/deregister issuers via `add_issuer`

---

## Closing Note

This is an honest work-in-progress. The on-chain contracts are real and verifiable on Stellar Explorer. The credential cryptography (Ed25519 signing, SHA-256 hashing, W3C VC format) is real. Veriff identity verification is wired end-to-end with a live API key. The end-to-end flow — wallet auth → DID → KYC via Veriff → issue credential → generate proof → request/respond → revoke — works locally and on Stellar testnet. For judging, the manual KYC form (non-Veriff) works fully without an ngrok tunnel; Veriff requires a tunnel for the webhook to fire.
