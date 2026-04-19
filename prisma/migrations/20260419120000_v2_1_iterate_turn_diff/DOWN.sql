-- Manual down migration for v2_1_iterate_turn_diff.
-- Prisma doesn't auto-generate this; run only if you need to roll back.

-- AlterTable
ALTER TABLE "ChatTurn" DROP COLUMN IF EXISTS "revertedByTurnIndex",
DROP COLUMN IF EXISTS "diffStats",
DROP COLUMN IF EXISTS "commitSha";

-- AlterTable
ALTER TABLE "Agent" DROP COLUMN IF EXISTS "sandboxTerminatedAt";
