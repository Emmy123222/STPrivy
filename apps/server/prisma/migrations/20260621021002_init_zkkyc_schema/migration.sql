-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUBJECT', 'ISSUER', 'ADMIN');

-- CreateEnum
CREATE TYPE "CredentialStatus" AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ProofStatus" AS ENUM ('PENDING', 'GENERATING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "stellarAddress" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'SUBJECT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallets" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "walletType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dids" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "document" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dids_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "issuers" (
    "id" TEXT NOT NULL,
    "did" TEXT NOT NULL,
    "stellarAddress" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "onChainTxHash" TEXT,

    CONSTRAINT "issuers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credentials" (
    "id" TEXT NOT NULL,
    "issuerId" TEXT NOT NULL,
    "subjectDID" TEXT NOT NULL,
    "type" TEXT[],
    "claims" JSONB NOT NULL,
    "proof" JSONB NOT NULL,
    "credentialHash" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "status" "CredentialStatus" NOT NULL DEFAULT 'ACTIVE',
    "onChainTxHash" TEXT,

    CONSTRAINT "credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revocations" (
    "id" TEXT NOT NULL,
    "credentialId" TEXT NOT NULL,
    "revokedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,
    "onChainTxHash" TEXT,

    CONSTRAINT "revocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zk_proofs" (
    "id" TEXT NOT NULL,
    "subjectDID" TEXT NOT NULL,
    "credentialId" TEXT NOT NULL,
    "circuitId" TEXT NOT NULL,
    "artifact" JSONB,
    "generatedAt" TIMESTAMP(3),
    "status" "ProofStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "zk_proofs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proof_verifications" (
    "id" TEXT NOT NULL,
    "proofId" TEXT NOT NULL,
    "verifierDID" TEXT NOT NULL,
    "result" BOOLEAN NOT NULL,
    "verifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "onChainTxHash" TEXT,
    "metadata" JSONB,

    CONSTRAINT "proof_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verifications" (
    "id" TEXT NOT NULL,
    "subjectDID" TEXT NOT NULL,
    "verifierDID" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "soroban_events" (
    "id" TEXT NOT NULL,
    "contractAddress" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "ledgerSequence" INTEGER NOT NULL,
    "txHash" TEXT NOT NULL,
    "indexedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "soroban_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "eventName" TEXT NOT NULL,
    "actorDID" TEXT NOT NULL,
    "subjectDID" TEXT,
    "resourceId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB NOT NULL,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_stellarAddress_key" ON "users"("stellarAddress");

-- CreateIndex
CREATE UNIQUE INDEX "wallets_publicKey_key" ON "wallets"("publicKey");

-- CreateIndex
CREATE UNIQUE INDEX "dids_userId_key" ON "dids"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "issuers_did_key" ON "issuers"("did");

-- CreateIndex
CREATE UNIQUE INDEX "issuers_stellarAddress_key" ON "issuers"("stellarAddress");

-- CreateIndex
CREATE UNIQUE INDEX "credentials_credentialHash_key" ON "credentials"("credentialHash");

-- CreateIndex
CREATE UNIQUE INDEX "revocations_credentialId_key" ON "revocations"("credentialId");

-- AddForeignKey
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dids" ADD CONSTRAINT "dids_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credentials" ADD CONSTRAINT "credentials_issuerId_fkey" FOREIGN KEY ("issuerId") REFERENCES "issuers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revocations" ADD CONSTRAINT "revocations_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "credentials"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zk_proofs" ADD CONSTRAINT "zk_proofs_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "credentials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proof_verifications" ADD CONSTRAINT "proof_verifications_proofId_fkey" FOREIGN KEY ("proofId") REFERENCES "zk_proofs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
