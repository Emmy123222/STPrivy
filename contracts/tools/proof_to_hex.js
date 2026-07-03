#!/usr/bin/env node
/**
 * proof_to_hex.js
 *
 * Converts a snarkjs proof.json (Groth16, BN254/alt_bn128) into the
 * flat big-endian byte format expected by the Soroban kyc-registry contract's
 * verify_proof function.
 *
 * Layout:
 *   pi_a (G1) : 64 bytes
 *   pi_b (G2) : 128 bytes
 *   pi_c (G1) : 64 bytes
 *   Total: 256 bytes
 *
 * Output: a single lowercase hex string printed to stdout.
 *
 * Usage:
 *   node proof_to_hex.js <path-to-proof.json>
 */

'use strict';

const fs = require('fs');
const path = require('path');

const G1_BYTES = 64;
const G2_BYTES = 128;

/**
 * Encode a G1 point [x, y] (decimal strings) into 64 bytes (2 × 32-byte coords).
 */
function encodeG1(point) {
  const buf = Buffer.alloc(G1_BYTES);
  const x = BigInt(point[0]).toString(16).padStart(64, '0');
  const y = BigInt(point[1]).toString(16).padStart(64, '0');
  Buffer.from(x, 'hex').copy(buf, 0);
  Buffer.from(y, 'hex').copy(buf, 32);
  return buf;
}

/**
 * Encode a G2 point [[x0, x1], [y0, y1]] into 128 bytes (4 × 32-byte coords).
 */
function encodeG2(point) {
  const buf = Buffer.alloc(G2_BYTES);
  const coords = [point[0][0], point[0][1], point[1][0], point[1][1]];
  coords.forEach((c, i) => {
    const hex = BigInt(c).toString(16).padStart(64, '0');
    Buffer.from(hex, 'hex').copy(buf, i * 32);
  });
  return buf;
}

function main() {
  const proofPath = process.argv[2];
  if (!proofPath) {
    console.error('Usage: node proof_to_hex.js <proof.json>');
    process.exit(1);
  }

  const proof = JSON.parse(fs.readFileSync(path.resolve(proofPath), 'utf8'));

  const parts = [
    encodeG1(proof.pi_a),
    encodeG2(proof.pi_b),
    encodeG1(proof.pi_c),
  ];

  process.stdout.write(Buffer.concat(parts).toString('hex'));
}

main();
