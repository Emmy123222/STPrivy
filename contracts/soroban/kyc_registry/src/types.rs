use soroban_sdk::{Address, BytesN, String};

/// Verification record stored on-chain
#[derive(Clone)]
pub struct VerificationRecord {
    pub wallet: Address,
    pub verified: bool,
    pub country: String,
    pub age_over_18: bool,
    pub issued_at: u64,
    pub expires_at: u64,
    pub nonce: BytesN<32>,
    pub proof_hash: BytesN<32>,
    pub issuer: String,
}

/// Attestation payload that gets signed by the backend
#[derive(Clone)]
pub struct AttestationPayload {
    pub wallet: Address,
    pub verified: bool,
    pub country: String,
    pub age_over_18: bool,
    pub issued_at: u64,
    pub expires_at: u64,
    pub nonce: BytesN<32>,
    pub proof_hash: BytesN<32>,
    pub issuer: String,
}

/// Contract initialization parameters
pub struct InitParams {
    pub backend_public_key: BytesN<32>,
    pub admin: Address,
    pub version: String,
}
