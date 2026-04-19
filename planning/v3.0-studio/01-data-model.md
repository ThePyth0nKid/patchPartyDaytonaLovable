# 01-data-model.md — PatchParty v3.0 Studio Data Model (Squad A / Architect, Round 3)

**Status:** Proposal. Depends on Concept v2.0 (`planning/v3.0-studio/00-vision.md`) and V2.0 foundation (`planning/v2.0-chat-iterate/README.md`). Seven ADRs inline. All schema snippets are copy-paste-ready Prisma.

**Scope:** The schema that supports Brownfield (V2.0) + Greenfield (V2.5+) + Autopilot + Custom Agents + Assets + Loser-Branches, in a single Postgres. No microservices, no event store. Extends the current schema; does not replace it.

---

## 1. Entity-Relationship Diagram (ASCII)

```
User ─────────┬──────────────────────────────────────────────────────────────────┐
              │ 1:N                                                              │
              ▼                                                                  │
           Project ◄───────── Budget (1:1, required if autopilot)                │
              │ 1:N                                                              │
              ├────────► Party (existing; one Project can hold many Parties)     │
              │             │ 1:N                                                │
              │             └────► Agent (existing) ──► AgentMetric (1:1)        │
              │                                                                  │
              ├────────► RaceRun ────────► RaceCandidate (1:N, typically 5)      │
              │             │                │                                   │
              │             │                ├──► EditOverlay (0:N per cand.)    │
              │             │                └──► LoserBranch (0:1, if not won)  │
              │             │                                                    │
              │             └──► PickDecision (1:1 when resolved)                │
              │                                                                  │
              ├────────► Asset ◄──── AssetVersion (N:1)                          │
              │             │                                                    │
              │             └──► AssetPin (join: Asset ↔ RaceRun)                │
              │                                                                  │
              ├────────► CustomAgent (0:N per project; 0:N per user if global)   │
              │             │                                                    │
              │             └──► SquadComposition (join: CustomAgent ↔ RaceRun)  │
              │                                                                  │
              ├────────► PartyEvent (existing; now project-scoped too)           │
              │                                                                  │
              └────────► ProjectStateLog (audit trail for state-machine)         │

Legend: ◄──── = FK points to target. 1:N = one-to-many.
Party is retained AS-IS; a nullable projectId is added. All new models attach
to Project, which in Brownfield V2.0 is auto-created as a wrapper.
```

Key invariants:
- Every Party belongs to exactly one Project (wrapper-auto-created in Brownfield back-compat).
- Every RaceRun belongs to exactly one Project. A RaceRun MAY link to one Party (Story-Implementation race) or to none (Stories / Stack / Wireframes races).
- Exactly one RaceCandidate per RaceRun has `isWinner = true` once the race is resolved; zero before.
- LoserBranch is created lazily for non-winning candidates — only for candidates the user/autopilot actually saw (diversity-judge silent re-rolls are discarded, not preserved).
- Asset has N `AssetVersion` rows; the "current" pointer is a denormalized `currentVersionId` on Asset.
- CustomAgent with `scope = 'GLOBAL'` has `projectId = null` and belongs to a User; with `scope = 'PROJECT'` has `projectId` set.

---

## 2. Prisma Schema Additions (copy-paste-ready)

The schema below is **additive**. Nothing in the existing `schema.prisma` is deleted. `Party.projectId` becomes nullable first; after backfill, a separate migration may make it `NOT NULL` (see §3).

```prisma
// ─── V3.0 Studio enums ──────────────────────────────────────────────────────

enum ProjectKind {
  BROWNFIELD   // Existing repo; started from an issue (V2.0 flow)
  GREENFIELD   // Brief → Stories → Stack → Repo-Genesis (V2.5+)
}

enum AutonomyMode {
  DIRECTOR     // Human picks at every race (default)
  AUTOPILOT    // Budget-bounded auto-pick; requires Budget
}

enum ProjectState {
  DRAFT            // Created, no work yet
  BRIEF_PENDING    // Brief-clarification phase active (greenfield only)
  STORIES_PENDING  // Stories race awaiting pick
  STACK_PENDING    // Stack decision active
  REPO_PENDING     // Repo-Genesis running
  IMPLEMENTING     // At least one Party running a Story-Implementation race
  QUALITY_PASS     // All stories done; quality phase
  RELEASED         // PR merged / deploy scripted
  ARCHIVED         // User-archived; read-only
  HALTED           // Budget hard-cap hit; in-flight races complete, no new races
}

enum RacePhase {
  STORIES          // Phase 2 — text, no sandbox
  WIREFRAMES       // Phase 3 — image assets, no sandbox
  STACK            // Phase 4 — text/ADR, no sandbox (linear in V2.5, race V2.7)
  IMPLEMENTATION   // Phase 6 — code, sandbox
  // Future phases registered here; schema does not change.
}

enum RaceStatus {
  RUNNING          // Candidates being generated
  AWAITING_PICK    // All candidates produced; waiting for Director/Autopilot
  PICKED           // A winner was selected; losers pending branch-persistence
  RESOLVED         // All losers persisted; race is immutable
  ABANDONED        // User closed race without picking (rare; treated as rollback)
}

enum CandidateKind {
  CODE             // Implementation race: artifact lives in git
  TEXT             // Stories, Stack ADR: artifact is markdown
  IMAGE            // Wireframes: artifact is a file reference
}

enum EditOverlayKind {
  TEXT_DIFF        // Unified diff applied to TEXT candidate artifact
  FIELD_PATCH      // JSON-patch on structured TEXT artifact (e.g. Story AC list)
  CODE_DIFF        // Unified diff applied to CODE candidate branch
  ASSET_REPLACE    // User replaced a generated asset with an uploaded one
}

enum LoserPersistKind {
  GIT_BRANCH       // CODE candidate — lives at losers/{phase}-{shortid}
  JSON_ARTIFACT    // TEXT/IMAGE candidate — lives in LoserBranch.artifact
}

enum AssetKind {
  BRIEF
  WIREFRAME
  LOGO
  SCREENSHOT
  DEMO_VIDEO
  MARKETING_COPY
  ADR
  TRANSCRIPT
  OTHER
}

enum AssetStorage {
  POSTGRES_INLINE  // <= 64 KB, in .contentText/.contentBytes
  S3_LIKE          // Cloudflare R2 / S3; external URL with signed access
  GIT_TRACKED      // Lives in the project repo at assets/<path>
}

enum CustomAgentScope {
  PROJECT          // Visible only within Project.id
  GLOBAL           // Visible to creating User across all their Projects
}

enum BudgetStatus {
  UNSET            // Director mode with no budget
  OK               // < 50% spent
  WATERMARK_50
  WATERMARK_75
  WATERMARK_90
  HALTED           // 100% hit; ProjectState flips to HALTED
}

// ─── Project: new root model ────────────────────────────────────────────────

model Project {
  id              String       @id @default(cuid())
  userId          String
  name            String
  kind            ProjectKind
  autonomyMode    AutonomyMode @default(DIRECTOR)
  state           ProjectState @default(DRAFT)

  // Brownfield back-compat: if this Project wraps a single legacy Party,
  // the Party.projectId is set. Greenfield projects start with no Party.
  repoOwner       String?      // populated after Repo-Genesis
  repoName        String?
  defaultBranch   String?      // e.g. "main"

  // Denormalized pointers for fast dashboard reads. Nullable because order is
  // Brief → Stories → Stack → Genesis → Party (not all exist early).
  currentBriefAssetId   String?
  currentStoriesRaceId  String?
  currentStackRaceId    String?

  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt
  archivedAt      DateTime?

  user            User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  budget          Budget?
  parties         Party[]
  races           RaceRun[]
  assets          Asset[]
  customAgents    CustomAgent[]
  stateLogs       ProjectStateLog[]

  @@index([userId, state])
  @@index([userId, updatedAt])
}
```

Reasoning per field:
- `userId` is the **tenant boundary**. Every query from a user-context must filter by `userId` (ADR-007).
- `kind` is load-bearing for UI routing (Brownfield shows issue-centric view; Greenfield shows pipeline view).
- `state` is the machine the orchestrator reads/writes; see ADR-003.
- `repoOwner`/`repoName` are nullable to allow Greenfield projects before Repo-Genesis.
- `currentBriefAssetId` / `currentStoriesRaceId` / `currentStackRaceId` are **denormalized pointers** to the Asset/RaceRun that represents the canonical output of each phase. They exist to avoid scanning RaceRun tables for "what's the current brief?" on every UI load. Loser-containing races still exist but are not the "current" pointer.

```prisma
// ─── Party: amended, NOT replaced ───────────────────────────────────────────

model Party {
  id             String      @id
  userId         String
  projectId      String?     // NEW: nullable for back-compat; backfill required

  issueUrl       String
  issueTitle     String
  issueBody      String      @db.Text
  repoOwner      String
  repoName       String
  issueNumber    Int
  classification Json?
  status         PartyStatus @default(RUNNING)
  createdAt      DateTime    @default(now())
  updatedAt      DateTime    @updatedAt
  pickedPersona  String?
  prUrl          String?

  // V2.0 sandbox-lifecycle fields retained unchanged
  sandboxState           SandboxState @default(ACTIVE)
  sandboxLastActivityAt  DateTime?
  sandboxPausedAt        DateTime?
  chatSessionAgentId     String?

  user    User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  project Project? @relation(fields: [projectId], references: [id], onDelete: SetNull)
  agents  Agent[]

  // NEW: the RaceRun that produced this Party's implementation race, if any.
  implementationRaceId String?   @unique
  implementationRace   RaceRun?  @relation("PartyImplementationRace", fields: [implementationRaceId], references: [id])

  @@index([userId, createdAt])
  @@index([projectId, createdAt])
  @@index([sandboxState, sandboxLastActivityAt])
}
```

Reasoning:
- `projectId` is **nullable** so existing V2.0 rows keep working without a migration that rewrites every row in one pass. See §3 for the zero-downtime backfill.
- `Project? @relation ... onDelete: SetNull` — if a Project is deleted, Parties survive (they carry their own `userId`). We do not cascade-kill Parties on Project deletion; that would be a footgun for Brownfield where a user might want to decouple an old Party from an experimental Project.
- `implementationRaceId` is a **unique FK** enforcing "a Party has at most one Implementation RaceRun". Pre-V2.0 Parties have this NULL.

```prisma
// ─── RaceRun + RaceCandidate: generic race abstraction ──────────────────────

model RaceRun {
  id           String      @id @default(cuid())
  projectId    String
  phase        RacePhase
  status       RaceStatus  @default(RUNNING)

  // Input: what went INTO the race. Stored as JSON for generality across
  // phases. Stories race: {brief, userNotes}. Implementation race:
  // {storyId, acceptanceCriteria, repoSnapshotSha}. Validated by zod at
  // the orchestrator boundary, not by Prisma — schemas vary per phase.
  input        Json

  // Denormalized persona/squad ids used for this race (copied from
  // CustomAgent/Persona at race-start so the answer survives later
  // re-config of the persona pool).
  squadSnapshot Json

  // Budget accounting (all USD, 4 decimals)
  budgetReserved Decimal    @default(0) @db.Decimal(10, 4)
  budgetSpent    Decimal    @default(0) @db.Decimal(10, 4)

  createdAt    DateTime    @default(now())
  resolvedAt   DateTime?

  project      Project        @relation(fields: [projectId], references: [id], onDelete: Cascade)
  candidates   RaceCandidate[]
  pick         PickDecision?  // existing V2.0 model reused; see §2.7
  pins         AssetPin[]
  squadUses    SquadComposition[]

  // Reverse: if this is an Implementation race, a Party points here.
  implementingParty Party? @relation("PartyImplementationRace")

  @@index([projectId, createdAt])
  @@index([projectId, phase, status])
}

model RaceCandidate {
  id           String         @id @default(cuid())
  raceRunId    String
  position     Int            // 1..N — stable UI ordering and keyboard shortcut
  kind         CandidateKind

  // Which agent produced this candidate. For default personas, this is the
  // PersonaId; for CustomAgent, it's CustomAgent.id. Stored as string so the
  // model is agnostic (no FK; FK would force a nullable-polymorphic pattern).
  producerId   String
  producerKind String          // 'persona' | 'customAgent'

  // Output artifact — shape depends on `kind`.
  // CODE: {branchName, commitSha, fileTree: [...], sandboxId?, previewUrl?}
  // TEXT: {markdown, rationale, acChecklist?, metadata?}
  // IMAGE: {assetId, thumbnailUrl, prompt}
  artifact     Json

  // Diversity-Judge pairwise similarity scores (optional; absent if judge off).
  diversityScore Float?

  // Isolated cost accounting (distinct from AgentMetric for granularity).
  costUsd      Decimal        @default(0) @db.Decimal(10, 4)
  latencyMs    Int            @default(0)

  isWinner     Boolean        @default(false)
  createdAt    DateTime       @default(now())

  raceRun      RaceRun        @relation(fields: [raceRunId], references: [id], onDelete: Cascade)
  edits        EditOverlay[]
  loser        LoserBranch?

  @@unique([raceRunId, position])
  @@unique([raceRunId, producerId])   // same producer cannot race itself twice
  @@index([raceRunId, isWinner])
}
```

Reasoning:
- `input: Json` and `artifact: Json` are the two places we accept polymorphism. See ADR-001 for why we rejected per-phase tables. Validation via zod at the orchestrator.
- `squadSnapshot` immutably records which agents ran. If a user later edits CustomAgent "Sven" to comment in French, the old race still shows "Sven (German, v3)" in the audit trail.
- `producerId` + `producerKind` is a **tagged polymorphic reference**, not a polymorphic FK. We traded referential integrity for schema simplicity; the orchestrator validates producer existence at write time.
- `position` is 1..N, stable — the UI keyboard shortcuts (`1`–`5`) rely on this being stable across reloads.
- `diversityScore` is **nullable** because the Diversity-Judge is configurable and may be off for some phases (e.g. Wireframes, where visual diff is subjective).
- `@@unique([raceRunId, isWinner])` cannot be enforced with a partial unique index in Prisma directly; enforced by **transaction** in the orchestrator plus a Postgres partial unique index added via raw SQL in the migration (`CREATE UNIQUE INDEX race_winner_single ON "RaceCandidate"("raceRunId") WHERE "isWinner" = true`).

```prisma
// ─── EditOverlay: non-destructive user edits ────────────────────────────────

model EditOverlay {
  id             String          @id @default(cuid())
  raceCandidateId String
  userId         String          // who edited
  kind           EditOverlayKind
  sequence       Int             // 1-based; overlays apply in order

  // Payload shape varies by kind:
  // TEXT_DIFF: {before: string, after: string, unifiedDiff: string}
  // FIELD_PATCH: {path: '/acceptanceCriteria/2', op: 'replace', value: '…'}
  // CODE_DIFF: {branchName, commitSha, unifiedDiff}
  // ASSET_REPLACE: {newAssetId, reason}
  payload        Json

  // Free-text reason user provided (optional but PROMPTED — high RLHF value).
  reason         String?         @db.Text

  createdAt      DateTime        @default(now())

  raceCandidate  RaceCandidate   @relation(fields: [raceCandidateId], references: [id], onDelete: Cascade)
  user           User            @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([raceCandidateId, sequence])
  @@index([userId, createdAt])
}
```

Reasoning — see ADR-004. The candidate's `artifact` is frozen the moment it is produced; all user modifications are overlays. Reading the "effective" candidate means applying overlays in `sequence` order.

```prisma
// ─── LoserBranch: first-class loser persistence ─────────────────────────────

model LoserBranch {
  id             String            @id @default(cuid())
  raceCandidateId String           @unique
  persistKind    LoserPersistKind

  // GIT_BRANCH: the branch name losers/{phase}-{shortid}
  // JSON_ARTIFACT: null
  gitBranchName  String?

  // Full artifact snapshot. For GIT_BRANCH this is a thin pointer
  // ({branchName, commitSha, filesCount}); for JSON_ARTIFACT this is the
  // full content (text, structured JSON, image ref). See ADR-002.
  artifact       Json

  // Quick-search fields pulled out of JSON for indexing.
  summary        String?           @db.Text

  // GDPR hook: setting this to non-null makes the loser invisible to all
  // reads except the Project owner's explicit "show tombstoned" query.
  tombstonedAt   DateTime?
  tombstoneReason String?

  createdAt      DateTime          @default(now())

  raceCandidate  RaceCandidate     @relation(fields: [raceCandidateId], references: [id], onDelete: Cascade)

  @@index([persistKind, createdAt])
}
```

```prisma
// ─── Asset + AssetVersion + AssetPin ────────────────────────────────────────

model Asset {
  id                String         @id @default(cuid())
  projectId         String
  kind              AssetKind
  name              String         // user-visible label, unique-ish within project
  storage           AssetStorage

  // Pointer to the version that is "current" — denormalized for fast reads.
  currentVersionId  String?

  // Tags for Bin filtering.
  tags              String[]       @default([])

  createdAt         DateTime       @default(now())
  updatedAt         DateTime       @updatedAt

  project           Project        @relation(fields: [projectId], references: [id], onDelete: Cascade)
  versions          AssetVersion[] @relation("AssetVersions")
  currentVersion    AssetVersion?  @relation("AssetCurrentVersion", fields: [currentVersionId], references: [id])
  pins              AssetPin[]

  @@index([projectId, kind])
  @@index([projectId, updatedAt])
}

model AssetVersion {
  id              String       @id @default(cuid())
  assetId         String
  version         Int          // monotonic per asset

  // Inline OR external; validated in application code per storage type.
  contentText     String?      @db.Text
  contentBytes    Bytes?       // <= 64 KB hard-cap for POSTGRES_INLINE
  externalUrl     String?      // S3_LIKE / GIT_TRACKED
  contentType     String       // MIME type, e.g. 'image/png', 'text/markdown'
  byteSize        Int

  // Where did this version come from? Could be user-upload, race-output,
  // edit-overlay, or AI-generation.
  sourceKind      String       // 'upload' | 'race' | 'edit' | 'generated'
  sourceRaceCandidateId String?
  sourceEditOverlayId   String?

  createdAt       DateTime     @default(now())
  createdByUserId String?

  asset           Asset        @relation("AssetVersions", fields: [assetId], references: [id], onDelete: Cascade)
  currentOf       Asset?       @relation("AssetCurrentVersion")

  @@unique([assetId, version])
  @@index([sourceRaceCandidateId])
}

// Pin = "this asset is standing context for this race".
model AssetPin {
  id           String    @id @default(cuid())
  assetId      String
  raceRunId    String
  // Optional: a specific version pinned (else current). Frozen after race start.
  assetVersionId String?

  // Where in the prompt was this asset cited by a candidate? The race
  // orchestrator stamps this so the UI can render "Candidate 3 used: Brief v2"
  // without re-parsing prompts.
  citedByCandidateIds String[] @default([])

  createdAt    DateTime  @default(now())

  asset        Asset     @relation(fields: [assetId], references: [id], onDelete: Cascade)
  raceRun      RaceRun   @relation(fields: [raceRunId], references: [id], onDelete: Cascade)

  @@unique([assetId, raceRunId])
  @@index([raceRunId])
}
```

See ADR-006 for the rationale on three-way storage and the pin-vs-citation distinction.

```prisma
// ─── CustomAgent + SquadComposition ─────────────────────────────────────────

model CustomAgent {
  id             String            @id @default(cuid())
  userId         String            // owner; always required
  projectId      String?           // null iff scope = GLOBAL
  scope          CustomAgentScope

  name           String
  description    String            @db.Text
  systemPrompt   String            @db.Text

  // Allow-list of tools this agent may call. See ADR-007.
  // Stored as an array of strings matching a registered tool name.
  // Empty array = no tools (pure-text persona).
  toolsAllowed   String[]          @default([])

  // Model hint. Orchestrator may override for cost policy.
  modelHint      String?           // e.g. 'claude-opus-4-7'

  // Versioning — editing a CustomAgent bumps version. Past RaceRuns carry
  // an immutable squadSnapshot (see RaceRun.squadSnapshot) so edits do not
  // rewrite history.
  version        Int               @default(1)

  createdAt      DateTime          @default(now())
  updatedAt      DateTime          @updatedAt

  user           User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  project        Project?          @relation(fields: [projectId], references: [id], onDelete: Cascade)
  compositions   SquadComposition[]

  @@unique([userId, name, scope])
  @@index([projectId])
}

// Join: which CustomAgents participated in which RaceRun, in which seat.
model SquadComposition {
  id             String       @id @default(cuid())
  raceRunId      String
  customAgentId  String
  customAgentVersion Int      // pinned at race-start, immutable
  seat           Int          // 1..N; determines RaceCandidate.position

  raceRun        RaceRun      @relation(fields: [raceRunId], references: [id], onDelete: Cascade)
  customAgent    CustomAgent  @relation(fields: [customAgentId], references: [id], onDelete: Restrict)

  @@unique([raceRunId, seat])
  @@index([customAgentId])
}
```

Reasoning — see ADR-007. `onDelete: Restrict` on `customAgent` prevents deletion of a CustomAgent that has historical race records. Soft-delete via a `deletedAt` column is the user-facing pattern (not shown; can be added in V3.5).

```prisma
// ─── Budget + ProjectStateLog ───────────────────────────────────────────────

model Budget {
  id           String         @id @default(cuid())
  projectId    String         @unique

  hardCapUsd   Decimal        @db.Decimal(10, 4)
  softWatermarks Int[]        @default([50, 75, 90])   // percentages

  spentUsd     Decimal        @default(0) @db.Decimal(10, 4)
  status       BudgetStatus   @default(OK)

  // Which key funds the budget. BYOK projects do not consume platform credit.
  fundingKind  KeyMode        @default(MANAGED)
  byokKeyId    String?        // FK to AnthropicKey (V2.0), optional

  lastAlertedWatermark Int?   // idempotency for "you hit 75%" emails

  createdAt    DateTime       @default(now())
  updatedAt    DateTime       @updatedAt

  project      Project        @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@index([status])
}

model ProjectStateLog {
  id           String        @id @default(cuid())
  projectId    String
  fromState    ProjectState
  toState      ProjectState
  reason       String        @db.Text
  actorKind    String        // 'user' | 'autopilot' | 'system'
  actorId      String?       // User.id or 'autopilot' or 'cron'
  traceId      String?
  createdAt    DateTime      @default(now())

  project      Project       @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@index([projectId, createdAt])
}
```

Reasoning — `ProjectStateLog` is append-only. It powers the audit trail and makes bug investigations ("who moved this project to HALTED?") trivial. Every `state` transition is double-entry: the column on `Project` changes, and a row is inserted in `ProjectStateLog`, in the same transaction.

---

## 3. Migration Strategy — V2.0 → V2.5 (zero-downtime, reversible)

Constraints:
- V2.0 is in production. Existing Party / Agent / PartyEvent / AgentMetric / ChatTurn / PickDecision / AnthropicKey rows must keep working.
- The platform is on a single Postgres. No dual-write cutover.
- Must be reversible within 24 hours if a regression surfaces.

Migration broken into **three discrete migrations**. Each is independently deployable.

### Migration A — `20260425000000_v3_project_skeleton` (additive only)

Creates new tables and enums with no coupling to existing tables:
- `Project`, `Budget`, `ProjectStateLog`
- `RaceRun`, `RaceCandidate`
- `EditOverlay`, `LoserBranch`
- `Asset`, `AssetVersion`, `AssetPin`
- `CustomAgent`, `SquadComposition`
- Partial unique index on `RaceCandidate` enforcing single-winner via raw SQL.

Adds `projectId` nullable column to `Party` with FK.

**Deploy characteristics:** purely additive DDL, no row rewrites. Safe to roll back by dropping new tables and the one nullable column. Takes <5 seconds on a table of 100K Parties.

### Migration B — `20260425010000_v3_backfill_projects` (data migration)

For every existing Party with `projectId IS NULL`:
1. Create a Project row with `kind = BROWNFIELD`, `name = "{issueTitle}"`, `userId = party.userId`, `repoOwner = party.repoOwner`, `repoName = party.repoName`, `state = (derived from party.status)`.
2. Set `party.projectId = project.id`.
3. Insert a `ProjectStateLog` row with `actorKind = 'system'`, `reason = 'v3.0 migration backfill'`.

Runs **in batches of 500 Parties per transaction** via a standalone script (`scripts/v3-backfill.ts`). Idempotent; safe to re-run. Does not block traffic — new V2.0 Party creations continue to set `projectId = NULL` and the next batch picks them up.

**Reversibility:** single SQL command — `UPDATE "Party" SET "projectId" = NULL WHERE EXISTS (SELECT 1 FROM "Project" WHERE "Project"."id" = "Party"."projectId" AND "Project"."kind" = 'BROWNFIELD' AND "Project"."name" LIKE '%migration%')`. Followed by a `DELETE FROM "Project" WHERE kind = 'BROWNFIELD' AND createdAt < migrationStart`. Orchestrate via the migration script's `--revert` flag.

### Migration C — `20260501000000_v3_project_required` (deferred, conditional)

Flips `Party.projectId` to `NOT NULL`. Only runs after:
- Migration B has been at 100% for ≥7 days.
- Dashboards show zero `Party.projectId IS NULL` rows.
- A canary deploy of the V2.5 code path has been live for ≥48 hours.

This migration is **not urgent**. The schema tolerates `Party.projectId IS NULL` indefinitely; the cost is a nullable-handling branch in TypeScript code. If we never flip it, nothing breaks. Ship when convenient.

### Write path during migration window

- V2.0 code keeps creating Parties with `projectId = NULL`. Unchanged.
- V2.5 code (when deployed) creates a Project first, then Parties.
- The background backfill script closes the gap every hour.

Critically: **no code change is required to the V2.0 Party-creation path before Migration A**. Migration A is pure DDL; the app does not need to know about Projects yet. This decouples the schema rollout from the app rollout, which is the single most important property of this migration.

### Rollback plan

Emergency rollback within 24h:
1. Deploy the previous app binary (V2.0).
2. Run Migration B's `--revert` script.
3. Run Migration A's Prisma reverse (auto-generated; drops new tables + the nullable column).

Rollback after >24h is degraded — new V2.5 Projects will have been created. Accepted; after 24h we are committed.

### PartyEvent back-reference

`PartyEvent` currently FK's to Party. We do **not** add a direct `projectId` FK to `PartyEvent`. Instead, queries that need project-scoped events do `JOIN Party ON PartyEvent.partyId = Party.id` and filter by `Party.projectId`. Rationale: PartyEvent is the highest-volume table (expected 10–100x row-count of everything else). Adding a wide column breaks its hot-path insert latency. If project-scoped queries become slow, a materialized view is the next step, not a column.

---

## 4. ADR-001 — RaceRun / RaceCandidate Generic Abstraction

### Context

The pipeline has ≥3 race phases today (Stories, Stack V2.7+, Implementation) and ≥1 more on the roadmap (Wireframes). Each phase produces structurally different artifacts — text, code branches, images, JSON structures. The temptation is to model one table per phase (`StoriesRace`, `StackRace`, `ImplementationRace`). The counter-temptation is one giant `Race` table with 40 nullable columns.

### Decision

**One `RaceRun` + `RaceCandidate` pair serves all phases.** Phase-specific data lives in two `Json` columns: `RaceRun.input` and `RaceCandidate.artifact`. A `RacePhase` enum + zod schemas (in `src/lib/races/schemas.ts`, not yet written) validate the JSON shape at every write. The orchestrator never reads these columns without running them through the phase-specific zod parser first.

### Consequences

**Positive:**
- Adding a new race phase (Wireframes V3.5, a future "Release-Strategy" race, or user-defined races) is a zero-migration operation. Ship code, done.
- One UI component (`<RaceStage candidates={...} phase={...}/>`) renders all phases with phase-specific sub-views. Code-weight drops ~3x vs. per-phase components.
- Diversity-Judge, Cost-Governor, and the Timeline-Scrubber each have one code path, not four. The metaphor stays coherent (Final Cut Pro does not have four Timelines).
- RLHF dataset: every race is one row shape. Export is trivial. This is the moat.

**Negative:**
- Referential integrity on the artifact is the orchestrator's job, not Postgres's. A bad deploy can persist a malformed artifact and only discover it at read time. Mitigation: (a) all writes go through a central `persistCandidate(phase, artifact)` function; (b) a nightly lint job re-parses every RaceCandidate.artifact and logs schema violations.
- Query shape is worse — "find all Stories-races with >3 candidates that included asset X" is a three-step: filter by phase enum, JSON-extract `artifact.storyCount`, join AssetPin. Acceptable because such queries are analytical, not hot-path.
- We lose per-phase column indexes. GIN indexes on JSONB cover the common case but are slower than B-tree. Mitigation: denormalize hot fields (e.g. `RaceCandidate.summary TEXT` pulled from artifact) when a query proves slow — not preemptively.
- Type safety in TypeScript depends on `Json` type assertion at read. Sloppy code will write `any` everywhere. Mitigation: lint rule banning `as any` on RaceCandidate.artifact; only `z.infer<typeof CandidateArtifactSchema>` accepted.

**Alternatives rejected:**
- **Table-per-phase (`StoriesRace`, `StackRace`, …):** every new phase is a migration; cross-phase analytics (Timeline, Cost-Governor) requires UNION ALL across 4+ tables. Rejected — would make Wireframes V3.5 a 2-week migration instead of a 2-day feature.
- **40-column `Race` table with all fields nullable:** fragility of nullable-chains; no type discipline; Postgres query planner does poorly. Rejected as a well-known anti-pattern.
- **Single-table-inheritance with `type` discriminator + per-type child rows via FK:** more referential integrity but still requires N tables. Complexity cost does not justify the IR gain when the artifacts are inherently heterogeneous (a code branch name and an image URL are not usefully constrained by the same schema).

### Status
Accepted.

---

## 5. ADR-002 — Loser-Branches First-Class (git for code, JSON for non-code)

### Context

V1.0-vision treats losers as ephemeral. Concept v2.0 makes losers first-class because (a) "branch from any historical pick" is a UX killer-feature, and (b) the (winner, losers, edit) triple is the RLHF dataset that is our data moat. Losers must be preservable, queryable, and reconstructible.

Two classes of losers exist: **code losers** (Implementation phase — live in a sandbox, hundreds of files, git-native) and **non-code losers** (Stories, Stack, Wireframes — text/JSON/image, not git-native). Storing them the same way forces a bad compromise: either git-LFS-everything (overkill for a 2KB story), or JSON-everything (stuffing a 50MB sandbox into a JSONB column — infeasible).

### Decision

**Bifurcate persistence by candidate kind, unified through `LoserBranch.persistKind`:**

- `CandidateKind.CODE` losers → `LoserPersistKind.GIT_BRANCH`. The orchestrator, immediately after pick, pushes the losing sandbox's branch to the project repo as `losers/{phase}-{shortid}`. `LoserBranch.artifact` stores only `{branchName, commitSha, fileCount, summary}` as a JSON pointer.
- `CandidateKind.TEXT` and `CandidateKind.IMAGE` losers → `LoserPersistKind.JSON_ARTIFACT`. The full artifact (up to ~64KB for TEXT, a signed URL for IMAGE) lives in `LoserBranch.artifact`.

### Consequences

**Positive:**
- Preservation cost scales correctly. A Stories race with 4 loser-stories costs ~30KB total; an Implementation race with 4 loser-sandboxes costs ~0 Postgres bytes (pushed to GitHub, free).
- "Branch from here" UX is two different flows under one facade: for code losers, `git checkout losers/impl-abc123`; for text losers, clone the artifact JSON into a new RaceRun.input. The UI renders the same button; the orchestrator dispatches on `persistKind`.
- GDPR / compliance tombstoning is clean: set `LoserBranch.tombstonedAt`, and either delete the git branch (for GIT_BRANCH) or null out the artifact JSON (for JSON_ARTIFACT). The LoserBranch row itself survives, so audit trails remain intact.
- We can ship JSON_ARTIFACT losers **in V2.5** without requiring the GitHub-App's push-loser-branch code to be ready. GIT_BRANCH losers can ship in V2.7 when Repo-Genesis has hardened. Decoupled timelines.

**Negative:**
- Two code paths to maintain in perpetuity. Adding a new `CandidateKind` (e.g. VIDEO for Seedance-2 in V3.5) forces a decision on where it goes. Mitigation: ADR addendum at that point; default to JSON_ARTIFACT with external URL.
- Git branch naming collisions are possible if `shortid` has entropy <6 chars. We use 8-char nanoid; collision probability <1/10^12 per project repo. Acceptable.
- If the user's repo is deleted or the GitHub-App is uninstalled, GIT_BRANCH losers vanish. The LoserBranch row points to a dead branch. The UI handles this by showing "loser no longer accessible" and marking the row `tombstonedAt = <event>`.
- CI cost: every `losers/*` push triggers GitHub Actions unless we gate. Repo-Genesis must ship with a `paths-ignore: ['losers/**']` default in the generated `.github/workflows/ci.yml`. **Non-negotiable for GIT_BRANCH losers to be economical.**

**Alternatives rejected:**
- **All losers in Postgres:** fails for Implementation — a 20MB sandbox is not a JSONB value. Rejected.
- **All losers as git (even text):** forces every Stories race to touch the repo, which doesn't exist in Greenfield until Phase 5 (Repo-Genesis). Stories-race precedes Repo-Genesis by design. Rejected.
- **All losers in S3-like blob storage:** no queryability, expensive egress for the RLHF dataset, no versioning story. Rejected as a worst-of-both.
- **Losers in a separate "loser-repo" shared across all projects:** multi-tenancy disaster, cross-project prompt-injection vector via branch contents. Rejected.

### Status
Accepted.

---

## 6. ADR-003 — Project State Machine (Director vs Autopilot)

### Context

A Project moves through ≥9 macro-states (DRAFT → BRIEF_PENDING → STORIES_PENDING → … → RELEASED). Two actors write transitions: the human (Director) and the orchestrator (Autopilot). Without a canonical state machine, we get inconsistent UI, missed cron jobs, and race conditions between "user picks" and "autopilot auto-picks" firing on the same RaceRun.

### Decision

**One `ProjectState` enum, one state-transition table, every write is double-entry.** Transitions are validated at the orchestrator (`src/lib/projects/state.ts`), not by database triggers. Autopilot is a meta-orchestrator that drives the same transitions as a human — it is NOT a parallel state machine.

**Valid transitions (non-exhaustive, illustrative):**

```
DRAFT            → BRIEF_PENDING          (greenfield user submits brief)
DRAFT            → STORIES_PENDING        (brownfield via issue-pick; wrapper-project)
DRAFT            → IMPLEMENTING           (brownfield direct; issue-pick triggers race)
BRIEF_PENDING    → STORIES_PENDING        (brief-clarification resolved)
STORIES_PENDING  → STACK_PENDING          (stories pick resolved)
STORIES_PENDING  → IMPLEMENTING           (stack-phase skipped, brownfield only)
STACK_PENDING    → REPO_PENDING           (stack pick resolved)
REPO_PENDING     → IMPLEMENTING           (repo-genesis success)
IMPLEMENTING     → IMPLEMENTING           (self-loop; a new Story-race starts)
IMPLEMENTING     → QUALITY_PASS           (all stories done)
QUALITY_PASS     → RELEASED               (user confirms release)
any              → HALTED                 (budget hard-cap; only budget-governor writes)
any              → ARCHIVED               (user archives)
HALTED           → IMPLEMENTING           (budget topped up; back to prior state — logged)
```

**Invariants enforced:**
1. Autopilot may write any transition **except** `→ RELEASED`. Human sign-off on the final PR is non-negotiable (vision §10).
2. Budget-Governor may write `→ HALTED` from **any** non-terminal state.
3. Transitions are serialized per-Project via `SELECT ... FOR UPDATE` on the Project row within the write transaction.
4. Every transition creates a `ProjectStateLog` row in the same transaction.

### Consequences

**Positive:**
- Autopilot and Director are **the same code**. There is no "Autopilot writes this field, Director writes that field" split. The only difference is *who* calls the orchestrator method — a user-action handler or a scheduled job. Tests for the state machine are identical.
- The Timeline UI is a trivial render of `ProjectStateLog` rows. No separate event-sourcing.
- Multi-actor safety: the `FOR UPDATE` lock means that if a human picks at the same instant as Autopilot is about to auto-pick, one wins; the other sees `AWAITING_PICK → PICKED` already happened and aborts cleanly.
- Invariants are testable: "HALTED → RELEASED is forbidden" is a pure-function test, no DB needed.

**Negative:**
- Lock contention on the Project row if multiple races within one project are resolving concurrently. Mitigation: project-level lock only for *state transitions*; race-level writes (candidate persist, edit overlay) use row-level locks on RaceRun/RaceCandidate. Measured: expected transition rate <1/second per project. Not a bottleneck.
- Autopilot's timer-based auto-pick requires a cron. We have `src/app/api/cron/sandbox-lifecycle/` already; Autopilot adds `src/app/api/cron/autopilot-tick/`. Cron drift of ±1 minute is acceptable.
- Adding a new state (e.g. V3.5 `QUALITY_PASS` splits into `QP_A11Y` / `QP_SEC` / `QP_PERF`) requires a migration + enum update. Not free, but infrequent. Accepted.

**Alternatives rejected:**
- **Finite-state-machine library (xstate, robot3):** overkill; adds a dependency and a DSL for a machine with ≤15 states. Hand-rolled is 80 lines of TypeScript with a `readonly` transition map — more legible, one less library to audit for CVEs.
- **Separate Autopilot state field on Project:** doubles invariants, doubles bug surface. Pattern explicitly rejected by vision §3 ("Autopilot is a meta-orchestrator on top, not a parallel codepath").
- **Postgres CHECK constraints / triggers on state transitions:** enforcement moves away from TypeScript where tests live. Postgres triggers are opaque, hard to test, and fail in ways that crash transactions cryptically. Rejected; TS-level enforcement + append-only log is sufficient.
- **Event-sourcing (ProjectEvent table as source-of-truth, Project as projection):** too heavy for V2.5. ProjectStateLog gives us 90% of the audit value at 20% of the complexity. Can migrate to full event-sourcing in V4.0 if we ever need time-travel debugging beyond the current log.

### Status
Accepted.

---

## 7. ADR-004 — Edit-Overlay Non-Destructive Model

### Context

User edits after a race pick are the **most valuable signal** we collect — the delta between "what the AI proposed" and "what the human shipped" is the exact shape of an RLHF reward model. If we mutate the race output to reflect the edit, we destroy that signal. But the user also expects "edit → PR reflects my edit" without a confusing two-layer UI.

### Decision

**RaceCandidate.artifact is immutable after `RaceStatus.PICKED`. Every user modification is an `EditOverlay` row.** Reads compose the effective artifact by applying overlays in `sequence` order. The UI renders the composed view by default; the "original race output" is one click away ("Show proposal").

Four `EditOverlayKind`s cover all cases: TEXT_DIFF, FIELD_PATCH (JSON-patch for structured fields), CODE_DIFF (for git-backed implementation), ASSET_REPLACE (swap a generated image for an uploaded one).

### Consequences

**Positive:**
- RLHF dataset is clean: every `(candidate.artifact, overlay.payload, overlay.reason)` triple is a training example. Nothing is lost.
- "Show me what the AI originally proposed" is a trivial query. Crucial for the audit-trail/compliance story (EU AI Act, §12).
- Undo is free — delete the EditOverlay row, effective artifact reverts. No history reconstruction needed.
- Edits carry a `reason` field, actively prompted in the UI ("why are you changing this?"). Optional, but UX surfaces it. This is the qualitative signal competitors don't collect.
- Multi-user collaboration (V4.0) is possible: overlays are per-user, serializable, mergeable by sequence.

**Negative:**
- Read complexity: effective artifact = base + reduce(overlays). For a candidate with 10 overlays, this is 11 JSON operations on every read. Mitigation: cache the effective artifact in a `RaceCandidate.effectiveArtifactCache Json?` column, invalidate on overlay write. Not in V2.5; add when profiling shows need.
- Users can get confused about "why doesn't the race-card match my edit?" Mitigation: the race-card shows the *effective* artifact by default, with a subtle "AI proposed X → you edited" badge. UI problem, not schema problem.
- CODE_DIFF overlays are harder — a user's manual edit in the winner sandbox is already a git commit. We capture it by treating "chat-iterate-applied diffs" as implicit EditOverlay rows (`sourceKind = 'chat'`). The V2.0 ChatTurn table is the natural source; `EditOverlay` rows for CODE_DIFF are *derived* from ChatTurn rows, not user-written. Schema admits both, orchestrator dispatches.
- A malicious client could create unbounded EditOverlays. Mitigation: rate-limit per-candidate (max 100 overlays; soft warning at 20 — "consider starting a new race").

**Alternatives rejected:**
- **Mutate artifact in place, keep a journal:** the journal is equivalent to overlays but makes the "effective" read trivial at the cost of destroying the "original" read. Vision §5.3 is explicit: original race-result is immutable. Rejected.
- **Copy-on-edit (forked candidate):** every edit creates a new RaceCandidate row, original remains. Clean conceptually, but it pollutes the Winner concept (which candidate is the "real" one?) and bloats the candidates table. Rejected as a simpler model with worse UX.
- **Git-only (CODE_DIFF as commits, no overlay row):** fails for TEXT/IMAGE candidates where git is not the native store. Rejected.

### Status
Accepted.

---

## 8. ADR-005 — No-Sandbox Phases vs. Sandbox-Needed Phases

### Context

Phases 1 (Brief), 2 (Stories), 4 (Stack), partially 3 (Wireframes) produce text/image metadata. Phases 5 (Repo-Genesis), 6 (Implementation), 7 (Quality), 8 (Release) produce or touch code, requiring a sandbox (Daytona or equivalent). The sandbox is the single largest cost driver (~$0.08/minute) and the slowest component to provision (~40s cold-start). Conflating metadata races with sandbox races forces metadata races to wait on a sandbox they don't need.

### Decision

**The `RaceRun.phase` column drives sandbox allocation at orchestrator-dispatch time.** A central `phasePolicy(phase: RacePhase): {needsSandbox: boolean, ...}` function owns the decision. Phases STORIES, WIREFRAMES, STACK are `needsSandbox: false`. Phase IMPLEMENTATION is `needsSandbox: true`. Future phases register their policy in the same file.

At the schema level: `RaceCandidate.artifact` may or may not contain a `sandboxId` field — it is present iff the phase needed a sandbox. No dedicated column. No dedicated FK.

### Consequences

**Positive:**
- Stories-race (5 Sonnet calls, no sandbox) costs ~$0.05 and completes in ~15s. If we forced a sandbox, cost would 3x and wallclock would 5x. This is the difference between a race that users run freely and one they dread.
- Diversity-Judge + Budget-Governor are uniformly applied across all phases without a sandbox-specific code path.
- The orchestrator's top-level dispatch `async function runRace(raceRun)` has exactly one branch on `phase` — at the start, to decide sandbox provisioning. Everything else is uniform.
- Easy to add a new no-sandbox race (e.g. "Marketing-Copy race" in V3.5): `phase: MARKETING_COPY`, `needsSandbox: false`, done. No changes to Daytona orchestration.

**Negative:**
- The invariant "IMPLEMENTATION candidates have artifact.sandboxId set; others don't" is TypeScript-enforced, not DB-enforced. A bad write passes the DB check, fails at read. Mitigation: zod schemas per phase reject invalid shapes; unit tests for every phase.
- A future hybrid phase (imagine "Quick-Prototype" that optionally provisions a sandbox) doesn't fit cleanly. Would require `phasePolicy` to return a function, not a boolean. Crossed when needed; current 4 phases do not motivate it.
- Sandbox cleanup for Implementation loser-branches happens before the push to `losers/*` — ordering bug risk. Mitigation: explicit state machine within Implementation-race orchestrator: CANDIDATE_GENERATED → PUSH_TO_LOSER_BRANCH → SANDBOX_TERMINATE, transactionally gated.

**Alternatives rejected:**
- **Separate MetadataRace and SandboxRace tables:** duplicates ADR-001's problem. Rejected.
- **Boolean `needsSandbox` column on RaceRun:** duplicates phase-derived information. Source-of-truth split between enum and boolean invites drift. Rejected in favor of derive-from-phase.
- **Always provision a sandbox (for "consistency"):** violates Race-Mechanic Principle 1 ("only race where alternatives are real") by spending cost where it adds zero value. Rejected.

### Status
Accepted.

---

## 9. ADR-006 — Asset Model (typed, versioned, pin-as-context, citation-from-race)

### Context

Assets are heterogeneous in size (a 2KB brief vs. a 40MB Seedance-2 video) and in lifecycle (a user-uploaded logo never changes; a generated wireframe has N versions from re-prompts). Concept v2.0 vision §7 and §16.7 pose the open question of storage; we need a schema that admits multiple storage backends without locking in one choice today.

### Decision

Three-part model:
- **`Asset`** = the logical identity ("project logo", "v2 of brief", "hero wireframe"). Stable across versions.
- **`AssetVersion`** = the content bytes + metadata at a point in time. Monotonically versioned per Asset.
- **`AssetPin`** (join) = "this Asset (optionally specific version) is standing context for this RaceRun". Pins are **frozen** at race-start so a later re-race with the same RaceRun id yields the same prompt.

Storage tier is a column on `Asset`, not a separate table. Three values cover the V2.5 → V3.5 lifecycle:
- `POSTGRES_INLINE` (≤64KB): content in AssetVersion.contentText / contentBytes. Fast, transactional, cheap.
- `S3_LIKE`: external URL. For images, videos, large files.
- `GIT_TRACKED`: committed to the project's own repo at `assets/<path>`. For things that should travel with the code (ADR docs, README images).

A separate `citedByCandidateIds: String[]` column on `AssetPin` records which *candidates* (post-race) actually used the pinned asset. This closes the RLHF loop: if we pin 5 assets and candidates only cite 1, the racer's prompt-construction is wasteful — a measurable failure mode.

### Consequences

**Positive:**
- Storage decision is per-asset, not per-project. A Brief (2KB markdown) can be POSTGRES_INLINE; a Demo-Video (40MB) is S3_LIKE; an ADR.md is GIT_TRACKED. Each picks its optimal lane.
- Versioning is first-class; `currentVersionId` denormalized pointer makes "show me the current brief" a single index lookup.
- Pin vs. citation distinction gives us the prompt-engineering feedback loop for free. Pinned-but-never-cited assets are a data-quality flag.
- Pins are immutable-after-race-start, which preserves reproducibility. "Re-run this race with the same inputs" is literally copying the RaceRun.id + its AssetPin set.
- GDPR: tombstoning an Asset version is a row-level operation; other versions and the Asset's pins remain for audit.

**Negative:**
- Three storage lanes = three different read/write code paths. Mitigation: a single `src/lib/assets/storage.ts` abstraction exposing `read(version): Promise<Buffer | string>` and `write(kind, content): Promise<AssetVersion>` with internal dispatch. Code-weight ~400 lines; manageable.
- S3_LIKE implies we deploy Cloudflare R2 (or equivalent) in V3.0. Operational burden + one more secret to manage. Accepted as the cost of supporting images.
- GIT_TRACKED requires the project repo to exist — useless for Greenfield before Repo-Genesis (Phase 5). Orchestrator rejects GIT_TRACKED storage on assets created before Project.repoOwner is populated. Constraint is TS-level, not DB-level.
- A 40MB Seedance-2 video in S3_LIKE costs ~$0.001/month per asset at R2 egress pricing. Across 10K projects each with 3 videos, that's ~$30/month. Budget-Governor should include storage cost post-V3.5; not in V2.5 scope.
- `AssetPin.citedByCandidateIds: String[]` is a denormalized array; invariants ("every id in this array must exist in RaceCandidate") are TS-enforced. Mutation of this array after race-resolution is forbidden by the orchestrator. Adding an `@@index` on this array requires GIN; defer until the RLHF query path needs it.

**Alternatives rejected:**
- **All assets in S3 from day one:** adds operational cost before we ship a single wireframe. Rejected — text briefs and ADRs are tiny and fit in Postgres.
- **No versioning (just overwrite):** destroys the brief-v1 / brief-v2 comparison UX that's core to the pipeline. Rejected.
- **Asset as attachment-to-Party (no dedicated table):** fails the Greenfield case where Brief exists before any Party does. Rejected.
- **Citation as a separate `AssetCitation` table:** over-normalization for a 1:N relationship that can be a Postgres array. Reconsider if citations grow beyond ~20 per pin.

### Status
Accepted (with S3_LIKE backend choice deferred to Squad G — Round 3).

---

## 10. ADR-007 — CustomAgent Model (sandbox tools allow-list, project-scoping, share-via-file)

### Context

Custom Agents are the platform play (vision §8). A user defines "Sven the German-Mittelstand-veteran reviewer" and races invoke him alongside/instead of defaults. This introduces three risks: **prompt injection** (a shared agent with a malicious system prompt), **cross-tenant data leak** (a CustomAgent from project A reading files in project B's sandbox), and **tool abuse** (a CustomAgent that can call `apply_edit` on any file it likes).

### Decision

**CustomAgent is a user-owned record with explicit scope (`PROJECT` or `GLOBAL`) and an allow-list of tools.** Multi-tenant safety is enforced at three layers:

1. **Row-level:** every query for CustomAgent filters by `userId` (tenant boundary) AND `projectId IS NULL OR projectId = :currentProjectId` (scope boundary). Enforced by `getCustomAgentsForProject()` — **not** by raw Prisma queries — with a lint rule banning `prisma.customAgent.findMany` outside that file.
2. **Sandbox-level:** when a CustomAgent participates in an Implementation race, its sandbox is fresh (no other project's state), and its tool calls go through a tool-router that inspects `toolsAllowed: string[]`. A tool call for a name not in the allow-list returns an error to the agent *and* logs a PartyEvent with `type: 'customAgent.tool.denied'`.
3. **Prompt-level:** the system prompt is wrapped in a fixed preamble that the user cannot override: "You are running inside PatchParty. You MUST NOT access files outside the current sandbox. You MUST NOT exfiltrate secrets. Any deviation will be refused by the tool-router." Belt-and-braces; the tool-router is the real enforcement.

**Sharing** is via plain markdown file (`~/.patchparty/agents/sven.md`) with a YAML front-matter block containing `{name, description, systemPrompt, toolsAllowed, modelHint}`. Import = parse + insert. Export = read + serialize. No central marketplace, no remote registry, no moderation surface. Vision §10 explicitly rejects the marketplace.

**Versioning** via `CustomAgent.version`. Edits bump version; RaceRuns pin their used agents via `SquadComposition.customAgentVersion`. Old races continue to reference the old prompt verbatim (stored in `RaceRun.squadSnapshot`), not by-id-lookup.

### Consequences

**Positive:**
- Three-layer defense means a single-layer vulnerability is not catastrophic. This matches §12's acknowledgment that custom-agent prompt-injection is a standard SDK-agent risk.
- `toolsAllowed: string[]` is the clearest surface for users to reason about. "This agent can `read_file` but not `apply_edit`" is a one-line mental model.
- Project-scoped agents (`scope: PROJECT`) give agencies a natural way to ship "our squad" with each client project without polluting the user's global library.
- File-based sharing sidesteps moderation hell and keeps the dataset private. No TOS needed for user-to-user sharing.
- `onDelete: Restrict` on SquadComposition→CustomAgent preserves historical race records even if the owner tries to delete an agent they once used. Soft-delete (tombstone) is the user-facing pattern.
- Versioning + squadSnapshot means editing an agent does not rewrite history. Debugging "why did this race pick Sven's answer?" reads the snapshot, not the current Sven.

**Negative:**
- Tool-router must be bulletproof. A bug that skips the allow-list check on one code path is a full escape. Mitigation: the tool-router is a single function; 100% branch coverage is a CI gate (`npm run test:tools`); penetration-test squad in Round 4.
- `GLOBAL`-scope agents + multiple projects = a user could put secrets in a global system prompt, then one of their projects could be shared via pair-programming. Mitigation: on project-share (V4.0), any GLOBAL agents participating are downgraded to PROJECT on the shared copy. Not relevant until V4.0.
- The preamble-wrap is not cryptographic; a sophisticated user could append contradicting instructions in the description. The **tool-router** is the real defense — if a clever user convinces the model to try `read_file("/etc/passwd")`, the tool-router rejects it regardless of what the prompt says. Accepted.
- File-based sharing loses "who shipped the definitive Sven?" Without a central registry, there's no canonical version. This is a feature (anti-moderation-hell) and a bug (no network effect). V3.0 accepts this trade-off; V4.0's "share-via-URL" adds private signed URLs without a public registry.
- Soft-delete via column not yet modeled (we have `updatedAt` but no `deletedAt` on CustomAgent). Add in V3.5 when deletion UX is a real feature; today, Restrict-on-FK means historical races win over delete.

**Alternatives rejected:**
- **No tools allow-list (all agents get all tools):** first prompt-injection attack results in sandbox escape. Unacceptable. Rejected.
- **Marketplace / public registry:** vision §10 explicit anti-feature. Also forces moderation spending. Rejected.
- **Agent-as-a-service SaaS tier:** vision §10 explicit anti-feature. Would force per-agent billing and a support surface. Rejected.
- **Row-level security in Postgres (RLS policies):** stricter than app-level enforcement but requires setting session vars on every connection; Prisma's connection pool makes this error-prone. The lint-rule + single-function discipline gets us 95% of the value at 10% of the operational cost. Revisit in V4.0 if we move to a connection pooler that makes RLS trivial.
- **Global agent registry keyed by hash:** interesting (content-addressed agents), but adds a whole canonicalization layer. Defer to V4.0.

### Status
Accepted (for V3.0; tool-router implementation owned by Squad D — Round 3).

---

## 11. Open Questions for Round 4

1. **PartyEvent projectId back-reference.** Decided: no direct FK, use JOIN. Need to validate with an EXPLAIN on the 10M-row case. Who owns the benchmark? (Suggest: Squad F — Autopilot/telemetry.)
2. **Partial unique index vs. app-level winner invariant.** `CREATE UNIQUE INDEX ... WHERE "isWinner" = true` is Postgres-native but invisible to Prisma's schema diff. Decision needed: ship as a side-SQL file applied via `prisma db execute`, or accept app-level enforcement only. Recommend the former for correctness; need sign-off.
3. **Budget granularity.** Do we charge per-RaceCandidate (line-item) or per-RaceRun (aggregate)? Current schema supports both (`RaceCandidate.costUsd` + `RaceRun.budgetSpent`). Squad F Autopilot-schema must decide whether intervention triggers are per-candidate or per-run.
4. **AssetVersion `byteSize` for GIT_TRACKED assets.** We cannot know this until the commit lands. Accept `byteSize = -1` as a "deferred" sentinel or block-on-commit? Prefer the former; needs Squad D (custom agents) sign-off that tool-calls handle -1 gracefully.
5. **CustomAgent version bump semantics.** On edit of `systemPrompt`, bump. On edit of `name` only, bump or not? Bump = audit-clean, but churns the UI ("new version of Sven!"). Recommend bump only on fields that affect race output (prompt, tools, modelHint). Defer to Squad D.
6. **Autopilot-Director handoff mid-race.** If Autopilot has started a RaceRun but the human wants to take over, where does the handoff land in the state log? Proposal: keep RaceRun running; flip Project.autonomyMode to DIRECTOR; log transition. Autopilot's pending auto-pick timer aborts on next tick. Needs Squad F confirmation.
7. **Wireframe-phase race-input.** Phase 3 can be no-race (single-best) or race (opt-in). Current schema allows both — `RaceRun.candidates` length is not constrained. Do we need a `RaceRun.expectedCandidates` column for UX ("waiting for 5 of 5")? Trivial addition, but scope creep.
8. **`CustomAgent.toolsAllowed: string[]` — validated against what?** A tool registry must exist. Proposal: `src/lib/tools/registry.ts` exports `TOOL_NAMES = ['read_file', 'apply_edit', 'run_command', 'fetch_url']` as const. Allow-list validated at CustomAgent-write. Needs Squad D confirmation.
9. **Migration B runtime on a 100K-Party production DB.** At 500 Parties per transaction, this is 200 transactions. Each transaction also creates a Project + ProjectStateLog, so ~3 × 500 = 1500 writes per transaction. Estimated 30 minutes wall-time. Run during low-traffic window. Need ops sign-off.
10. **Opt-in asset-pipeline storage cost disclosure.** Budget-Governor in V2.5 tracks race-spend only. Should it also track R2 storage? For V2.5, no (assets are text, cost is trivial). Revisit at V3.0 when images arrive.
11. **EditOverlay rate limit on CODE_DIFF.** Every `chat-iterate` turn generates (conceptually) one CODE_DIFF overlay. A 50-turn chat session = 50 overlays per candidate. Reading effective artifact = 50 git-diff applications. Cache the tip SHA on RaceCandidate.artifact or keep the overlay chain? Recommend caching the tip; overlay chain remains the audit record. Implementation detail for V2.5.
12. **Custom-Agent GLOBAL-scope multi-tenancy at project-sharing time.** Deferred to V4.0. Flag for re-review when project-sharing lands.
13. **Seedance-2 VIDEO candidate kind.** Not in V2.5 scope, but the schema should admit it without migration. `CandidateKind` is an enum — adding a value requires migration. Accept, or generalize to string? Recommend: enum with explicit values, migration every 18 months is acceptable.
14. **ProjectStateLog retention.** Append-only audit logs grow unboundedly. At ~20 transitions per active project × 10K projects = 200K rows/month. Manageable. Add retention policy ("archive logs older than 2 years to cold storage") in V4.0.

---

## Files referenced

- `C:\Users\nelso\Desktop\patchPartyDaytonaLovable\planning\v3.0-studio\00-vision.md` — input spec
- `C:\Users\nelso\Desktop\patchPartyDaytonaLovable\planning\v2.0-chat-iterate\README.md` — V2.0 foundation
- `C:\Users\nelso\Desktop\patchPartyDaytonaLovable\prisma\schema.prisma` — current schema (Party, Agent, PartyEvent, AgentMetric, PickDecision, ChatTurn, AnthropicKey, ActiveRepo)
- `C:\Users\nelso\Desktop\patchPartyDaytonaLovable\prisma\migrations\20260418200000_v2_telemetry_chat_byok\migration.sql` — V2.0 migration pattern
- `C:\Users\nelso\Desktop\patchPartyDaytonaLovable\src\lib\events.ts` — PartyEvent pipeline
- `C:\Users\nelso\Desktop\patchPartyDaytonaLovable\src\lib\trace.ts` — traceId propagation
- `C:\Users\nelso\Desktop\patchPartyDaytonaLovable\src\lib\sandbox-lifecycle.ts` — sandbox state machine (pattern carried forward into ProjectState)
