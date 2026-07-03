#!/usr/bin/env node
/**
 * vk_to_hex.js
 *
 * Converts a snarkjs verification_key.json (Groth16, BN254/alt_bn128) into the
 * flat big-endian byte format expected by the Soroban kyc-registry contract's
 * set_vk / verify_proof functions.
 *
 * Layout:
 *   alpha_g1 : 64 bytes
 *   beta_g2  : 128 bytes
 *   gamma_g2 : 128 bytes
 *   delta_g2 : 128 bytes
 *   IC[0]    : 64 bytes
 *   IC[1]    : 64 bytes
 *   ...
 *
 * Output: a single lowercase hex string printed to stdout.
 *
 * Usage:
 *   node vk_to_hex.js <path-to-verification_key.json>
 */

'use strict';

const fs = require('fs');
const path = require('path');

const G1_BYTES = 64;
const G2_BYTES = 128; // two G1-sized coordinates in G2

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
  const vkPath = process.argv[2];
  if (!vkPath) {
    console.error('Usage: node vk_to_hex.js <verification_key.json>');
    process.exit(1);
  }

  const vk = JSON.parse(fs.readFileSync(path.resolve(vkPath), 'utf8'));

  const parts = [
    encodeG1(vk.vk_alpha_1),
    encodeG2(vk.vk_beta_2),
    encodeG2(vk.vk_gamma_2),
    encodeG2(vk.vk_delta_2),
    ...vk.IC.map((ic) => encodeG1(ic)),
  ];

  process.stdout.write(Buffer.concat(parts).toString('hex'));
}

main();
