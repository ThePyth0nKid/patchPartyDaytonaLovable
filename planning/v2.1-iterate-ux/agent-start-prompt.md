# Agent Start Prompt — PatchParty v2.1 Iterate-UX Redesign

> Copy everything below the `---` into your next agent session after context-clear. It is fully self-contained. Do not paraphrase or summarize it — paste verbatim.

---

You are taking over the PatchParty codebase at `C:\Users\nelso\Desktop\patchPartyDaytonaLovable` for a single focused scope: the v2.1 iterate-flow UX redesign. The previous session (2026-04-19) ran an adversarial swarm review (architect + planner + code-reviewer + security-reviewer) and produced a complete plan in `planning/v2.1-iterate-ux/`. Your job is to execute that plan end-to-end.

## Project context

PatchParty races 3 AI personas against a single GitHub issue, each inside its own Daytona sandbox. User picks a winner. After pick, losers should terminate and the winner's sandbox stays warm for chat-iterate (Opus tool-use loop). Lifecycle: ACTIVE → IDLE_WARN → PAUSED → TERMINATED via cron. BYOK is first-class. Telemetry writes PartyEvent / AgentMetric / ChatTurn / PickDecision to Postgres.

Stack: Next.js 15 App Router, React 19 RC, TypeScript, Prisma 6 + Postgres (Railway), `@daytonaio/sdk`, `@anthropic-ai/sdk` (Opus 4.7 — note: does NOT support assistant prefill), Auth.js v5-beta, `pg` LISTEN/NOTIFY for cross-container SSE fanout.

Live production: https://patchparty.dev. Won the AI Builders Berlin Hackathon 2026-04-17 (Daytona × Lovable track).

## What triggered this work

User tested the post-pick chat-iterate flow after v2.0 shipped and found it confusing:

> "Jetzt sehe ich ganz, ganz viel Text, sehe aber gar nicht, was sich geändert hat. Kann es gar nicht mehr validieren."

Envisioned experience: Cursor/Lovable-style "vibe-code" — see diffs per turn, toggle mobile/desktop preview, use control chips, explicit Ship PR step. A review swarm mapped the full design.

## Absolute scope

**YES:**
- Implement every task in `planning/v2.1-iterate-ux/03-tasks.md`, priority-ordered (Sprint 1 → 4).
- Fix every red-team finding listed in `planning/v2.1-iterate-ux/04-red-team-findings.md` (or log deferral in `deferred.md`).
- Address every HIGH + MEDIUM item in `planning/v2.1-iterate-ux/05-security-checklist.md`.
- Write unit tests alongside fixes (no TDD-later).

**NO:**
- Do not re-litigate the locked decisions in `planning/v2.1-iterate-ux/00-locked-decisions.md`. User has already chosen.
- Do not add features outside this scope (no Stripe, no admin dashboard, no divergence benchmark, no v2.2 patterns work).
- Do not run `prisma migrate deploy` against Railway without explicit user confirmation. Local `prisma migrate dev --create-only` is fine.
- Do not run `railway up`, `git push --force`, or anything destructive on remote state without explicit user OK.
- Do not re-design what's already specced. If the spec has a gap, fill it with the reasonable choice and log the decision in a short note.

## Read order — before you write any code

1. `planning/v2.1-iterate-ux/README.md` — overview + ship criteria
2. `planning/v2.1-iterate-ux/00-locked-decisions.md` — non-negotiables (keep open in a tab)
3. `planning/v2.1-iterate-ux/01-ux-spec.md` — screen layout, component tree, turn-card spec
4. `planning/v2.1-iterate-ux/02-data-model-changes.md` — schema + SSE extensions (P0 prerequisite)
5. `planning/v2.1-iterate-ux/03-tasks.md` — the priority-ordered work list
6. `planning/v2.1-iterate-ux/04-red-team-findings.md` — what to verify against
7. `planning/v2.1-iterate-ux/05-security-checklist.md` — security gates

Also useful: `planning/v2.0-hardening/agent-start-prompt.md` — some tasks there may already have landed fixes that overlap with this scope (notably iframe sandbox, token-in-argv, advisory-lock direction). Verify before re-doing.

## Before starting Sprint 1 — grounding step

Do not trust any file-level claim in the plan docs blindly. Verify by reading the actual files:

- `src/lib/chat.ts` — confirm `ChatTurn.create` call currently does NOT persist `commitSha`/`diffStats`; confirm advisory-lock is not already present
- `prisma/schema.prisma` — confirm `ChatTurn` model shape (which fields exist, which don't)
- `src/app/api/party/[id]/pick/route.ts` — confirm `terminateLosers` call site + fire-and-forget pattern
- `src/lib/sandbox-lifecycle.ts` — confirm current `terminateLosers` implementation (serial or already parallel? has `sandboxTerminatedAt` been added?)
- `src/app/api/party/[id]/chat/route.ts` — confirm no rate limit currently; confirm SSE structure
- `src/app/party/[id]/page.tsx` — confirm current post-pick rendering (inline section) and iframe attributes (sandbox present or not?)
- `src/lib/agent.ts` + `src/lib/chat.ts` — confirm GIT_ASKPASS refactor status (was flagged in v2.0-hardening)

If a finding turns out to already be fixed by the v2.0-hardening pass, mark it done in `planning/v2.1-iterate-ux/deferred.md` with a one-line note and move on.

## Sprint-level execution

### Sprint 1 — Data Model Foundation

Tasks T1.1 through T1.5. Must complete before any UI work. Three commits:

- `feat(schema): extend ChatTurn with diffStats + commitSha`
- `feat(chat): capture per-turn diff stats + advisory lock`
- `fix(security): GIT_ASKPASS for git push + loser teardown hardening`

After each commit: `npx tsc --noEmit`, run the unit tests, move on. No deploy.

### Sprint 2 — Security Hardening

Tasks T2.1 through T2.5. Two commits. Verify each against the corresponding S-item in `05-security-checklist.md` and matching R-item in `04-red-team-findings.md`.

### Sprint 3 — UI Build

Tasks T3.1 through T3.6. One commit per task. Use the `code-reviewer` agent after each UI commit. Smoke-test locally in browser after T3.5 (Ship PR) and T3.6 (viewport toggle).

### Sprint 4 — Polish + Smoke

Tasks T4.1 through T4.5. End with a manual smoke run (the 13-step script in `03-tasks.md` §T4.4). Write `planning/v2.1-iterate-ux/report.md`.

## Operational rules

- Use TaskCreate/TaskUpdate to track the ~20 tasks across sprints. Set `in_progress` when starting, `completed` when the matching acceptance criterion is met (including verify step).
- Read each file before editing. Line numbers in the plan are approximate.
- For each fix, add or extend the matching unit test in the same commit — never defer tests.
- Use the `code-reviewer` agent after any non-trivial commit. Use `security-reviewer` after Sprint 2 commits. Use `tdd-guide` when writing new tests. Use `build-error-resolver` if typecheck or build breaks.
- If you hit an ambiguity the plan doesn't cover, make the judgment call and document it in a 2-line note in `planning/v2.1-iterate-ux/decisions.md`. Don't stop to ask unless a locked decision is affected.
- Never use `prisma migrate deploy`, `railway up`, `git push --force`, `git reset --hard origin/main`, `--no-verify`, `--no-gpg-sign`, or delete branches without explicit user OK.
- Never amend the last commit if a hook fails — fix the issue and create a new commit.

## Auto-memory reminder

The user has a memory system at `C:\Users\nelso\.claude\projects\C--Users-nelso-Desktop-patchPartyDaytonaLovable\memory\`. A pointer to this planning folder should be added as a project memory on first session — if it's not already there, add one: `project_v2_1_iterate_ux.md` pointing at `planning/v2.1-iterate-ux/` as the canonical source for this scope of work.

## End state

- All P0 + P1 tasks from `03-tasks.md` shipped to `main` with typecheck green
- All HIGH + MEDIUM items from `05-security-checklist.md` checked
- All R1–R9 attack scenarios from `04-red-team-findings.md` provably blocked (or deferred with a 1-line reason in `deferred.md`)
- Manual smoke (13 steps) passed end-to-end on local dev
- `planning/v2.1-iterate-ux/report.md` summarizes what shipped and what deferred
- No Railway deploy yet — user will do that explicitly after reviewing the branch

Begin by reading the plan docs (files 1-7 in read order). Then ground yourself by reading the actual source files listed under "grounding step". Then start Sprint 1 T1.1.
