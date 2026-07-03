use soroban_sdk::{Address, Bytes, BytesN, Env, Map, String};

/// Storage key prefixes
pub const BACKEND_PUBLIC_KEY: &str = "backend_public_key";
pub const ADMIN: &str = "admin";
pub const CONTRACT_VERSION: &str = "contract_version";
pub const VERIFIED_USERS: &str = "verified_users";
pub const REVOKED_USERS: &str = "revoked_users";
pub const USED_NONCES: &str = "used_nonces";
pub const VK_STORE: &str = "vk_store"; // Groth16 VK map: circuit_id -> vk bytes

pub type VerificationData = (Address, String, bool, u64, u64, BytesN<32>, BytesN<32>, String);

fn to_bytes_n<const N: usize>(env: &Env, s: &str) -> BytesN<N> {
    let bytes = s.as_bytes();
    let mut arr = [0u8; N];
    let len = bytes.len().min(N);
    arr[..len].copy_from_slice(&bytes[..len]);
    BytesN::from_array(env, &arr)
}

fn key32(env: &Env, s: &str) -> BytesN<32> {
    to_bytes_n(env, s)
}

// ── Backend public key ────────────────────────────────────────────────────────

pub fn get_backend_public_key(env: &Env) -> BytesN<32> {
    env.storage()
        .instance()
        .get(&key32(env, BACKEND_PUBLIC_KEY))
        .unwrap_or_else(|| panic!("Backend public key not set"))
}

pub fn set_backend_public_key(env: &Env, public_key: BytesN<32>) {
    env.storage()
        .instance()
        .set(&key32(env, BACKEND_PUBLIC_KEY), &public_key);
}

// ── Admin ─────────────────────────────────────────────────────────────────────

pub fn get_admin(env: &Env) -> Address {
    env.storage()
        .instance()
        .get(&key32(env, ADMIN))
        .unwrap_or_else(|| panic!("Admin not set"))
}

pub fn set_admin(env: &Env, admin: Address) {
    env.storage()
        .instance()
        .set(&key32(env, ADMIN), &admin);
}

// ── Contract version ──────────────────────────────────────────────────────────

pub fn get_contract_version(env: &Env) -> String {
    env.storage()
        .instance()
        .get(&key32(env, CONTRACT_VERSION))
        .unwrap_or_else(|| String::from_str(env, "1.0.0"))
}

pub fn set_contract_version(env: &Env, version: String) {
    env.storage()
        .instance()
        .set(&key32(env, CONTRACT_VERSION), &version);
}

// ── Initialization check ──────────────────────────────────────────────────────

pub fn is_initialized(env: &Env) -> bool {
    env.storage()
        .instance()
        .has(&key32(env, BACKEND_PUBLIC_KEY))
}

// ── Groth16 verification keys ─────────────────────────────────────────────────

/// Store a Groth16 VK identified by circuit_id string.
pub fn set_vk(env: &Env, circuit_id: String, vk: Bytes) {
    let mut store: Map<String, Bytes> = env
        .storage()
        .instance()
        .get(&key32(env, VK_STORE))
        .unwrap_or_else(|| Map::new(env));
    store.set(circuit_id, vk);
    env.storage()
        .instance()
        .set(&key32(env, VK_STORE), &store);
}

/// Retrieve a stored VK by circuit_id.
pub fn get_vk(env: &Env, circuit_id: String) -> Option<Bytes> {
    let store: Map<String, Bytes> = env
        .storage()
        .instance()
        .get(&key32(env, VK_STORE))
        .unwrap_or_else(|| Map::new(env));
    store.get(circuit_id)
}

// ── Verified users ────────────────────────────────────────────────────────────

pub fn get_verification(env: &Env, wallet: &Address) -> Option<VerificationData> {
    let verified_users: Map<Address, VerificationData> = env
        .storage()
        .instance()
        .get(&key32(env, VERIFIED_USERS))
        .unwrap_or_else(|| Map::new(env));
    verified_users.get(wallet.clone())
}

pub fn set_verification(env: &Env, wallet: Address, data: VerificationData) {
    let mut verified_users: Map<Address, VerificationData> = env
        .storage()
        .instance()
        .get(&key32(env, VERIFIED_USERS))
        .unwrap_or_else(|| Map::new(env));
    verified_users.set(wallet, data);
    env.storage()
        .instance()
        .set(&key32(env, VERIFIED_USERS), &verified_users);
}

pub fn is_verified(env: &Env, wallet: &Address) -> bool {
    get_verification(env, wallet).is_some()
}

// ── Revoked users ─────────────────────────────────────────────────────────────

pub fn is_revoked(env: &Env, wallet: &Address) -> bool {
    let revoked_users: Map<Address, u64> = env
        .storage()
        .instance()
        .get(&key32(env, REVOKED_USERS))
        .unwrap_or_else(|| Map::new(env));
    revoked_users.contains_key(wallet.clone())
}

pub fn revoke_wallet(env: &Env, wallet: Address, timestamp: u64) {
    let mut revoked_users: Map<Address, u64> = env
        .storage()
        .instance()
        .get(&key32(env, REVOKED_USERS))
        .unwrap_or_else(|| Map::new(env));
    revoked_users.set(wallet, timestamp);
    env.storage()
        .instance()
        .set(&key32(env, REVOKED_USERS), &revoked_users);
}

// ── Nonces ────────────────────────────────────────────────────────────────────

pub fn is_nonce_used(env: &Env, nonce: &BytesN<32>) -> bool {
    let used_nonces: Map<BytesN<32>, bool> = env
        .storage()
        .instance()
        .get(&key32(env, USED_NONCES))
        .unwrap_or_else(|| Map::new(env));
    used_nonces.get(nonce.clone()).unwrap_or(false)
}

pub fn mark_nonce_used(env: &Env, nonce: BytesN<32>) {
    let mut used_nonces: Map<BytesN<32>, bool> = env
        .storage()
        .instance()
        .get(&key32(env, USED_NONCES))
        .unwrap_or_else(|| Map::new(env));
    used_nonces.set(nonce, true);
    env.storage()
        .instance()
        .set(&key32(env, USED_NONCES), &used_nonces);
}
