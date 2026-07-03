use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    /// Contract already initialized
    AlreadyInitialized = 1,
    /// Contract not initialized
    NotInitialized = 2,
    /// Invalid signature
    InvalidSignature = 3,
    /// Attestation has expired
    AttestationExpired = 4,
    /// Attestation issued in the future
    InvalidIssuedAt = 5,
    /// Nonce already used (replay attack)
    NonceAlreadyUsed = 6,
    /// Unauthorized caller
    Unauthorized = 7,
    /// User not found
    UserNotFound = 8,
    /// Invalid issuer
    InvalidIssuer = 9,
    /// Invalid payload format
    InvalidPayload = 10,
}
