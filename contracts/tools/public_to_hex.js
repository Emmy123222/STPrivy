#!/usr/bin/env node
/**
 * public_to_hex.js
 *
 * Converts a snarkjs public.json (array of public inputs) into the
 * flat big-endian byte format expected by the Soroban kyc-registry contract's
 * verify_proof function.
 *
 * Each public input is a 32-byte big-endian scalar.
 *
 * Output: a single lowercase hex string printed to stdout.
 *
 * Usage:
 *   node public_to_hex.js <path-to-public.json>
 */

'use strict';

const fs = require('fs');
const path = require('path');

const SCALAR_BYTES = 32;

/**
 * Encode a scalar (decimal string) into 32 bytes.
 */
function encodeScalar(value) {
  const buf = Buffer.alloc(SCALAR_BYTES);
  const hex = BigInt(value).toString(16).padStart(64, '0');
  Buffer.from(hex, 'hex').copy(buf, 0);
  return buf;
}

function main() {
  const publicPath = process.argv[2];
  if (!publicPath) {
    console.error('Usage: node public_to_hex.js <public.json>');
    process.exit(1);
  }

  const publicInputs = JSON.parse(fs.readFileSync(path.resolve(publicPath), 'utf8'));

  const parts = publicInputs.map((value) => encodeScalar(value));

  process.stdout.write(Buffer.concat(parts).toString('hex'));
}

main();
