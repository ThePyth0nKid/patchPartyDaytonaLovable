-- CreateEnum
CREATE TYPE "KeyMode" AS ENUM ('MANAGED', 'BYOK');

-- CreateEnum
CREATE TYPE "SandboxState" AS ENUM ('ACTIVE', 'IDLE_WARN', 'PAUSED', 'RESUMING', 'TERMINATED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "preferredKeyMode" "KeyMode" NOT NULL DEFAULT 'MANAGED';

-- AlterTable
ALTER TABLE "Party" ADD COLUMN     "chatSessionAgentId" TEXT,
ADD COLUMN     "sandboxLastActivityAt" TIMESTAMP(3),
ADD COLUMN     "sandboxPausedAt" TIMESTAMP(3),
ADD COLUMN     "sandboxState" "SandboxState" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "Agent" ADD COLUMN     "schemaVersion" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "PartyEvent" (
    "id" BIGSERIAL NOT NULL,
    "partyId" TEXT NOT NULL,
    "agentId" TEXT,
    "type" TEXT NOT NULL,
    "traceId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartyEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentMetric" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "partyId" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "cacheReadTokens" INTEGER NOT NULL DEFAULT 0,
    "cacheCreateTokens" INTEGER NOT NULL DEFAULT 0,
    "latencyMs" INTEGER NOT NULL DEFAULT 0,
    "sandboxTimeMs" INTEGER NOT NULL DEFAULT 0,
    "toolCalls" JSONB,
    "costUsd" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PickDecision" (
    "id" TEXT NOT NULL,
    "partyId" TEXT NOT NULL,
    "pickedAgentId" TEXT NOT NULL,
    "reasonText" TEXT,
    "comparedAgents" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PickDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatTurn" (
    "id" TEXT NOT NULL,
    "partyId" TEXT NOT NULL,
    "turnIndex" INTEGER NOT NULL,
    "userMessage" TEXT NOT NULL,
    "assistantResponse" TEXT,
    "toolCalls" JSONB,
    "diffApplied" TEXT[],
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "cacheReadTokens" INTEGER NOT NULL DEFAULT 0,
    "cacheCreateTokens" INTEGER NOT NULL DEFAULT 0,
    "latencyMs" INTEGER NOT NULL DEFAULT 0,
    "costUsd" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatTurn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnthropicKey" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "encryptedKey" BYTEA NOT NULL,
    "keyFingerprint" TEXT NOT NULL,
    "validatedAt" TIMESTAMP(3) NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnthropicKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PartyEvent_partyId_createdAt_idx" ON "PartyEvent"("partyId", "createdAt");

-- CreateIndex
CREATE INDEX "PartyEvent_traceId_idx" ON "PartyEvent"("traceId");

-- CreateIndex
CREATE INDEX "PartyEvent_type_createdAt_idx" ON "PartyEvent"("type", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AgentMetric_agentId_key" ON "AgentMetric"("agentId");

-- CreateIndex
CREATE INDEX "AgentMetric_partyId_idx" ON "AgentMetric"("partyId");

-- CreateIndex
CREATE INDEX "AgentMetric_createdAt_idx" ON "AgentMetric"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PickDecision_partyId_key" ON "PickDecision"("partyId");

-- CreateIndex
CREATE INDEX "PickDecision_createdAt_idx" ON "PickDecision"("createdAt");

-- CreateIndex
CREATE INDEX "ChatTurn_partyId_createdAt_idx" ON "ChatTurn"("partyId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ChatTurn_partyId_turnIndex_key" ON "ChatTurn"("partyId", "turnIndex");

-- CreateIndex
CREATE UNIQUE INDEX "AnthropicKey_userId_key" ON "AnthropicKey"("userId");

-- CreateIndex
CREATE INDEX "Party_sandboxState_sandboxLastActivityAt_idx" ON "Party"("sandboxState", "sandboxLastActivityAt");

-- AddForeignKey
ALTER TABLE "PartyEvent" ADD CONSTRAINT "PartyEvent_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartyEvent" ADD CONSTRAINT "PartyEvent_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentMetric" ADD CONSTRAINT "AgentMetric_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentMetric" ADD CONSTRAINT "AgentMetric_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PickDecision" ADD CONSTRAINT "PickDecision_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatTurn" ADD CONSTRAINT "ChatTurn_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnthropicKey" ADD CONSTRAINT "AnthropicKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

