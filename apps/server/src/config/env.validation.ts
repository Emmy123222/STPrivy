import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid("development", "production", "test")
    .default("development"),

  PORT: Joi.number().default(3000),

  // Database
  DATABASE_URL: Joi.string().required(),

  // Redis
  REDIS_HOST: Joi.string().default("localhost"),
  REDIS_PORT: Joi.number().default(6379),

  // JWT
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default("7d"),

  // Stellar / Horizon
  STELLAR_NETWORK: Joi.string()
    .valid("testnet", "mainnet", "futurenet")
    .default("testnet"),
  HORIZON_URL: Joi.string().uri().required(),
  SOROBAN_RPC_URL: Joi.string().uri().required(),
  STELLAR_SERVER_SECRET: Joi.string().required(),

  // Soroban Contract IDs
  ISSUER_REGISTRY_CONTRACT_ID: Joi.string().required(),
  CREDENTIAL_REGISTRY_CONTRACT_ID: Joi.string().required(),
  REVOCATION_REGISTRY_CONTRACT_ID: Joi.string().required(),

  // Proof verifier contracts — one per circuit (wildcard pattern, validated at runtime)
  PROOF_VERIFIER_CONTRACT_ID_AGE_PROOF: Joi.string().optional(),
  PROOF_VERIFIER_CONTRACT_ID_RESIDENCY_PROOF: Joi.string().optional(),
  PROOF_VERIFIER_CONTRACT_ID_ACCREDITED_INVESTOR: Joi.string().optional(),
  PROOF_VERIFIER_CONTRACT_ID_SANCTIONS_CHECK: Joi.string().optional(),
});
