use soroban_sdk::{Address, BytesN, Env, String};

use crate::KycRegistryContract;

#[test]
fn test_initialize() {
    let env = Env::default();
    let contract_id = env.register_contract(None, KycRegistryContract);
    let client = KycRegistryContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let backend_public_key = BytesN::from_array(&env, &[1u8; 32]);
    let version = String::from_str(&env, "1.0.0");

    client.initialize(&backend_public_key, &admin, &version);

    // Verify initialization
    assert_eq!(client.get_backend_public_key(), backend_public_key);
    assert_eq!(client.get_admin(), admin);
    assert_eq!(client.get_version(), version);
}

#[test]
#[should_panic(expected = "Error(AlreadyInitialized)")]
fn test_double_initialize() {
    let env = Env::default();
    let contract_id = env.register_contract(None, KycRegistryContract);
    let client = KycRegistryContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let backend_public_key = BytesN::from_array(&env, &[1u8; 32]);
    let version = String::from_str(&env, "1.0.0");

    client.initialize(&backend_public_key, &admin, &version);
    client.initialize(&backend_public_key, &admin, &version);
}

#[test]
fn test_storage_persistence() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register_contract(None, KycRegistryContract);
    let client = KycRegistryContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let backend_public_key = BytesN::from_array(&env, &[1u8; 32]);
    let version = String::from_str(&env, "1.0.0");

    client.initialize(&backend_public_key, &admin, &version);

    // Verify data persists across calls
    assert_eq!(client.get_backend_public_key(), backend_public_key);
    assert_eq!(client.get_admin(), admin);
    assert_eq!(client.get_version(), version);
}
