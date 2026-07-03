use soroban_sdk::{contractevent, Address, Env, String, BytesN};

#[contractevent]
pub struct VerificationCompletedEvent {
    pub wallet: Address,
    pub timestamp: u64,
    pub issuer: String,
}

#[contractevent]
pub struct VerificationRevokedEvent {
    pub wallet: Address,
    pub timestamp: u64,
}

#[contractevent]
pub struct BackendKeyRotatedEvent {
    pub old_key: BytesN<32>,
    pub new_key: BytesN<32>,
}

pub fn emit_verification_completed(env: &Env, wallet: Address, timestamp: u64, issuer: String) {
    VerificationCompletedEvent {
        wallet,
        timestamp,
        issuer,
    }.publish(env);
}

pub fn emit_verification_revoked(env: &Env, wallet: Address, timestamp: u64) {
    VerificationRevokedEvent { wallet, timestamp }.publish(env);
}

pub fn emit_backend_key_rotated(
    env: &Env,
    old_key: BytesN<32>,
    new_key: BytesN<32>,
) {
    BackendKeyRotatedEvent {
        old_key,
        new_key,
    }.publish(env);
}
