# KYC Registry Soroban Smart Contract

A Soroban smart contract for managing KYC verification status on the Stellar network using a hybrid trust model. The contract verifies cryptographically signed attestations from a trusted backend and records verification status on-chain.

## Architecture

The contract implements a **hybrid trust model**:

1. **Veriff** verifies the user's identity off-chain
2. **Backend** generates and verifies a Noir proof
3. **Backend** creates a cryptographically signed attestation using Ed25519
4. **Soroban Contract** verifies the backend's signature on-chain
5. **Contract** records the user's verification status on-chain

This approach avoids expensive on-chain zero-knowledge proof verification while maintaining cryptographic security through signature verification.

## Features

- **Ed25519 Signature Verification**: Verifies attestations signed by the backend
- **Replay Protection**: Uses nonces to prevent replay attacks
- **Expiration Checking**: Validates attestation expiration timestamps
- **Admin Authorization**: Admin-only functions for revocation and key rotation
- **Backend Key Rotation**: Secure mechanism to rotate backend signing keys
- **Event Emission**: Emits events for verification, revocation, and key rotation
- **Deterministic Serialization**: Consistent payload serialization for signature verification

## Contract Functions

### `initialize(backend_public_key, admin, version)`

Initializes the contract with the backend's Ed25519 public key, admin address, and version. Can only be called once.

**Parameters:**
- `backend_public_key`: BytesN<32> - The Ed25519 public key used to verify attestations
- `admin`: Address - The admin address authorized to perform admin operations
- `version`: String - Contract version string

**Error:** `AlreadyInitialized` if contract is already initialized

### `verify_attestation(wallet, attestation_payload, signature)`

Verifies a signed attestation and records the user's verification status on-chain.

**Parameters:**
- `wallet`: Address - The user's Stellar address
- `attestation_payload`: String - Serialized attestation data
- `signature`: BytesN<64> - Ed25519 signature over the payload

**Validations:**
- Verifies Ed25519 signature using backend public key
- Verifies issuer is "backend"
- Checks expiration timestamp
- Validates issued_at timestamp (not in the future)
- Prevents replay attacks using nonce
- Marks user as verified

**Errors:**
- `NotInitialized` - Contract not initialized
- `InvalidSignature` - Signature verification failed
- `InvalidIssuer` - Issuer is not "backend"
- `AttestationExpired` - Attestation has expired
- `InvalidIssuedAt` - Issued_at timestamp is in the future
- `NonceAlreadyUsed` - Nonce has been used before (replay attack)

**Emits:** `VerificationCompleted` event

### `revoke(wallet)`

Revokes a user's verification status. Admin only.

**Parameters:**
- `wallet`: Address - The user's Stellar address to revoke

**Errors:**
- `NotInitialized` - Contract not initialized
- `Unauthorized` - Caller is not admin
- `UserNotFound` - User is not verified

**Emits:** `VerificationRevoked` event

### `is_verified(wallet)`

Checks if a wallet is currently verified (not revoked).

**Parameters:**
- `wallet`: Address - The user's Stellar address

**Returns:** `bool` - `true` if verified and not revoked, `false` otherwise

### `get_verification(wallet)`

Gets detailed verification data for a wallet.

**Parameters:**
- `wallet`: Address - The user's Stellar address

**Returns:** `VerificationData` struct containing:
- `wallet`: Address
- `country`: String
- `age_over_18`: bool
- `issued_at`: u64
- `expires_at`: u64
- `nonce`: BytesN<32>
- `proof_hash`: BytesN<32>
- `issuer`: String

**Errors:**
- `NotInitialized` - Contract not initialized
- `UserNotFound` - User is not verified

### `rotate_backend_key(new_key)`

Rotates the backend public key. Admin only.

**Parameters:**
- `new_key`: BytesN<32> - The new Ed25519 public key

**Errors:**
- `NotInitialized` - Contract not initialized
- `Unauthorized` - Caller is not admin

**Emits:** `BackendKeyRotated` event

### `get_version()`

Returns the contract version string.

**Returns:** `String` - Contract version

### `get_backend_public_key()`

Returns the current backend public key.

**Returns:** `BytesN<32>` - Backend Ed25519 public key

### `get_admin()`

Returns the admin address.

**Returns:** `Address` - Admin address

## Attestation Payload Format

The attestation payload is serialized in a deterministic format for signature verification:

```
wallet|verified|country|age_over_18|issued_at|expires_at|nonce|proof_hash|issuer
```

Example:
```
GABCD...|true|NG|true|1780000000|1810000000|0123abcd...|4567efgh...|backend
```

**Fields:**
- `wallet`: Stellar address (G...)
- `verified`: boolean ("true" or "false")
- `country`: ISO 3166-1 alpha-2 country code
- `age_over_18`: boolean ("true" or "false")
- `issued_at`: Unix timestamp (seconds)
- `expires_at`: Unix timestamp (seconds)
- `nonce`: 32-byte hex string
- `proof_hash`: 32-byte hex string (hash of the Noir proof)
- `issuer`: String (must be "backend")

## Events

### VerificationCompleted

Emitted when a user's attestation is successfully verified.

**Fields:**
- `wallet`: Address
- `timestamp`: u64
- `issuer`: String

### VerificationRevoked

Emitted when a user's verification is revoked.

**Fields:**
- `wallet`: Address
- `timestamp`: u64

### BackendKeyRotated

Emitted when the backend public key is rotated.

**Fields:**
- `old_key`: BytesN<32>
- `new_key`: BytesN<32>

## Storage

The contract uses persistent storage for:

- **Backend Public Key**: Ed25519 public key for signature verification
- **Admin**: Admin address for authorization
- **Contract Version**: Version string
- **Verified Users**: Map<Address, VerificationData> - Verification records
- **Revoked Users**: Map<Address, u64> - Revocation timestamps
- **Used Nonces**: Map<BytesN<32>, bool> - Replay protection

## Building

### Prerequisites

- Rust 1.70+
- Soroban CLI tools

### Build

```bash
cd contracts/soroban/kyc_registry
cargo build --release --target wasm32-unknown-unknown
```

### Test

```bash
cargo test
```

## Deployment

### 1. Build the Contract

```bash
soroban contract build
```

### 2. Deploy to Testnet

```bash
soroban contract deploy \
  --wasm target/wasm/kyc_registry.wasm \
  --source <YOUR_SECRET_KEY> \
  --network testnet
```

This will return the contract ID. Save it for initialization.

### 3. Initialize the Contract

```bash
soroban contract invoke \
  --id <CONTRACT_ID> \
  --source <ADMIN_SECRET_KEY> \
  --network testnet \
  initialize \
  --backend_public_key <BACKEND_PUBLIC_KEY_HEX> \
  --admin <ADMIN_ADDRESS> \
  --version "1.0.0"
```

**Parameters:**
- `backend_public_key`: 32-byte hex string of the backend's Ed25519 public key
- `admin`: Stellar address (G...) of the admin
- `version`: Version string (e.g., "1.0.0")

### 4. Verify Deployment

```bash
soroban contract invoke \
  --id <CONTRACT_ID> \
  --network testnet \
  get_version
```

## Backend Integration

The backend must:

1. **Generate Ed25519 Keypair**: Create a keypair for signing attestations
2. **Sign Attestations**: Sign attestation payloads with the private key
3. **Submit to Contract**: Call `verify_attestation` with the signed payload
4. **Store Contract ID**: Save the deployed contract ID for future operations

### Example Backend Flow

```typescript
// 1. Create attestation
const attestation = {
  wallet: "GABCD...",
  verified: true,
  country: "NG",
  age_over_18: true,
  issued_at: Math.floor(Date.now() / 1000),
  expires_at: Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60,
  nonce: generateNonce(), // 32 random bytes
  proof_hash: "0123...", // Hash of Noir proof
  issuer: "backend"
};

// 2. Serialize payload
const payload = `${attestation.wallet}|${attestation.verified}|${attestation.country}|${attestation.age_over_18}|${attestation.issued_at}|${attestation.expires_at}|${attestation.nonce}|${attestation.proof_hash}|${attestation.issuer}`;

// 3. Sign with Ed25519
const signature = keypair.sign(Buffer.from(payload));

// 4. Submit to contract
await contract.verify_attestation(
  attestation.wallet,
  payload,
  signature
);
```

## Security Considerations

### Replay Protection

- Each attestation must include a unique 32-byte nonce
- Nonces are marked as used after successful verification
- Reusing a nonce will be rejected with `NonceAlreadyUsed` error

### Expiration

- Attestations have an `expires_at` timestamp
- Expired attestations are rejected with `AttestationExpired` error
- Recommended expiration: 1 year from issuance

### Signature Verification

- Uses Ed25519 for cryptographic signatures
- Signature verification happens on-chain
- Backend private key must be kept secure

### Key Rotation

- Backend public key can be rotated by admin
- Old attestations remain valid until expiration
- New attestations must be signed with the new key

### Admin Authorization

- Admin-only functions: `revoke`, `rotate_backend_key`
- Admin address is set during initialization and cannot be changed
- Consider using multi-sig for admin operations in production

## Testing

The contract includes unit tests covering:

- Contract initialization
- Double initialization prevention
- Storage persistence
- Successful verification flow
- Invalid signature rejection
- Expired attestation rejection
- Replay attack prevention
- User revocation
- Unauthorized operation rejection
- Backend key rotation
- Event emission

Run tests with:

```bash
cargo test
```

## Environment Variables

For backend integration, set the following environment variables:

```bash
SOROBAN_KYC_CONTRACT_ID=<deployed_contract_id>
SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
STELLAR_NETWORK_PASSPHRASE="Test SDF Network ; September 2015"
STELLAR_CONTRACT_ADMIN_SECRET_KEY=<admin_secret_key>
STELLAR_BACKEND_SECRET_KEY=<backend_signing_secret_key>
```

## License

Proprietary - Part of the zkKYC project

## Support

For issues or questions, please refer to the main project documentation or contact the development team.
