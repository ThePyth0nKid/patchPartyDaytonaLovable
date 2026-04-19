-- Down-migration for 20260418200000_v2_telemetry_chat_byok.
--
-- Prisma has no native down-migration mechanism. Apply manually via
-- `psql $DATABASE_URL -f DOWN.sql` if this migration must be rolled back.
--
-- Order: drop FKs (implicit via table drop) → drop tables → drop Party/Agent
-- columns → drop enums. Columns on User are dropped last because the enum
-- depends on them.

BEGIN;

-- Tables added by this migration (drop in dependency-safe order).
DROP TABLE IF EXISTS "ChatTurn";
DROP TABLE IF EXISTS "AnthropicKey";
DROP TABLE IF EXISTS "PickDecision";
DROP TABLE IF EXISTS "AgentMetric";
DROP TABLE IF EXISTS "PartyEvent";

-- Party columns added by this migration.
DROP INDEX IF EXISTS "Party_sandboxState_sandboxLastActivityAt_idx";
ALTER TABLE "Party"
  DROP COLUMN IF EXISTS "chatSessionAgentId",
  DROP COLUMN IF EXISTS "sandboxLastActivityAt",
  DROP COLUMN IF EXISTS "sandboxPausedAt",
  DROP COLUMN IF EXISTS "sandboxState";

-- Agent column added by this migration.
ALTER TABLE "Agent" DROP COLUMN IF EXISTS "schemaVersion";

-- User column added by this migration.
ALTER TABLE "User" DROP COLUMN IF EXISTS "preferredKeyMode";

-- Enums (safe to drop once no column references them).
DROP TYPE IF EXISTS "SandboxState";
DROP TYPE IF EXISTS "KeyMode";

COMMIT;
