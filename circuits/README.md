# Circom ZK Circuits (Groth16)

This directory contains Circom circuits that generate Groth16 zero-knowledge proofs
for the STPrivy zkKYC system. Proofs are verified on-chain via the Soroban
`kyc-registry` contract using BLS12-381 pairing checks.

## Prerequisites

- [circom](https://docs.circom.io/getting-started/installation/) 2.0+
- [snarkjs](https://github.com/iden3/snarkjs) `npm install -g snarkjs`
- Node.js 18+
- Powers of Tau file: `circuits/powersOfTau28_hez_final_12.ptau`
  (auto-downloaded by `contracts/deploy.sh`)

## Circuit Structure

```
circuit-name/
├── src/
│   └── main.circom       # Circuit logic
├── input.json            # Sample inputs for testing
└── target/               # Generated artifacts (gitignored)
    ├── main.r1cs
    ├── main_js/
    │   └── main.wasm
    ├── circuit-name.zkey
    └── verification_key.json
```

## Available Circuits

### age-proof
Proves `age >= threshold` without revealing actual age.
- Private: `age`
- Public: `threshold`

### residency-proof
Proves a country code is in an allowed list of 10 countries.
- Private: `country_code` (encoded as `charCode[0] * 256 + charCode[1]`)
- Public: `allowed_countries[10]`, `allowed_count`

### accredited-investor
Proves the subject is accredited (`flag = 1`) and at least 18.
- Private: `accredited` (0/1), `age`

### sanctions-check
Proves the subject's hash does NOT equal the sanctions list commitment.
- Private: `sanctions_hash`
- Public: `clean_list_commitment`

## Development Workflow

### Compile a circuit
```bash
cd circuits/age-proof
circom src/main.circom --r1cs --wasm --output target/
```

### Trusted setup (one-time per circuit)
```bash
# Download ptau (if not already present)
curl -L -o ../powersOfTau28_hez_final_12.ptau \
  https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_12.ptau

snarkjs groth16 setup target/main.r1cs ../powersOfTau28_hez_final_12.ptau target/circuit_0000.zkey
snarkjs zkey contribute target/circuit_0000.zkey target/age-proof.zkey --name="dev" -e="entropy"
snarkjs zkey export verificationkey target/age-proof.zkey target/verification_key.json
```

### Generate a proof
```bash
# Generate witness
node target/main_js/generate_witness.js target/main_js/main.wasm input.json target/witness.wtns

# Generate Groth16 proof
snarkjs groth16 prove target/age-proof.zkey target/witness.wtns target/proof.json target/public.json

# Verify locally
snarkjs groth16 verify target/verification_key.json target/public.json target/proof.json
```

## On-Chain Verification

The `contracts/deploy.sh` script:
1. Compiles all circuits
2. Runs trusted setup to produce `.zkey` files
3. Exports `verification_key.json` for each circuit
4. Encodes VKs and uploads them to the `kyc-registry` Soroban contract via `set_vk`

The server's `ProofGenerationWorker` uses `snarkjs groth16 prove` to generate proofs,
then `ProofService` calls the `verify_proof` method on the contract to verify on-chain.

## Encoding

Country codes are encoded as `charCode[0] * 256 + charCode[1]`:
- US → 85*256 + 83 = 21843
- GB → 71*256 + 66 = 18242
- ...

This produces a single field element for the circuit input.
