use crate::auth::require_admin;
use crate::errors::Error;
use crate::events::{emit_backend_key_rotated, emit_verification_completed, emit_verification_revoked};
use crate::groth16;
use crate::storage::{
    get_admin, get_backend_public_key, get_contract_version, get_vk, get_verification,
    is_initialized, is_nonce_used, is_revoked, is_verified, mark_nonce_used, revoke_wallet,
    set_admin, set_backend_public_key, set_contract_version, set_vk, set_verification,
    VerificationData,
};
use crate::types::AttestationPayload;
use soroban_sdk::{contract, contractimpl, Address, Bytes, BytesN, Env, String, Vec};

#[contract]
pub struct KycRegistryContract;

#[contractimpl]
impl KycRegistryContract {
    // ── Lifecycle ─────────────────────────────────────────────────────────────

    /// Initialize the contract. Can only be called once.
    pub fn initialize(
        env: Env,
        backend_public_key: BytesN<32>,
        admin: Address,
        version: String,
    ) -> Result<(), Error> {
        if is_initialized(&env) {
            return Err(Error::AlreadyInitialized);
        }
        set_backend_public_key(&env, backend_public_key);
        set_admin(&env, admin);
        set_contract_version(&env, version);
        Ok(())
    }

    // ── Groth16 VK management ─────────────────────────────────────────────────

    /// Store the Groth16 verification key for this circuit (admin only).
    /// `circuit_id` is an arbitrary label (e.g. "age-proof").
    pub fn set_vk(env: Env, admin: Address, circuit_id: String, vk: Bytes) -> Result<(), Error> {
        admin.require_auth();
        require_admin(&env, &admin)?;
        set_vk(&env, circuit_id, vk);
        Ok(())
    }

    // ── Groth16 proof verification ────────────────────────────────────────────

    /// Verify a Circom Groth16 proof on-chain.
    ///
    /// * `circuit_id`    – identifies which stored VK to use
    /// * `proof`         – 384-byte proof blob (pi_a || pi_b || pi_c)
    /// * `public_inputs` – vector of 32-byte big-endian scalars
    ///
    /// Returns `true` if the proof is valid, `false` otherwise.
    pub fn verify_proof(
        env: Env,
        circuit_id: String,
        proof: Bytes,
        public_inputs: Vec<Bytes>,
    ) -> bool {
        let vk = match get_vk(&env, circuit_id) {
            Some(v) => v,
            None => return false,
        };
        groth16::verify(&env, &vk, &proof, &public_inputs)
    }

    // ── KYC attestation ───────────────────────────────────────────────────────

    /// Record a backend-signed KYC attestation on-chain.
    pub fn verify_attestation(
        env: Env,
        wallet: Address,
        attestation_payload: String,
        signature: BytesN<64>,
    ) -> Result<(), Error> {
        if !is_initialized(&env) {
            return Err(Error::NotInitialized);
        }
        let payload = Self::parse_attestation(&env, &attestation_payload)?;

        let backend_public_key = get_backend_public_key(&env);
        if !Self::verify_signature(&env, &attestation_payload, &signature, &backend_public_key) {
            return Err(Error::InvalidSignature);
        }
        if payload.issuer != String::from_str(&env, "backend") {
            return Err(Error::InvalidIssuer);
        }
        let current_time = env.ledger().timestamp();
        if payload.expires_at < current_time {
            return Err(Error::AttestationExpired);
        }
        if payload.issued_at > current_time {
            return Err(Error::InvalidIssuedAt);
        }
        if is_nonce_used(&env, &payload.nonce) {
            return Err(Error::NonceAlreadyUsed);
        }

        mark_nonce_used(&env, payload.nonce.clone());

        let verification_data: VerificationData = (
            wallet.clone(),
            payload.country.clone(),
            payload.age_over_18,
            payload.issued_at,
            payload.expires_at,
            payload.nonce,
            payload.proof_hash,
            payload.issuer.clone(),
        );
        set_verification(&env, wallet.clone(), verification_data);
        emit_verification_completed(&env, wallet, current_time, payload.issuer);
        Ok(())
    }

    /// Revoke a user's verification (admin only).
    pub fn revoke(env: Env, admin: Address, wallet: Address) -> Result<(), Error> {
        admin.require_auth();
        require_admin(&env, &admin)?;
        if !is_verified(&env, &wallet) {
            return Err(Error::UserNotFound);
        }
        let current_time = env.ledger().timestamp();
        revoke_wallet(&env, wallet.clone(), current_time);
        emit_verification_revoked(&env, wallet, current_time);
        Ok(())
    }

    /// Check if a wallet holds a valid (non-revoked) KYC attestation.
    pub fn is_verified(env: Env, wallet: Address) -> bool {
        if !is_initialized(&env) {
            return false;
        }
        is_verified(&env, &wallet) && !is_revoked(&env, &wallet)
    }

    /// Get the raw verification record for a wallet.
    pub fn get_verification(env: Env, wallet: Address) -> Result<VerificationData, Error> {
        if !is_initialized(&env) {
            return Err(Error::NotInitialized);
        }
        match get_verification(&env, &wallet) {
            Some(data) => Ok(data),
            None => Err(Error::UserNotFound),
        }
    }

    /// Rotate the backend Ed25519 signing key (admin only).
    pub fn rotate_backend_key(env: Env, admin: Address, new_key: BytesN<32>) -> Result<(), Error> {
        admin.require_auth();
        require_admin(&env, &admin)?;
        let old_key = get_backend_public_key(&env);
        set_backend_public_key(&env, new_key.clone());
        emit_backend_key_rotated(&env, old_key, new_key);
        Ok(())
    }

    // ── Read-only accessors ───────────────────────────────────────────────────

    pub fn get_version(env: Env) -> String {
        get_contract_version(&env)
    }

    pub fn get_backend_public_key(env: Env) -> BytesN<32> {
        get_backend_public_key(&env)
    }

    pub fn get_admin(env: Env) -> Address {
        get_admin(&env)
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    fn parse_attestation(_env: &Env, _payload: &String) -> Result<AttestationPayload, Error> {
        Err(Error::InvalidPayload)
    }

    fn verify_signature(
        _env: &Env,
        _payload: &String,
        _signature: &BytesN<64>,
        _public_key: &BytesN<32>,
    ) -> bool {
        true // placeholder — production implementation would verify Ed25519
    }
}
