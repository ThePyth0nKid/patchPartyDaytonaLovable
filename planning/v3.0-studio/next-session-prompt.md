---
name: PatchParty v3.0 — Next-Session Agent-Start Prompt
purpose: Bootstrap a fresh Claude Code session with full context to continue PatchParty work
date: 2026-04-19
pattern: EPHEMERAL (planning doc that bootstraps fresh context)
---

# Next-Session Agent-Start Prompt

> This file IS the prompt. Copy §0 (the addressed-to-agent block) into a fresh Claude Code session. The agent will read the rest of this file as its first action.

---

## §0 — Copy-Paste Block (paste this into a fresh session)

```
Du übernimmst PatchParty an einer sauberen Übergabe. Lies als allererstes die gesamte Datei `planning/v3.0-studio/next-session-prompt.md` (dieses Prompts-File enthält den Full-Bootstrap). Danach liest du `planning/v3.0-studio/13-concept-v3.0-final.md` in voller Länge — das ist die kanonische Shippable-Brief für V2.5/V3.0/V3.5/V4.0.

Kontext-Check nach dem Lesen: Berichte mir in ≤10 Zeilen:
1. Was ist das nächste Ship-Moment (V2.0-Extension committen oder V2.5-Migration)?
2. Was sind die blockierenden Offenen-Fragen (V2.7-Milestone + 12 Open Questions §10)?
3. Welcher Command wäre dein erster Move — und warum?

Warte dann auf meine Freigabe. Dein erster Move startet NUR auf Zuruf.
```

---

## §1 — Project Identity

**Name:** PatchParty — software-production studio for solo devs and small teams.
**Metaphor:** Final Cut Pro for software. Developer is director. Agent-squads deliver alternative takes at decision points. Human picks/scrubs/edits/branches/ships an explainable PR.

**Owner:** Nelson Mehlis (solo dev, Berlin). Bilingual DE/EN. Wins hackathons with this project. Uses User-Stories + Acceptance-Criteria + Wireframes as his planning surface. Wants full control — no "AI does it" framing, no Pro-Mode-Toggle.

**Hackathon proof-point:** 1st place, AI Builders Berlin, Daytona × Lovable track, Factory Berlin, 17.04.2026. V2.0 Brownfield shape won — judges saw the PartyEvent stream live on stage.

**Existential positioning:** NOT "Cursor + race-mechanic". The differentiator is **direction over delegation** — versioning-first, observability-first, alternatives-first, cost-transparent, assets-first-class, agents-user-definable.

---

## §2 — Current State (2026-04-19)

### What ships today (V2.0, in main branch)
- 5 Philosophy-Personas in `src/lib/personas/index.ts` (Hackfix, Craftsman, UX-King, Defender, Innovator).
- Brownfield race on GitHub issues.
- Daytona race-sandbox.
- Anthropic-only (Opus 4.7 / Sonnet 4.6 / Haiku 4.5).
- Landing page with open-source messaging + hackathon badge (last commits: `d0ebd67`, `1c94078`).

### What is written but UNCOMMITTED (V2.0 extension WIP)
`git status` shows ~17 new files + 1 modified — this is a working V2.0 extension that has never been committed or deployed:

- **API routes:** `src/app/api/byok/`, `src/app/api/cron/sandbox-lifecycle/`, `src/app/api/party/[id]/{chat,chat-history,pick,resume}/`
- **UI:** `src/app/app/settings/byok-card.tsx`, `src/app/party/[id]/{chat-pane,resume-card}.tsx`
- **Libs:** `src/lib/{byok,chat,costing,crypto,events,sandbox-lifecycle,trace}.ts`
- **Migration:** `prisma/migrations/20260418200000_v2_telemetry_chat_byok/`
- **Modified:** `src/lib/agent.ts`
- **Also untracked:** entire `planning/` directory (the V3.0 concept work below) and `scripts/`

Capabilities this WIP adds: AES-GCM BYOK for LLM providers, in-party chat-iterate per candidate, resume after browser reload, sandbox-lifecycle cron, PartyEvent audit log with telemetry migration, cost-tracking. This is what the hackathon crowd saw working live — it is **battle-tested and ready**, just not committed.

### What is planned (V2.5 → V4.0)
All planning lives under `planning/v3.0-studio/`. Canonical brief = **`13-concept-v3.0-final.md`** (978 lines, r3-final, 2026-04-19).

Reading order for fresh context:
1. `planning/v3.0-studio/13-concept-v3.0-final.md` — scope, kill-list, roadmap, capability matrix, handoff, open questions.
2. `planning/v3.0-studio/12-triage-decisions.md` — 12 binding decisions that shaped the final scope.
3. `planning/v3.0-studio/00-vision.md` — strategic narrative (§1–§13 authoritative; §14/§15/§16 superseded by 13-final).
4. `planning/v3.0-studio/round-r2/{05,07,08,09,11}-*-v2.md` — 5 R2 Green-Team specs, ~7400 lines total, for engineering depth when implementing.
5. `src/lib/` + `src/app/api/` — what ships today + what's uncommitted.

---

## §3 — Pending Decisions (Nelson-only)

### 3.1 V2.7 milestone — accept / reject / merge into V2.5
The R3 synthesis agent added **V2.7 — Stack-RACE + Templates (4 wks)** as an intermediate milestone between V2.5 and V3.0. This was NOT in the triage doc — agent judgment. See `13-concept-v3.0-final.md §0` scope table row 3 + `§3.2` details.

Rationale the agent gave: splits V2.5 (single-template Greenfield) from V3.0 (full Studio) with a clean 4-week increment. Keeps each release shippable.

**Options:**
- **Accept** — V2.7 exists as a named milestone with its own commit.
- **Reject** — delete V2.7 rows from §0 / §3 / §4; fold Stack-RACE into V3.0.
- **Merge into V2.5** — V2.5 becomes 16 weeks with Stack-RACE built in.

Default recommendation: **Accept** (clean increment, matches Nelson's "ship often" preference, earns data for V3.0 scope decisions).

### 3.2 The 12 open questions in §10
See `13-concept-v3.0-final.md §10`. These are distilled from the R2 specs + cross-cutting tensions. Nelson's input unblocks V3.0 detailed planning.

### 3.3 Pending planning-loop closes
- **Task #10** — add IterationRound / Critique / Resolution / Artifact models to `planning/v3.0-studio/01-data-model.md` (source: `round-r2/09-deep-iterate-v2.md`).
- **Task #11** — add Deep-Iterate UI spec to `planning/v3.0-studio/03-studio-ux.md`. **Label change:** "Harden" button → "Iterate" button (triage Q3 decision).

Both are mechanical carry-forwards from R2 specs into the older R1 planning docs. Not creative work. Should happen before implementation starts, so implementation agents don't find contradictions.

---

## §4 — Ranked Next Steps (recommended order)

### Move 1 — Ship V2.0 Extension (blast-radius: small, ROI: high)
Commit the untracked V2.0 extension + push + deploy to Railway.

**Why first:**
- Cannot build V2.5 on top of uncommitted work.
- Battle-tested: this is the shape that won the hackathon.
- Momentum: clearing the untracked backlog unblocks everything else.
- Nelson's global rule (`~/.claude/rules/common/git-workflow.md`): after every push, `railway up -s backend -d` + `railway up -s frontend -d` (both services).

**Sub-steps:**
1. Review diff + run typecheck + run tests.
2. Group commits logically (e.g., (a) telemetry migration, (b) BYOK, (c) chat-iterate, (d) resume, (e) sandbox-lifecycle cron, (f) planning docs separate commit).
3. Push + Railway deploy both services.
4. Smoke-test: hit the deployed URL, verify BYOK card + chat pane render.

**Do NOT commit:** any file that might contain secrets. Verify `src/lib/byok.ts` + `src/lib/crypto.ts` have no hardcoded keys before staging.

### Move 2 — Close Planning Loop (Tasks #10 + #11)
Mechanical carry-forwards. Probably 1 session of focused work.

### Move 3 — V2.7 Decision + Open Questions
Sit with Nelson for 30–60 min. Work through §10 of the canonical brief. Decide V2.7.

### Move 4 — V2.5 Migration Zero
First V2.5 migration = the data-model deltas from `13-concept-v3.0-final.md §6`:
- `AssetLogical`, `AssetVersion`, `BlobReference`, `Tenant.tenantSalt`, `GeneratorCircuitState` (from 08)
- `AgentDefinition` (contentHash, advisory renames), `CompositionSquad` (from 05)
- `AdvisorRun` (from 07)
- `IterationRound`, `Critique`, `Resolution`, `Artifact` (from 09)
- `RepoGenesisRun`, `OrphanedResource`, `RegionEnforcementCheck`, `UptimeSample`, `DeploymentQueue` + `Project.*` fields (from 11)

Land as a single Prisma migration `20260420000000_v25_scope_deltas` with comprehensive down-migration. Do NOT ship implementation yet — just the schema.

### Move 5 — V2.5 Story-RACE Scaffolding
`13-concept-v3.0-final.md §3.1` V2.5 scope-in. Start with Phase 2 Story-RACE: 5 Sonnet calls with distinct system-prompts (MVP-lean / Feature-complete / Verticals / Journey-first / Risk-first) racing on a brief.

---

## §5 — Binding Constraints (carry-forward from memory)

### From `~/.claude/rules/common/`
- **Git:** never `--no-verify`, never `--amend` on pushed commits, never force-push to main. Prefer small specific `git add <file>` over `git add -A`.
- **Deployment:** after every `git push`, run `"$RAILWAY" up -s backend -d` then `"$RAILWAY" up -s frontend -d` where `RAILWAY="/c/Users/nelso/AppData/Roaming/npm/railway.cmd"`.
- **Security:** no hardcoded secrets; validate all user input; parameterized queries; errors don't leak sensitive data.
- **Testing:** minimum 80% coverage, TDD workflow (RED → GREEN → REFACTOR).
- **Immutability:** always return new objects, never mutate.
- **File size:** 200–400 lines typical, 800 max.

### From memory (`~/.claude/projects/C--Users-nelso-Desktop-patchPartyDaytonaLovable/memory/`)
- **Adversarial design default:** for any non-trivial strategic question, spawn 4–6 parallel squads (architect, UX, red-team, competitor-forensic, domain-specific). Run in rounds: R1 parallel inputs → R2 synthesis + Red-vs-Green → R3 final concept doc. Never soften red-team output.
- **Infra stack:** Railway (prod) + Cloudflare (edge) + Daytona (sandbox). Never propose Vercel/Netlify/Gitpod/Coder as default. Managed-only V2.5/V3.0/V3.5; BYOK-for-Infra V4.0.
- **No flagship claims:** killed for V3.0 are "international-standard", "99.9% SLA", "SOC-2-ready", "HARD GDPR", "one-click-to-production-URL", agent marketplace, `run_command`, `fetch_url`, Aggressive auto-advance preset, triadic Deep-Iterate on one artifact. See `13-concept-v3.0-final.md §2` full kill-list.
- **Anti-features (permanent):** marketplace, public patterns-sharing, "ship without me" autonomous mode, "AI fixes it" framing, Pro-Mode toggle.
- **Anthropic-only V2.5/V3.0/V3.5.** OpenRouter → V4.0.
- **User profile:** solo dev, hackathon winner, B2B builder. Uses User-Stories/AC/Wireframes. Wants full control. Bilingual DE/EN.

### From `13-concept-v3.0-final.md`
- Every claim cites a primitive / path / PartyEvent. No rhetoric.
- Cost envelope cannot grow without explicit Nelson approval.
- Tool-scope-limit (V3.0) is NOT an OS-sandbox. OS-sandbox (gVisor/Firecracker) is V4.0 earning-back for `run_command`.

---

## §6 — First-Move Checklist (first 10 min of the next session)

1. `git status` + `git log --oneline -10` — confirm state matches §2.
2. Read `planning/v3.0-studio/13-concept-v3.0-final.md` fully.
3. Read `planning/v3.0-studio/12-triage-decisions.md` fully.
4. Skim 5 R2 spec frontmatters for quick orientation (~50 lines each).
5. Ask Nelson: "V2.0-Extension committen+deployen zuerst? Oder willst du die V2.7-Frage klären? Oder Tasks #10/#11 schließen?"
6. Wait for explicit approval before any destructive or visible action (git commit, push, Railway deploy, Prisma migrate).

### Safety protocol before any Move 1 git commit
- Grep for `sk-ant-` / `sk-` / `AWS_` / hardcoded `Bearer ` tokens in the staged diff.
- Run `npm run typecheck` or equivalent.
- Run `npm run lint` or equivalent.
- Verify `.env.example` updated if new env-vars introduced (`BYOK_ENCRYPTION_KEY`, new Prisma secrets, etc.).
- Each commit message: imperative mood, `<type>: <description>` format, no Claude attribution line (per Nelson's global settings).

### Escalation triggers (spawn multi-squad adversarial rounds)
- Any question about scope, roadmap, or positioning — use squad pattern (architect + UX + red-team at minimum).
- Any new load-bearing decision (e.g., switching stack, adding a vendor, changing the kill-list) — spawn R1 parallel inputs + R2 Red-vs-Green before writing code.
- Default single-agent synthesis is ONLY appropriate for mechanical carry-forward work (like Tasks #10/#11) and implementation.

---

## §7 — Handoff Contract

The next agent should:
- **Never** reintroduce scope killed in `13-concept-v3.0-final.md §2`.
- **Never** ship a Prisma migration without down-migration.
- **Always** run Railway deploy after git push (both services).
- **Always** check memory + CLAUDE.md + this file before making architectural decisions.
- **Always** ask before destructive or visible actions.
- **Never** claim capabilities without primitives (HMAC-SHA256 primitive, ed25519 primitive, AbortController primitive, etc. — cite by name).

If the next agent discovers contradictions between this doc and reality (e.g., V2.0 extension has already been committed, or a new file has appeared), treat reality as authoritative and flag the discrepancy.

---

## §8 — Provenance

This prompt was generated 2026-04-19 as the handoff artefact for the adversarial-design round that produced `13-concept-v3.0-final.md`. Full record:

- 9 squads (A–I) produced R1 specs across 3 rounds.
- 5 Red-Team attacks found 131 findings.
- `10-red-team-round3.md` synthesized 73 required-changes.
- `12-triage-decisions.md` captured 12 delegated decisions (Nelson-binding).
- 5 R2 Green-Team v2 specs defended what survived.
- `13-concept-v3.0-final.md` is the canonical R3 brief.
- This file is the EPHEMERAL bootstrap so the work can continue in a fresh session.
