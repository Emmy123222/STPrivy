#!/usr/bin/env node
/**
 * deploy-contract.js
 *
 * Automated deployment script for the KYC Registry contract using Stellar CLI.
 * Handles building, uploading, deploying, initializing, and setting verification keys.
 *
 * Usage:
 *   node deploy-contract.js
 *
 * Environment variables required:
 *   - STELLAR_SECRET: The deployer account secret key
 *   - ADMIN_ADDRESS: The admin address for the contract
 *   - NETWORK: "testnet" or "mainnet" (default: testnet)
 *   - RPC_URL: RPC endpoint (default: testnet URL)
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const NETWORK = process.env.NETWORK || 'testnet';
const RPC_URL = process.env.RPC_URL || (NETWORK === 'mainnet' 
  ? 'https://soroban.stellar.org' 
  : 'https://soroban-testnet.stellar.org');
const NETWORK_PASSPHRASE = NETWORK === 'mainnet'
  ? 'Public Global Stellar Network ; September 2015'
  : 'Test SDF Network ; September 2015';

const STELLAR_SECRET = process.env.STELLAR_SECRET;
const ADMIN_ADDRESS = process.env.ADMIN_ADDRESS;

if (!STELLAR_SECRET) {
  console.error('Error: STELLAR_SECRET environment variable is required');
  process.exit(1);
}

if (!ADMIN_ADDRESS) {
  console.error('Error: ADMIN_ADDRESS environment variable is required');
  process.exit(1);
}

// Paths
const CONTRACTS_DIR = __dirname;
const WASM_PATH = path.join(CONTRACTS_DIR, 'soroban/kyc_registry/target/wasm32v1-none/release/kyc_registry.wasm');
const VK_PATH = path.join(CONTRACTS_DIR, '../circuits/age-proof/target/verification_key.json');
const VK_TO_HEX_SCRIPT = path.join(CONTRACTS_DIR, 'tools/vk_to_hex.js');

// Colors for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function execCommand(command) {
  log(`Executing: ${command}`, 'blue');
  try {
    return execSync(command, { encoding: 'utf-8', stdio: 'pipe' });
  } catch (error) {
    log(`Command failed: ${error.message}`, 'yellow');
    throw error;
  }
}

function main() {
  log('=== KYC Registry Contract Deployment ===', 'green');
  log(`Network: ${NETWORK}`, 'blue');
  log(`RPC URL: ${RPC_URL}`, 'blue');
  log(`Admin: ${ADMIN_ADDRESS}`, 'blue');

  // Step 1: Build the contract
  log('\n[1/6] Building contract...', 'yellow');
  execCommand('cargo build --manifest-path soroban/kyc_registry/Cargo.toml --target wasm32v1-none --release');

  // Check if WASM exists
  if (!fs.existsSync(WASM_PATH)) {
    log(`Error: WASM file not found at ${WASM_PATH}`, 'yellow');
    process.exit(1);
  }
  log('Contract built successfully', 'green');

  // Step 2: Upload WASM
  log('\n[2/6] Uploading WASM...', 'yellow');
  const uploadCmd = `stellar contract upload --network ${NETWORK} --network-passphrase "${NETWORK_PASSPHRASE}" --rpc-url ${RPC_URL} --source-account ${STELLAR_SECRET} --wasm ${WASM_PATH}`;
  const uploadOutput = execCommand(uploadCmd);
  const wasmHash = uploadOutput.trim().split('\n').pop();
  log(`WASM hash: ${wasmHash}`, 'green');

  // Step 3: Deploy contract
  log('\n[3/6] Deploying contract...', 'yellow');
  const deployCmd = `stellar contract deploy --network ${NETWORK} --network-passphrase "${NETWORK_PASSPHRASE}" --rpc-url ${RPC_URL} --source-account ${STELLAR_SECRET} --wasm-hash ${wasmHash}`;
  const deployOutput = execCommand(deployCmd);
  const contractId = deployOutput.match(/([A-Z0-9]{56})/)[0];
  log(`Contract ID: ${contractId}`, 'green');

  // Step 4: Initialize contract
  log('\n[4/6] Initializing contract...', 'yellow');
  const initCmd = `stellar contract invoke --network ${NETWORK} --network-passphrase "${NETWORK_PASSPHRASE}" --rpc-url ${RPC_URL} --source-account ${STELLAR_SECRET} --id ${contractId} -- initialize --backend_public_key 0000000000000000000000000000000000000000000000000000000000000000 --admin ${ADMIN_ADDRESS} --version 1.0.0`;
  execCommand(initCmd);
  log('Contract initialized successfully', 'green');

  // Step 5: Upload verification key
  log('\n[5/6] Uploading verification key...', 'yellow');
  const vkHex = execCommand(`node ${VK_TO_HEX_SCRIPT} ${VK_PATH}`);
  log(`VK hex length: ${vkHex.length} characters`, 'blue');

  const setVkCmd = `stellar contract invoke --network ${NETWORK} --network-passphrase "${NETWORK_PASSPHRASE}" --rpc-url ${RPC_URL} --source-account ${STELLAR_SECRET} --id ${contractId} -- set_vk --admin ${ADMIN_ADDRESS} --circuit_id age-proof --vk ${vkHex}`;
  execCommand(setVkCmd);
  log('Verification key uploaded successfully', 'green');

  // Step 6: Test proof verification
  log('\n[6/6] Testing proof verification...', 'yellow');
  const proofHex = execCommand('node tools/proof_to_hex.js ../circuits/age-proof/target/proof.json');
  const publicInputsHex = execCommand('node tools/public_to_hex.js ../circuits/age-proof/target/public.json');
  
  const verifyCmd = `stellar contract invoke --network ${NETWORK} --network-passphrase "${NETWORK_PASSPHRASE}" --rpc-url ${RPC_URL} --source-account ${STELLAR_SECRET} --id ${contractId} -- verify_proof --circuit_id age-proof --proof ${proofHex} --public_inputs '["${publicInputsHex}"]'`;
  const verifyOutput = execCommand(verifyCmd);
  log(`Proof verification result: ${verifyOutput.trim()}`, 'green');

  // Summary
  log('\n=== Deployment Summary ===', 'green');
  log(`Contract ID: ${contractId}`, 'green');
  log(`Network: ${NETWORK}`, 'green');
  log(`Admin: ${ADMIN_ADDRESS}`, 'green');
  log('\nAdd this to your .env file:', 'yellow');
  log(`KYC_REGISTRY_CONTRACT_ID=${contractId}`, 'green');
}

main();
