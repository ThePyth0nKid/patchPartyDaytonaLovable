-- AlterTable
ALTER TABLE "Agent" ADD COLUMN     "sandboxTerminatedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ChatTurn" ADD COLUMN     "commitSha" TEXT,
ADD COLUMN     "diffStats" JSONB,
ADD COLUMN     "revertedByTurnIndex" INTEGER;
