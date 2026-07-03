#!/usr/bin/env bash
# Deploy and initialize all STPrivy contracts (Circom/Groth16 edition).
#
# For each circuit this script:
#   1. Compiles the .circom file with circom
#   2. Runs the trusted setup (groth16 setup + contribution) to produce a .zkey
#   3. Exports the verification key JSON
#   4. Encodes the VK into Soroban bytes format
#   5. Deploys the kyc-registry contract
#   6. Calls set_vk on the contract for each circuit
#
# Usage:
#   STELLAR_SECRET=S... ADMIN_ADDRESS=G... [NETWORK=testnet] ./deploy.sh
#
# Requirements: stellar CLI, cargo, rust wasm32v1-none target, circom, snarkjs, node

set -euo pipefail

NETWORK="${NETWORK:-testnet}"
SOURCE_ACCOUNT="${STELLAR_SECRET:?STELLAR_SECRET is required}"
ADMIN="${ADMIN_ADDRESS:?ADMIN_ADDRESS is required}"

RPC_URL="https://soroban-testnet.stellar.org"
[ "$NETWORK" = "mainnet" ] && RPC_URL="https://soroban.stellar.org"

CONTRACTS_DIR="$(cd "$(dirname "$0")" && pwd)"
CIRCUITS_DIR="$CONTRACTS_DIR/../circuits"
WASM_OUT="$CONTRACTS_DIR/soroban/kyc_registry/target/wasm32v1-none/release"

# Powers of Tau file (BLS12-381, size 12 supports circuits up to 4096 constraints)
PTAU_FILE="$CIRCUITS_DIR/powersOfTau28_hez_final_12.ptau"

# ── 0. Download Powers of Tau if missing ──────────────────────────────────────
if [ ! -f "$PTAU_FILE" ]; then
  echo "==> Downloading Powers of Tau file (BLS12-381, size 12)..."
  curl -L -o "$PTAU_FILE" \
    "https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_12.ptau"
fi

# ── 1. Build KYC registry contract ───────────────────────────────────────────
echo "==> Building kyc-registry contract..."
cargo build \
  --manifest-path "$CONTRACTS_DIR/soroban/kyc_registry/Cargo.toml" \
  --target wasm32v1-none --release

KYC_WASM="$WASM_OUT/kyc_registry.wasm"

# ── 2. Upload and deploy kyc-registry ────────────────────────────────────────
echo "==> Uploading kyc-registry..."
KYC_WASM_HASH=$(stellar contract upload \
  --network "$NETWORK" --rpc-url "$RPC_URL" \
  --source-account "$SOURCE_ACCOUNT" --wasm "$KYC_WASM" 2>/dev/null)
echo "    wasm_hash: $KYC_WASM_HASH"

echo "==> Deploying kyc-registry..."
KYC_CONTRACT_ID=$(stellar contract deploy \
  --network "$NETWORK" --rpc-url "$RPC_URL" \
  --source-account "$SOURCE_ACCOUNT" --wasm-hash "$KYC_WASM_HASH" 2>/dev/null)
echo "    contract_id: $KYC_CONTRACT_ID"

# ── 3. Compile circuits, run trusted setup, upload VKs ───────────────────────
compile_and_upload_vk() {
  local circuit_id="$1"
  local circuit_dir="$CIRCUITS_DIR/$circuit_id"
  local circom_file="$circuit_dir/src/main.circom"
  local target_dir="$circuit_dir/target"

  mkdir -p "$target_dir"

  echo "==> Compiling circuit: $circuit_id..."
  circom "$circom_file" --r1cs --wasm --output "$target_dir" 2>/dev/null

  local r1cs="$target_dir/${circuit_id//-/_}.r1cs"
  # circom names the r1cs after the component, not the directory; use main.r1cs
  [ -f "$r1cs" ] || r1cs="$target_dir/main.r1cs"

  local zkey0="$target_dir/circuit_0000.zkey"
  local zkey_final="$target_dir/$circuit_id.zkey"
  local vkey="$target_dir/verification_key.json"

  if [ ! -f "$zkey_final" ]; then
    echo "==> Trusted setup for $circuit_id..."
    snarkjs groth16 setup "$r1cs" "$PTAU_FILE" "$zkey0"
    snarkjs zkey contribute "$zkey0" "$zkey_final" \
      --name="initial-contribution" -v -e="deploy-entropy-$(date +%s)"
    rm -f "$zkey0"
  fi

  echo "==> Exporting verification key for $circuit_id..."
  snarkjs zkey export verificationkey "$zkey_final" "$vkey"

  echo "==> Encoding VK for Soroban ($circuit_id)..."
  # Use the circom-to-soroban helper (Node.js script) to convert JSON VK to hex
  local vk_hex
  vk_hex=$(node "$CONTRACTS_DIR/tools/vk_to_hex.js" "$vkey")

  echo "==> Uploading VK on-chain for $circuit_id..."
  stellar contract invoke \
    --network "$NETWORK" --rpc-url "$RPC_URL" \
    --source-account "$SOURCE_ACCOUNT" \
    --id "$KYC_CONTRACT_ID" \
    -- set_vk \
    --admin "$ADMIN" \
    --circuit_id "$circuit_id" \
    --vk "$vk_hex"

  echo "    OK: $circuit_id VK uploaded"
}

compile_and_upload_vk "age-proof"
compile_and_upload_vk "residency-proof"
compile_and_upload_vk "accredited-investor"
compile_and_upload_vk "sanctions-check"

# ── 4. Print .env block ───────────────────────────────────────────────────────
echo ""
echo "==> Add to your .env:"
echo "KYC_REGISTRY_CONTRACT_ID=$KYC_CONTRACT_ID"
