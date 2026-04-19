---
name: PatchParty Concept v3.0 — Final Shippable Brief
round: r3-final
status: canonical
date: 2026-04-19
supersedes-for-roadmap:
  - 10-red-team-round3.md
  - 12-triage-decisions.md
authoritative-for:
  - V2.5, V3.0, V3.5, V4.0 scope
  - kill-list
  - open-questions
r2-inputs:
  - round-r2/05-custom-agents-v2.md
  - round-r2/07-autopilot-advisor-v2.md
  - round-r2/08-asset-pipeline-v2.md
  - round-r2/09-deep-iterate-v2.md
  - round-r2/11-deployment-infra-v2.md
---

# PatchParty Concept v3.0 — Final Shippable Brief

> **Status:** Canonical. This document supersedes the roadmap cells of `00-vision.md §14`, the open-question list of `00-vision.md §16`, the aspirational cells of `10-red-team-round3.md`, and the transitional scope notes of `12-triage-decisions.md`. It does not supersede `00-vision.md §1–§13` (the strategic frame, the dual-entry model, the non-negotiables), which remain authoritative.
>
> **Reading order for the next agent:** this file first. Then the five R2 spec files in `round-r2/` for engineering depth. Then `src/lib/` + `src/app/api/` for what ships today.
>
> **Register:** English primary, occasional German phrases where `00-vision.md` uses them (the user is a Berlin-based solo dev; the register is intentional). No marketing voice. Decision-oriented prose.

---

## §0 Executive Summary

### Elevator

PatchParty is a **software-production studio** in the spirit of Final Cut Pro. The developer is the director. Squads of agents deliver alternative takes at every meaningful decision. The human picks, scrubs, edits, branches, and ships an explainable PR. Unlike Bolt/Lovable/v0/Cursor/Devin, which optimise *time-to-first-app*, PatchParty optimises **direction over delegation** — versioning-first, observability-first, alternatives-first, cost-transparent, assets-first-class, agents-user-definable.

**Already shipping (V2.0):** Brownfield mode. Five philosophy-personas race per GitHub issue (`src/lib/personas/index.ts`). AES-GCM BYOK for LLM keys (`src/lib/byok.ts`, `src/lib/crypto.ts`). PartyEvent audit log (`src/lib/events.ts`). Cost tracking (`src/lib/costing.ts`). Daytona race-sandbox. Anthropic-only (Opus 4.7 / Sonnet 4.6 / Haiku 4.5). Chat-iterate, resume, and sandbox-lifecycle routes under `src/app/api/party/[id]/`. Telemetry migration under `prisma/migrations/20260418200000_v2_telemetry_chat_byok/`.

**Hackathon proof-point:** 1st place, AI Builders Berlin, Daytona × Lovable track, Factory Berlin, 17.04.2026. Brownfield-mode demo is battle-tested; V2.5 is the honest next step, not a rewrite.

### Post-triage scope table

The July-2026 Red-Team review (`10-red-team-round3.md`, 131 findings across five specs) broke every flagship claim. The triage (`12-triage-decisions.md`) killed the broken phrases and deferred the unshippable features with **named earning-back gates**. The R2 Green-Team specs defend what remains. This table is the result — the canonical roadmap at single-paragraph granularity.

| Release | Window | Honest sellable promise | In scope | Deferred (earning-back phase) |
|---|---|---|---|---|
| **V2.0** (shipping) | today | "Five Takes per PR." | Brownfield race on GitHub issue, 5 philosophy-personas, chat-iterate, BYOK-LLM, Daytona sandbox, PartyEvent, cost-ledger. | Everything else. |
| **V2.5 — Greenfield Foundation** (12 weeks) | +6 → +18 wks | "Brief to best-effort-deployed PR in one sitting." | Stories-RACE (5 slicing philosophies). Stack linear (1 default template: Next.js+Postgres+Tailwind+shadcn). Repo-Genesis Saga (GitHub-App last, Railway project, Cloudflare DNS-only, Daytona workspace). Phase-8 release = `railway up` only. Budget-Governor v1 with cancellation semantics. Demo-Mode Replay <90s. Legal: DPA template. | Canary, Blue-Green, Custom Agents, Deep-Iterate, Autopilot, Wireframes, Video, BYOK-Infra, multi-region, Stack-race. |
| **V2.7 — Stack-RACE + Templates** (4 wks) | +18 → +22 wks | "Five architectures, you pick." | Stack phase becomes RACE 5 with 3–5 ideology templates. | — |
| **V3.0 — Multimodal + Custom Agents + Canary + Preview-Envs + Autopilot Advisor + Deep-Iterate R1 + Image Assets** (10 wks) | +22 → +32 wks | "Bring any brief; compose your own persona-squad; preview every PR at a real URL." | Brief-clarification (multimodal). Loser-branch UX (timeline scrubber, branch-from-here). Custom Agents: persona-DSL + 5-base-personas + composition + closed toolset {`read_file`, `search_code`, `apply_codemod`}. Wireframe image generation. Cloudflare Workers canary-split. Daytona preview-envs per PR (7d TTL, HMAC-signed URL or CF-Access). Autopilot **Advisor** (FSM stops at Judging). Deep-Iterate V3.0 (R1-only + per-flaw patch-suggestion). | `run_command`, `fetch_url`, agent-sharing-as-service, marketplace, Aggressive-auto-advance, Deep-Iterate R2+R3, Wireframe-race, Video, Blue-Green, Seedance, BYOK-Infra, OpenRouter, SOC-2, 99.9% SLA, multi-region. |
| **V3.5 — Quality + Blue-Green + Pro-Tier Video + Dev-Envs** (6 wks) | +32 → +38 wks | "Ship-ready, with a demo-video, in a day." | Quality-pass specialist squads (a11y/perf/sec/type/cov). Phase-8 Blue-Green (explicit TTL-propagation-gate). Opt-in Wireframe-race. **Seedance-2 video behind Pro-tier + fleet-cap** (2 videos/project/month default) with Pika fallback. Daytona VS-Code-in-browser dev-envs. Pattern-mining starts. | BYOK-Infra, OpenRouter, SOC-2, full-Autopilot, Deep-Iterate triadic, multi-region-with-replicated-DB. |
| **V4.0 — Full Autopilot + OpenRouter + BYOK-Infra + SOC-2 + Deep-Iterate Triadic + Custom-Agent Sharing + Multi-Region** | +38 wks → … | "Set the budget; check in after lunch." | Full Autopilot (hard-cap cancellation + append-only audit chain + zero-hole cliff catalogue + 90d calibrated Composite-Score). OpenRouter for genuine instrument-diversity. Deep-Iterate triadic R1+R2+R3 *if data justifies*. Custom-Agent sharing with ed25519-signing + revocation. BYOK-for-Infra (Railway + CF + Daytona). Multi-region with contractual residency. CF Pages. SOC-2 Type-1 audit engagement. | — (this is the earning-back destination). |

### Kill-list callout

The **single biggest change** between the Round-3 specs and this v3.0-final is scope retraction, not feature addition. The Red-Team correctly identified that flagship claims ("international-standard", "99.9% SLA", "SOC-2-ready", "HARD GDPR", "one-click-to-production-URL", "four adversarial squads", "five instrument-diverse critics", "autopilot auto-advance at 0.85", "run_command", "agent marketplace", "wireframe race in default path") were rhetoric without primitives, certificates, or measurements. Triage killed them. This document enumerates the kill-list in §2 and never reintroduces it.

**What we still say out loud:** *"The best agentic software-development studio that exists. Not the fastest. Not the easiest. The deepest."* (`00-vision.md §0`, unchanged — this is a depth-claim, not a compliance-claim.)

### Hackathon-win credibility line

Not marketing copy. Evidence that the Brownfield-shape works: 1st place, AI Builders Berlin, Daytona × Lovable track, 17.04.2026 — judged by a room of operators, with the V2.0 PartyEvent stream visible on stage. The V2.5+ plan is the honest extension of a thing that already won a prize, not a speculative pivot.

---

## §1 What PatchParty Studio IS (post-triage)

### 1.1 Dual-entry model

Two user journeys into the same race-engine:

- **Brownfield** (shipping today, V2.0): existing GitHub repo → pick an issue → 5-persona race → chat-iterate in winner sandbox → PR. Under 30 minutes for the typical senior-dev flow. `src/app/api/party/[id]/pick/route.ts` is the surface.
- **Greenfield** (V2.5+): brief → Stories-RACE → Stack (linear V2.5, RACE V2.7) → Repo-Genesis Saga → Story-Implementation-RACE → existing PR flow. Under one sitting for an MVP-shaped product.

Both journeys overlay with **two autonomy modes**: Director (default — human picks every race) and Autopilot Advisor (V3.0 — advisor computes Composite-Score and ranks candidates, but the FSM **stops at Judging**; human still picks). Full autopilot ships V4.0 against six measurable gates.

### 1.2 Five philosophy-personas + persona-DSL

The race-engine runs exactly **five base personas** (`src/lib/personas/index.ts` today — Hackfix / Craftsman / UX-King / Defender / Innovator). These are hash-locked read-only base files in V3.0 (`round-r2/05-custom-agents-v2.md §1.1` table row "5 base personas as YAML files"). Users define additional personas via a YAML-frontmatter DSL and compose 3–5 of them into named squads. No "14 pre-baked adversarial slugs" (killed per triage Q12) — because five slugs with real content outperform fourteen slugs with stub content, and because the four "adversarial squads" of the Round-3 spec were, per Red-Team 05, one LLM in four hats.

### 1.3 Three phases (Preflight → Race → Release)

The 10-row phase table in `00-vision.md §4` collapses in practice to three user-visible phases:

1. **Preflight** — Brief clarification, Story-race, optional Wireframe generation, Stack pick. Greenfield-only. Linear or shallow-race. This is where the *project is shaped*.
2. **Race** — Story-Implementation race (5 personas) per story, chat-iterate in winner sandbox, per-candidate pick/re-race, Deep-Iterate option on any picked candidate. This is the **heart** of the product.
3. **Release** — Quality-pass (V3.5), canary/blue-green/big-bang deploy (`round-r2/11-deployment-infra-v2.md §5`), ADR commit, PartyEvent export. This is where the *candidate becomes a PR*.

Cross-cutting: **Asset-Pipeline** (Bin, left rail — uploaded briefs, generated wireframes, generated demo-videos, ADRs, marketing copy) and **Custom Agents** (definitions live at `~/.patchparty/agents/` or per-Project).

### 1.4 Deep-Iterate R1-only (V3.0) + patch-suggest

After a user picks a candidate, they can click **Iterate** (renamed from "Harden" per `round-r2/09-deep-iterate-v2.md §3` — "hardened" is a marketing claim we cannot verify). Five cross-model critics (Opus 4.7 × 1 + Sonnet 4.6 × 2 + Haiku 4.5 × 2, same Anthropic family, sampled for diversity) read the picked artifact. Each returns 2–3 evidence-backed flaws. For every flaw, the same critic proposes a concrete **unified-diff patch** the user accepts or rejects individually.

That is the product. It is **not** "1 hardened candidate" — that phrase is retired until V4.0 when (a) OpenRouter or equivalent delivers genuine instrument-diversity and (b) ≥500 sessions of telemetry show per-variant user-selection-rate varies meaningfully (`round-r2/09-deep-iterate-v2.md §0`).

### 1.5 Autopilot Advisor (STOPS at Judging)

The R2 spec `round-r2/07-autopilot-advisor-v2.md §0` is explicit: the **name is Autopilot Advisor**, not Autopilot. The FSM reduces from 9 states to **4: Idle → BudgetLocked → Racing → Judging → STOP**. There is no Picking state, no Committing state, no ReversibilityCheck state, no HumanPagedOut state in V3.0. The advisor computes Composite-Score and shows it as a ranking advisory on every Race-Card with a per-candidate model-badge (`opus:4.7`, `sonnet:4.6`, `haiku:4.5`). The user picks. Always. Period.

The **Aggressive preset is killed permanently** — not deferred, killed. It contradicts `00-vision.md §13` Non-Negotiable #1 ("human signs final PR"). Any future fully-autonomous mode requires explicit per-action human-confirmation or it does not ship.

### 1.6 8-type asset pipeline (image default, video V3.5 Pro-tier)

`round-r2/08-asset-pipeline-v2.md §3.1` defines 8 asset types: Brief, Story, Wireframe, Logo, Code, Demo-Video, Marketing-Copy, ADR. V3.0 ships text + image (GPT-image-1 default generator, Recraft v3 for logos). **Seedance-2 video is V3.5-only, behind Pro-tier pricing + 2-videos/project/month fleet cap + Pika fallback on outage** (`round-r2/08-asset-pipeline-v2.md §0` deferrals + triage Q5).

Two-layer asset model: `AssetLogical` (stable ID, the citable thing) + `AssetVersion` (content-hashed R2 blob). Edits are non-destructive by construction — every refinement produces a new `AssetVersion`. Cross-tenant dedup is disabled (triage Q10); per-tenant `HMAC-SHA256(tenantSalt, projectId)` key prefix guarantees isolation and makes GDPR erasure effective by deleting the `Tenant.tenantSalt` row.

### 1.7 Three-layer deployment, managed-only

Railway (prod runtime) + Cloudflare (edge: DNS, CDN, WAF, Workers, R2, Access, Pages-V4.0) + Daytona (sandbox / preview-env / dev-env). `round-r2/11-deployment-infra-v2.md §1` confirms the topology. V3.0 is **managed-mode only** — PatchParty-hosted Railway project, CF account, Daytona account. BYOK-for-Infra defers to V4.0 (triage Q9) because solo-dev support-ops cannot absorb three-provider error-proxying at V2.5.

**Region-pinning has six enforcement boundaries** (Railway project + R2 bucket + CF Worker + LLM allow-list + cron scheduler + Daytona workspace), each validated at startup and failing closed with the `region.enforcement.violated` PartyEvent hard-blocking all requests (`round-r2/11-deployment-infra-v2.md §2.3`).

---

## §2 What PatchParty Studio IS NOT (kill-list)

Each item below is **killed or deferred**. Every entry cites the Red-Team finding or triage-decision number that killed it. These items do not appear in §3 (roadmap) except in the V4.0 column as "earning-back" targets where applicable.

| Killed or deferred | Why killed | Where it lives (if at all) |
|---|---|---|
| **"International-standard" flagship phrase** | Red-Team 11-F-flagship + triage Q1: phrase has no certificate backing it at solo-dev tier. | V4.0 earning-back: phrase returns only with shipped SOC-2 Type-1 artefacts. |
| **"99.9% SLA" claim** | Red-Team 11-F7 correct: 3 providers at 99.9% compose to 99.7% effective; PatchParty has zero enterprise contracts. Triage Q2. | V4.0+ earning-back: "99.5% measured" (honest) after 6 months of measured-uptime dashboard + BYOK-Infra shipped + customer contracts their own tiers. |
| **"SOC-2-ready" claim** | Red-Team 11-F-flagship + triage Q1: no engagement, no auditor, no control-list. | V4.0 earning-back: engagement begins when paying customers fund the ~€30K audit spend. |
| **"HARD GDPR region-pinning" claim** | Triage Q1 (flagship-adjacent): the mechanism (6-boundary enforcement) is real and shipping V3.0, but the *claim* ("HARD", "guarantee") is legally dangerous without contractual DPA + published DPIA. | V3.0 ships "best-effort region-pinning with 6 fail-closed boundaries and `region.enforcement.violated` hard-block." V4.0 adds contractual language when legal budget permits. |
| **Managed cross-user Custom-Agent sharing** | Red-Team 05-F4: private sharing is a de-facto marketplace with zero moderation, signing, or revocation. Triage Q8. | V4.0 earning-back: ed25519-signing + revocation-registry + installed-agent audit-log + content-hash-pin. V3.0 users share YAML files manually (email, Slack, git-checkin) — same workflow as a `tsconfig.json`. |
| **`run_command` / arbitrary shell in Custom-Agent toolset** | Red-Team 05-F1: CVE-class surface in a default registry. Triage Q6. | V4.0 earning-back: OS-level sandbox (gVisor or Firecracker) + per-invocation permission-modal + audit-log-before-execute + no auto-promotion. V3.0 ships `apply_codemod` (signed registry of Biome/Prettier/ESLint-fix/jscodeshift/Ruff-fix) instead. |
| **`fetch_url` in Custom-Agent toolset** | Red-Team 05-F3: SSRF + exfil surface. | V4.0 earning-back: SSRF-threat-model ADR + pinned-IP egress + RFC1918/metadata blocklist + cert-pinning. |
| **Aggressive Autopilot auto-advance preset** | Red-Team 07-F19: contradicts `00-vision.md §13` NN#1. Triage Q4. | **Permanently killed**, not deferred. Any future "fully auto" requires explicit per-action human-confirmation. |
| **Deep-Iterate "1 hardened candidate" claim** | Red-Team 09 core thesis: same-family critics collapse to risk-appetite-scalar; R2 variants are monologue; R3 is compression mis-labeled as synthesis. Triage Q3. | V4.0 earning-back: triadic R1+R2+R3 ships *only* if OpenRouter delivers instrument-diversity *and* 500-session data shows per-variant selection-rate varies meaningfully. V3.0 ships R1-only + per-flaw patch-suggestion. |
| **Triadic Deep-Iterate marketing language** | Same as above. | Phrase "triadic" is not used in V3.0 marketing. "Critique pass" is the V3.0 term. |
| **BYOK-for-Infra** | Red-Team 11-supp: support-ops cost of error-proxying 3 provider formats. Triage Q9. | V4.0 earning-back: dedicated FinOps + multi-provider error-normaliser + threat-model for app-server-compromise. V3.0 publishes honest cost-passthrough disclosure instead. |
| **Agent marketplace** | `00-vision.md §10` anti-feature + Red-Team 05-F4. | Never. Not on the roadmap. Manual file-transport only. |
| **Four pre-baked adversarial squads** (compliance-red / security-red / ux-red / cost-red) | Red-Team 05-F + triage Q12: Red-Team proved they were 1 LLM in 4 hats; naming-theater without diversity measurement. | V4.0 earning-back: measured finding-set IoU < 0.5 across 30-candidate eval before any "four orthogonal adversarial squads" marketing returns. V3.0 ships 5-base + composition. |
| **Agent trust-tier auto-promotion** | Red-Team 05-F10: Sybil-attack vector. Triage Q6 rationale. | V4.0 earning-back: tier concept returns only with explicit per-user confirmation + diff-review of every rendered prompt + no auto-promotion. |
| **Wireframe-race in default flow** | Red-Team 08-F11: generation cost vs perceived user value. | V4.0 (`round-r2/08-asset-pipeline-v2.md §13`). V3.0 / V3.5 = opt-in single wireframe per Story, not a race. |
| **Multi-region with cross-region DB replication** | Red-Team 11-F9: requires paid SRE + DB migration. | V4.0+ earning-back: paid SRE + migration off vanilla Railway-Postgres *or* Railway ships cross-region replicas at Pro tier. V3.5 ships single-region-picker only. |
| **Secret-rotation orchestration across providers** | Red-Team 11-F26. | V4.0 earning-back: on-call engineer + anomaly-detector in the stack. V3.0 ships per-provider cadence only. |
| **OpenRouter / multi-provider LLM** | Triage Q7. Opus-4.7 leadership is the V2.5/V3.0 moat; adding a vendor we can't validate quickly breaks it. | V4.0 earning-back: (a) Anthropic-only shape of the platform is proven-profitable, (b) customers explicitly ask (compliance/geopolitical), (c) at least one paid engineer can own the provider-abstraction layer. |
| **Demo-Replay lifecycle-transition risk** | Red-Team 08-F6: 90-day IA/Archive transition breaks Demo-Replay contract (`00-vision.md §13` NN#2). | V3.0 ships `AssetLogical.demoPinned=true` that throws at lifecycle-transition attempt. 90-day transition removed entirely. |
| **"Atomic DNS-swap"** | Red-Team 11-F: DNS is never atomic (TTL propagation). | V3.0 uses Worker-origin re-bind (not DNS swap) for Blue-Green where available. V3.5 Blue-Green ships with explicit TTL-propagation-gate. |
| **"Brief to production-URL"** | Custom-domain projects may exceed one session due to DNS propagation. | V3.0 copy: "brief to best-effort-deployed PR in one session." The Studio UI copies this verbatim into the domain-setup card (`round-r2/11-deployment-infra-v2.md §0`). |

---

## §3 Roadmap V2.5 → V3.0 → V3.5 → V4.0

The cells below are intentionally granular. Each includes *scope-in*, *scope-out*, *gating criteria* (what must be true before it ships), and *earning-back for next* (what V4.0 needs that V3.0 is generating data for).

### 3.1 V2.5 — Greenfield Foundation (12 weeks)

**Scope-in:**

- **Phase 2 Story-RACE.** 5 slicing philosophies (MVP-lean / Feature-complete / Verticals / Journey-first / Risk-first) implemented as 5 Sonnet calls with distinct system-prompts, racing on the brief. 1 pick = 1 story-set. Cost envelope ~$0.60 per race (5 × Sonnet @ ~$0.12 avg).
- **Phase 4 Stack linear.** One default template: Next.js + Postgres + Tailwind + shadcn. `show-alternatives` link displays a cheap Haiku-generated comparison; not a race.
- **Phase 5 Repo-Genesis Saga.** Persisted state machine (`round-r2/11-deployment-infra-v2.md §7`) with advisory locks, idempotency keys, FAILED_ORPHAN terminal state (no customer charge), reconciliation cron. **GitHub repo creation is the LAST step**, not the first, closing F13's visible-empty-repo-with-billing crash window. Saga order: (i) Railway project provisioned, (ii) Railway DB + services booted, (iii) Cloudflare zone + routes configured, (iv) Daytona workspace template instantiated, (v) *then* GitHub-App repo creation.
- **Phase 8 Release MVP.** `railway up` only. No canary, no blue-green. Big-Bang is explicitly allowed for V2.5 Brownfield single-service path; anti-pattern for prod multi-service.
- **Anthropic-only** (Opus 4.7 / Sonnet 4.6 / Haiku 4.5). Per triage Q7.
- **Budget-Governor v1.** Soft-watermarks at 50/75/90%, hard-cap at 100% halts new races, in-flight races **cancel via `AbortController.abort()`** (not "complete and persist as losers" — that was R1 language; R2 spec corrected it). User-facing cap = 90% of billed cap (10% absorbs partial in-flight).
- **Demo-Mode Replay <90s.** Pre-recorded PartyEvent stream plays back on `/studio/demo`. Non-negotiable (`00-vision.md §13` NN#2).
- **Legal blocker:** DPA template + data-subject-right handling process.

**Scope-out (explicit):** Canary, Blue-Green, Custom Agents, Deep-Iterate, Autopilot (any mode), Wireframes, Video, BYOK-Infra, multi-region, Stack-race, OpenRouter, marketplace, agent-sharing-as-service, SOC-2, "99.9% SLA", "international-standard".

**Gating criteria (what must be true to call V2.5 done):**

- Repo-Genesis Saga completes end-to-end in a Daytona workspace ≥95% of the time on a 30-run eval-set. Failures leave no orphaned resources (verified by `OrphanedResource` table staying empty).
- Budget-Governor cancellation p99 ≤ 2s on a 10-race eval-set (earning-back gate B for full-Autopilot).
- Demo-Mode Replay reliably plays back in <90s from 10 consecutive cold-starts.
- DPA template reviewed by external counsel (budget line: ~€3K).
- `OrphanedResource`, `RepoGenesisRun`, `RegionEnforcementCheck`, `UptimeSample`, `DeploymentQueue`, `Project.measuredAvailability30d`, `Project.cfAccountIndex`, `Project.regionEnforcementAllOk` Prisma models land in first V2.5 migration (`round-r2/11-deployment-infra-v2.md §9`).

**Earning-back for V3.0:** every Story-RACE in V2.5 generates telemetry that V3.0's Autopilot Advisor uses to calibrate Composite-Score. Every Budget-Governor cancellation in V2.5 is a test of the cancellation-p99 gate. V2.5 *is* the calibration dataset for V3.0.

### 3.2 V2.7 — Stack-RACE + Templates (4 weeks)

**Scope-in:** Phase 4 becomes RACE 5. Three to five templates: Batteries-included, Edge-native, Enterprise, OSS-only, Serverless-minimal. Each is an ADR-style output with a generated scaffold.

**Scope-out:** everything else from V3.0+.

**Gating:** per-template scaffold boots cleanly on a fresh Railway project in ≤5 min; `adr.generated` PartyEvent carries the full ideology comparison.

### 3.3 V3.0 — Multimodal + Custom Agents + Canary + Preview-Envs + Advisor + Deep-Iterate R1 + Image Assets (10 weeks)

**Scope-in:**

- **Phase 1 Brief-clarification multimodal.** PDF, transcript, Loom URL, voice memo — parsed and normalized to `ProblemStatement` by Sonnet with a clarifying-questions thread.
- **Loser-branch UX.** Timeline scrubber always visible. Double-click any historical pick → "branch from here" dialog → second timeline track. Tiered GC (`round-r2/08-asset-pipeline-v2.md §13` + triage Q11): Tier A (ADR-cited) pinned-forever, Tier B (uncited race-losers) 90d default user-configurable, Tier C (re-rolls/sandbox-ephemera) 7d.
- **Custom Agents — reduced scope.** Persona-DSL (YAML frontmatter) + 5-base-personas hash-locked + composition DSL + closed toolset `{read_file, search_code, apply_codemod}`. Signed codemod-registry (ed25519 over registry entries; project-admin co-signs user-defined codemods). Fail-closed load: missing `version`/`content_hash`/`model`/`toolset` → error, not default (`round-r2/05-custom-agents-v2.md §0.7`).
- **Wireframe image generation.** Image-model (GPT-image-1 default) generates PNG wireframes from Story + Brief. Default = single-best, not race. Stored as `AssetLogical` + `AssetVersion` in R2 with HMAC-salt prefix.
- **Cloudflare Workers canary-split.** Per-project Worker with header-based 5% → 100% promotion at health-gates. Canary Observer Worker schedules verbatim TS code (`round-r2/11-deployment-infra-v2.md §3.4.4`) with per-tier SLO table.
- **Daytona preview-envs per PR-branch.** 7d TTL. Default = HMAC-signed URL; CF-Access opt-in for SSO (`round-r2/11-deployment-infra-v2.md §3.4.3`).
- **Autopilot Advisor.** FSM 4-state (Idle → BudgetLocked → Racing → Judging → STOP). Composite-Score as ranking advisory; 0.85 threshold retired from auto-pick and becomes "confident pick" advisory badge. Per-candidate model-badge on every race-card. Hard-cap cancellation via AbortController. Hash-chained PartyEvent with Postgres append-only trigger + per-event `prevHash`/`eventHash`. Sensitivity-High / Sensitivity-Low presets (threshold-only delta; Aggressive killed). `AdvisorRun` Prisma model. `/api/advisor/runs/{id}/verify` endpoint + nightly `advisor-verify` cron (`round-r2/07-autopilot-advisor-v2.md §0`).
- **Deep-Iterate V3.0.** R1-only. 5 cross-model critics (Opus 4.7 × 1 + Sonnet 4.6 × 2 + Haiku 4.5 × 2). Each critic surfaces 2–3 flaws and proposes a unified-diff patch per flaw. User accepts/rejects individually. Single preset ~$0.75 per run + pre-flight estimator. Branch naming `iterations/{phase}-{shortid}-r1`. `IterationRound`, `Critique`, `Resolution`, `Artifact` Prisma models (`round-r2/09-deep-iterate-v2.md §0`).

**Scope-out:** `run_command`, `fetch_url`, cross-user agent-sharing-as-service, marketplace, Aggressive-auto-advance, Deep-Iterate R2+R3, Wireframe-race, Video (all kinds), Blue-Green, Seedance, BYOK-Infra, OpenRouter, SOC-2, multi-region, full-Autopilot.

**Gating:**

- Custom-Agent content-hash-pin round-trips: store → reload → verify hash matches on 100 eval agents. Failure = ship-blocker.
- Canary Observer Worker catches a synthetic regression in <60s on a 10-run eval.
- Preview-env URL authentication: HMAC-signed URL default rejects tampered-signature requests with 100% recall on a 500-request attack eval.
- Deep-Iterate R1 preset completes ≤30s on 95% of a 50-session eval (Demo-Mode NN#2 compatibility).
- Hash-chained PartyEvent: nightly `advisor-verify` cron confirms chain continuity on 100% of 30-day rolling window.

**Earning-back for V3.5:** V3.0 generates image-asset volume that V3.5's Seedance video pipeline uses to calibrate Pro-tier fleet-cap. V3.0 Canary observability generates the Blue-Green TTL-propagation-gate data. V3.0 Advisor run-data (target ≥500 sessions) is the dataset V4.0 full-Autopilot needs for Composite-Score calibration.

### 3.4 V3.5 — Quality + Blue-Green + Pro-Tier Video + Dev-Envs (6 weeks)

**Scope-in:**

- **Phase 7 Quality-pass.** a11y (axe-core + Haiku scan + Sonnet fix). Perf (Lighthouse + Sonnet fix). Sec (Semgrep + Sonnet fix). Type (tsc + Sonnet fix). Coverage (Vitest + Sonnet fix). Single-best-fix per concern, not 5-race.
- **Phase 8 Blue-Green.** Two Railway services + explicit TTL-propagation-gate + CF API origin re-bind. The gate is user-visible; the UI copies the TTL countdown to the operator.
- **Opt-in Wireframe-race.** 3 alternative wireframes for a Story, linear race, shallow.
- **Seedance-2 video behind Pro-tier.** 2 videos/project/month default (configurable in BYOK mode). Per-project cost-reject at start-of-generation (not retroactive refuse). Pika fallback on Seedance outage (`round-r2/08-asset-pipeline-v2.md §F15` circuit-breaker: 3 failures in 5 min → open for 10 min → half-open probe → closed).
- **Daytona VS-Code-in-browser dev-envs.** Long-running dev workspace on-demand for power users.
- **Pattern-mining starts.** ≥3k projects worth of loser-branch dataset feeds a pattern-discovery pass.

**Scope-out:** BYOK-Infra, OpenRouter, SOC-2, full-Autopilot, Deep-Iterate triadic, multi-region-with-replicated-DB.

**Gating:**

- Blue-Green deploy on eval-app completes end-to-end with TTL-propagation-gate honoured (no premature cutover) on 10 consecutive runs.
- Seedance fleet-cap enforcement: `cost-reject-at-start` on 100% of cap-exceed eval runs; no retroactive refusal.
- Quality-pass a11y fixer doesn't break working markup on a 20-page eval; Semgrep fixer doesn't introduce new high-severity findings.

**Earning-back for V4.0:** Pro-tier usage data calibrates per-project video fleet-cap. Blue-Green telemetry validates multi-region honest framing. Pattern-mining starts the dataset for V4.0 Deep-Iterate R2 variant-diversity measurement.

### 3.5 V4.0 — Full Autopilot + OpenRouter + BYOK-Infra + SOC-2 + Deep-Iterate Triadic + Custom-Agent Sharing + Multi-Region

**Scope-in (earning-back destinations):**

- **Full Autopilot.** Graduates only when all six gates are green (`round-r2/07-autopilot-advisor-v2.md §0`): (A) composite-calibration <10% override over 90d/500 runs; (B) cancellation-p99 <2s; (C) 12mo clean audit trail; (D) zero-hole Red-Team cliff review; (E) Aggressive-preset-class permanently killed (already true V3.0); (F) empirical cost-per-race dashboard published.
- **OpenRouter / multi-provider LLM.** Provider-abstraction layer owned by ≥1 paid engineer. Instrument-diversity measurement available.
- **BYOK-for-Infra.** Dedicated FinOps + multi-provider error-normaliser + threat-model for app-server-compromise.
- **SOC-2 Type-1 audit engagement.** Funded by paying customers (~€30K audit spend).
- **Deep-Iterate triadic.** R1 + R2 Green-Team variants + R3 Synthesis — **only if** 500-session data shows per-variant selection-rate varies meaningfully and OpenRouter delivers instrument-diversity.
- **Custom-Agent sharing.** ed25519-signed agent-YAML + content-hash-pin + revocation-registry + installed-agent audit-log + marketplace (optional, still debated per `00-vision.md §10` anti-feature stance).
- **Multi-region with replicated DB.** Paid SRE + migration off vanilla Railway-Postgres or Railway Pro-tier replicas.
- **CF Pages.** Marketing/docs surface.
- **Secret-rotation orchestration.** Cross-provider scheduler.

**Scope-out:** none — this is the earning-back destination.

**Gating:** each item above has its own published gate in the relevant R2 spec deferral-table. No item ships until its gate is green.

---

## §4 Capability Matrix

Rows = capability. Columns = V2.5 / V3.0 / V3.5 / V4.0. Values: **ship** (in scope, shipping in that version), **partial** (some variant ships, full variant defers), **off** (not in scope), **earning-back** (deferred with named gate), **killed** (permanently removed).

| Capability | V2.5 | V3.0 | V3.5 | V4.0 |
|---|---|---|---|---|
| Brownfield race on GitHub issue | ship | ship | ship | ship |
| Greenfield brief → Stories-RACE | ship | ship | ship | ship |
| 5-persona race (implementation phase) | ship | ship | ship | ship |
| Persona-DSL (YAML frontmatter) | off | ship | ship | ship |
| Composition DSL (user-defined squads) | off | ship | ship | ship |
| `apply_codemod` (signed registry) | off | ship | ship | ship |
| `run_command` / arbitrary shell | off | off | off | earning-back |
| `fetch_url` | off | off | off | earning-back |
| Autopilot Advisor (STOP at Judging) | off | ship | ship | ship |
| Autopilot Full (auto-commit, auto-deploy) | off | off | off | earning-back (6 gates) |
| Aggressive auto-advance preset | killed | killed | killed | killed |
| Deep-Iterate R1-only + patch-suggest | off | ship | ship | ship |
| Deep-Iterate R2 Green-Team variants | off | off | off | earning-back (OpenRouter + 500-session data) |
| Deep-Iterate R3 Synthesis | off | off | off | earning-back |
| Asset pipeline — image (wireframe, logo) | off | ship | ship | ship |
| Asset pipeline — Seedance-2 video | off | off | partial (Pro-tier + fleet-cap + Pika fallback) | ship |
| Wireframe-race in default flow | off | off | off | earning-back |
| Wireframe opt-in single | off | ship | ship | ship |
| Wireframe opt-in race (3 alternatives) | off | off | ship | ship |
| Preview-envs per PR (Daytona + HMAC URL) | off | ship | ship | ship |
| Preview-envs CF-Access SSO | off | ship (opt-in) | ship | ship |
| Managed-deploy Railway + CF | ship | ship | ship | ship |
| Canary release (CF Worker split) | off | ship | ship | ship |
| Blue-Green release (TTL-propagation-gate) | off | off | ship | ship |
| Big-Bang release (Brownfield single-service) | ship | ship | ship | ship |
| BYOK-LLM (AES-GCM) | ship (today) | ship | ship | ship |
| BYOK-for-Infra (Railway + CF + Daytona) | off | off | off | earning-back |
| Agent-sharing — manual YAML file | ship (trivially) | ship | ship | ship |
| Agent-sharing — platform-brokered | off | off | off | earning-back (ed25519 + revocation + audit) |
| Agent marketplace | killed | killed | killed | earning-back (still debated) |
| Multi-region DB (replicated) | off | off | off | earning-back |
| Region-pinning enforcement (6 boundaries, fail-closed) | partial (startup-check, 3 boundaries) | ship (6 boundaries) | ship | ship |
| Hash-chained PartyEvent (per-event prevHash/eventHash) | off | ship | ship | ship |
| ed25519-signed PartyEvent | off | off | off | earning-back |
| GDPR erasure via tenant-salt HMAC | off | ship | ship | ship |
| SOC-2 Type-1 claim | off | off | off | earning-back (€30K audit) |
| "99.9% SLA" claim | killed | killed | killed | earning-back ("99.5% measured" after 6mo dashboard) |
| "International-standard" claim | killed | killed | killed | earning-back (with shipped certificates) |
| OpenRouter / multi-provider LLM | off | off | off | earning-back |
| Quality-pass specialist squads | off | off | ship | ship |
| Custom domain | off | ship (with DNS-propagation disclosure) | ship | ship |
| VS-Code-in-browser dev-envs | off | off | ship | ship |
| Pattern-mining | off | off | starts | ship |

---

## §5 Architecture Digest

### 5.1 Three-layer deployment (V3.0 scope)

```
                 USER BROWSER / DEVELOPER CLI
                             │
                             ▼
  ┌────────────────────── Cloudflare (Edge) ──────────────────────┐
  │  DNS · CDN · WAF · TLS · Workers (canary / preview-gate /    │
  │  observer) · R2 (asset storage) · Access (SSO opt-in)        │
  │  — all six region-pin boundaries checked at startup —         │
  └───────────┬──────────────────────────────────┬────────────────┘
              │                                  │
              ▼                                  ▼
  ┌─── Railway (Prod Runtime) ───┐      ┌─── Daytona (Sandbox) ───┐
  │  Backend service (Next.js    │      │  Race-sandbox (V2.0)    │
  │    route-handlers)           │      │  Preview-env per PR     │
  │  Frontend service (Next.js   │      │    (7d TTL, V3.0)       │
  │    RSC/SSR)                  │      │  Dev-env (V3.5)         │
  │  Postgres                    │      │  OAuth-scoped; user     │
  │  Queue (for cron jobs)       │      │    workspace templates  │
  └──────────┬───────────────────┘      └─────────────────────────┘
             │
             ▼
  ┌──── PartyEvent (hash-chained, append-only) ─────────────────┐
  │  Postgres trigger enforces append-only + prevHash/eventHash │
  │  Nightly advisor-verify cron + /api/advisor/runs/{id}/verify│
  └──────────────────────────────────────────────────────────────┘
```

Cite: `round-r2/11-deployment-infra-v2.md §1` (topology), §2.3 (region-pinning 6 boundaries), §3.4.4 (Canary Observer), §3.4.3 (auth-preview-gate), §5 (release strategies), §7 (Repo-Genesis Saga).

### 5.2 Race runtime

Every race is a `RaceRun` row in Postgres. Each `RaceCandidate` is produced by a named persona (either a V3.0-base or a user-defined persona) running Opus/Sonnet/Haiku in a Daytona sandbox (for Implementation-phase) or inline (for Story/Stack phases). The Inspector streams candidate output via SSE. Pick writes an `EditOverlay` row; re-race spawns a new `RaceRun` with the prior pick's output as context. Diversity-Judge pass computes pairwise AST-diff (code) or semantic-diff (text); if max-similarity > threshold, the orchestrator silently re-rolls offenders with diversified prompts (`00-vision.md §5` Principle #6).

Cite: `src/lib/personas/index.ts` (5 base personas), `src/app/api/party/[id]/pick/route.ts` (today's pick route), `00-vision.md §5` (8 race-mechanic principles).

### 5.3 Deep-Iterate R1 loop

```
User picks Candidate-C on a Race-Run.
         │
         ▼
User clicks  [ Iterate ]  (renamed from Harden)
         │
         ▼
Deep-Iterate preset (single V3.0 preset, ~$0.75, ~30s)
spawns 5 cross-model critics:
   ┌── Opus 4.7   (critic-role-A: defender)
   ├── Sonnet 4.6 (critic-role-B: craftsman)
   ├── Sonnet 4.6 (critic-role-C: ux-king)
   ├── Haiku 4.5  (critic-role-D: hackfix)
   └── Haiku 4.5  (critic-role-E: innovator)

Each critic reads Candidate-C, returns:
   { flaws: [ { severity, evidence, proposed-patch-as-unified-diff }, ... ] }

Inspector renders flaws as per-flaw cards with [accept] / [reject].
User accepts subset → patches apply cumulatively → commit on
  branch `iterations/{phase}-{shortid}-r1` with per-patch commit msg.
```

Cite: `round-r2/09-deep-iterate-v2.md §0` (executive summary), §3 (critique pass naming).

### 5.4 Advisor FSM (4 states)

```
  ┌─────┐
  │Idle │ ── user opens project, no budget locked
  └──┬──┘
     │ budget set + AC declared
     ▼
  ┌──────────────┐
  │BudgetLocked  │ ── budget governor armed; cap = 90% user-visible
  └──────┬───────┘
         │ user starts race
         ▼
  ┌─────────┐       hard-cap crossed
  │ Racing  │ ─────────────────────► AbortController.abort()
  └────┬────┘                           │
       │ all candidates complete        │
       ▼                                ▼
  ┌──────────┐                    ┌────────┐
  │ Judging  │                    │  STOP  │ ── cancellation event
  │ (scoring │                    └────────┘
  │  shown   │
  │  as      │
  │  advisory│
  │  only)   │
  └────┬─────┘
       │ human picks
       ▼
  ┌────────┐
  │  STOP  │ ── FSM terminates; Picking/Committing/Deploy are
  └────────┘    separate human-initiated flows in V3.0
```

Cite: `round-r2/07-autopilot-advisor-v2.md §0` (state reduction).

### 5.5 Asset two-layer model

```
┌─────────────────── AssetLogical ──────────────────┐
│ id (stable, citable)                              │
│ type  (brief | story | wireframe | logo | code    │
│        | demo-video | marketing-copy | adr)       │
│ tenantId → Tenant.tenantSalt                      │
│ demoPinned: bool  (throws at lifecycle transition)│
│ currentVersionId → AssetVersion                   │
└────────┬──────────────────────────────────────────┘
         │ 1..N
         ▼
┌─────────────────── AssetVersion ──────────────────┐
│ id                                                │
│ logicalId → AssetLogical                          │
│ contentHash (sha256, immutable)                   │
│ r2Key = projectId/HMAC(tenantSalt,projectId)/     │
│         sha256/{ab}/{cd}/{contentHash}.{ext}      │
│ generator, generatorVersion, prompt-hash          │
│ createdAt                                         │
└────────┬──────────────────────────────────────────┘
         │ 1..N
         ▼
┌─────────────────── BlobReference ─────────────────┐
│ r2Key, assetVersionId                             │
│ refCount                                          │
│ → GDPR erase deletes tenantSalt → HMAC            │
│   unreproducible → all derived r2Keys orphaned    │
│ → background job hard-deletes blobs at refCount=0 │
└───────────────────────────────────────────────────┘
```

Cite: `round-r2/08-asset-pipeline-v2.md §0` (structural rewrites 1 + 2), `§4` (key scheme), `§F17` (tenant-salt HMAC).

### 5.6 Repo-Genesis Saga (GitHub LAST)

```
Step 1: Railway project provisioned (advisory lock acquired)
Step 2: Railway DB + backend + frontend services booted
Step 3: Cloudflare DNS zone + Worker routes configured
Step 4: Daytona workspace template instantiated
Step 5: ** GitHub-App repo created ** (LAST — was FIRST in R1)
Step 6: Initial commit + CI wiring + branch protection

ON PARTIAL FAILURE:
  Compensating actions executed in reverse order.
  RepoGenesisRun state → FAILED_ORPHAN (terminal; no customer charge).
  Reconciliation cron detects stale PROVISIONING state > 30min
  and forces compensating chain.

INVARIANT:
  If genesis fails at any step, no customer-visible "billed empty repo"
  exists (because GitHub is step 5, not step 1 as in R1).
```

Cite: `round-r2/11-deployment-infra-v2.md §7` + finding F13 resolution in §0 top-ten summary.

### 5.7 Hash-chained PartyEvent

```sql
-- conceptual shape; actual migration lives in V3.0 migration file
CREATE TABLE party_event (
  id           bigserial PRIMARY KEY,
  projectId    uuid NOT NULL,
  type         text NOT NULL,
  payload      jsonb NOT NULL,
  prevHash     bytea NOT NULL,
  eventHash    bytea NOT NULL,
  createdAt    timestamptz NOT NULL DEFAULT now()
);

-- Append-only trigger: reject UPDATE/DELETE on party_event.
-- eventHash = sha256(prevHash || canonical(payload) || createdAt).
-- /api/advisor/runs/{id}/verify walks the chain for a run.
-- Nightly advisor-verify cron walks 30-day rolling window.
```

Cite: `round-r2/07-autopilot-advisor-v2.md §0` (append-only + hash-chained), finding F14 + F28 in addresses-findings.

---

## §6 Data-Model Deltas

One row per new or changed table, single-line purpose + source R2 spec. These are the *additions* to today's V2.0 Prisma schema (`prisma/migrations/20260418200000_v2_telemetry_chat_byok/`).

| Table / field | Purpose | Source spec |
|---|---|---|
| `AssetLogical` | Stable citable ID; edit-semantics boundary. | 08 §0 rewrite 1, §3 |
| `AssetVersion` | Content-hashed immutable blob wrapper. | 08 §0 rewrite 1 |
| `BlobReference` | Ref-counted R2 pointer; enables GDPR cascade. | 08 §0 rewrite 1, §F22 |
| `Tenant.tenantSalt` | HMAC-SHA256 key material for per-tenant R2 prefix; deletion renders derived keys unreproducible. | 08 §0 rewrite 2, §F17 |
| `GeneratorCircuitState` | Per-generator circuit-breaker state (closed / half_open / open). | 08 §F15 |
| `AssetGenerationError` (enum) | Error taxonomy: ContentPolicy / RateLimit / Transient5xx / ParameterInvalid / QuotaExhausted. | 08 §F1 |
| `ProviderPricing` + `ProviderPricingVersion` | Weekly-cron-scraped pricing table; every cost-ledger row pins a version. | 08 §F4 |
| `LogoVariantPack` | Deterministic resvg-rasterized multi-variant logo output from a single model call. | 08 §F12 |
| `AgentDefinition.contentHash` | sha256 of normalized YAML+body; Postgres unique index; fail-closed load. | 05 §0.7 |
| `AgentDefinition.constraints_advisory` / `anti_patterns_advisory` | Renamed from "constraints"/"anti_patterns"; editor §8 disclaimer that LLM may ignore. | 05 §0.6 |
| `CodemodRegistryEntry` | ed25519-signed deterministic code-transform registry; project-admin co-sign for user-defined. | 05 §1.1 |
| `CompositionSquad` | Named squad of 3–5 composed personas; save-time static constraint-conflict check + cosine-0.85 near-dup detection. | 05 §1.1 |
| `AdvisorRun` | Advisor session row; replaces the 9-state Checkpoint/Intervention tables from R1. | 07 §0 |
| `IterationRound` | One Deep-Iterate R1 pass per picked candidate. | 09 §0 |
| `Critique` | Per-critic output (flaws array) on an IterationRound. | 09 §0 |
| `Resolution` | Per-flaw user decision (accept / reject / edit) + commit reference. | 09 §0 |
| `Artifact` | The picked candidate reference the IterationRound targets; carries `parentCandidateSnapshot` column for audit survival. | 09 §F19 |
| `RepoGenesisRun` | Persisted state-machine row for the Saga; terminal states include FAILED_ORPHAN. | 11 §7, §0 rewrite 3 |
| `OrphanedResource` | Detected orphans from failed genesis; reconciliation-cron target. | 11 §7 |
| `RegionEnforcementCheck` | Per-boundary audit row; populated on startup + on every region-sensitive request. | 11 §2.3 |
| `UptimeSample` | 30-day rolling window measured-uptime samples for the `Project.measuredAvailability30d` computed field. | 11 §9 |
| `DeploymentQueue` | Serialized deploy ordering per project; ensures no concurrent `railway up` on the same service. | 11 §9 |
| `Project.measuredAvailability30d` | Published in Studio UI; replaces "99.9% SLA" claim with honest measurement. | 11 §0, §9 |
| `Project.cfAccountIndex` | Routing index for per-project CF Worker deployment. | 11 §9 |
| `Project.regionEnforcementAllOk` | Boolean gate; false = block all region-sensitive requests. | 11 §2.3 |
| `PartyEvent.prevHash` / `PartyEvent.eventHash` | Hash-chain fields; append-only trigger. | 07 §0, 11 §13 |
| `LoserBranch.tier` (enum: A / B / C) + `LoserBranch.pinnedReason` | Tiered GC per triage Q11. | 01 data-model task #10 (follow-up) + triage Q11 |

**Note on follow-up tasks:** Task #10 (IterationRound Prisma additions cascade into `01-data-model.md`) and Task #11 (Deep-Iterate UI additions cascade into `03-studio-ux.md`) are explicitly post-13 follow-up work. This document captures the scope; the migration file itself is the V3.0 first-migration deliverable.

---

## §7 Security / Privacy / Compliance Commitments (honest)

Every commitment below either cites an already-shipped primitive or a named R2-spec section + primitive. Non-commitments are stated explicitly at the end.

### 7.1 Commitments (V2.0 + V3.0)

1. **BYOK-LLM with AES-GCM (shipped V2.0).** User-supplied API keys are encrypted at rest with AES-GCM. Key material lives in `src/lib/crypto.ts`; the encrypt/decrypt wrappers live in `src/lib/byok.ts`; the settings UI at `src/app/app/settings/byok-card.tsx` surfaces it. Rotation is a user-initiated re-encrypt.

2. **Tenant-scoped content-addressing via HMAC-SHA256 (V3.0).** Key scheme `{projectId}/HMAC-SHA256(tenantSalt, projectId)/sha256/{ab}/{cd}/{fullHash}.{ext}`. Cross-tenant dedup is arithmetically impossible (triage Q10 + `round-r2/08-asset-pipeline-v2.md §0` rewrite 2).

3. **DSR erasure renders keys unreproducible (V3.0).** Data-subject-request erasure deletes the `Tenant.tenantSalt` row. All HMAC-derived key prefixes become unreproducible; all referenced assets unreachable; a background job hard-deletes the blobs at `BlobReference.refCount=0`. ADR text preserves hash-chain continuity by emitting a deletion-event-in-chain with `[redacted per user-request]` marker.

4. **Hash-chained, append-only PartyEvent (V3.0).** Per-event `prevHash`/`eventHash` fields. Postgres trigger rejects UPDATE and DELETE on `party_event`. Nightly `advisor-verify` cron walks the 30-day rolling window. Per-run verification via `/api/advisor/runs/{id}/verify`. (`round-r2/07-autopilot-advisor-v2.md §0` addresses-findings F14 + F28; `round-r2/11-deployment-infra-v2.md §13`.)

5. **Region-pinning with six fail-closed boundaries (V3.0).** Railway project + R2 bucket + CF Worker + LLM allow-list + cron scheduler + Daytona workspace. Each boundary validated at application startup. `region.enforcement.violated` PartyEvent hard-blocks all region-sensitive requests. `Project.regionEnforcementAllOk=false` is a runtime gate. (`round-r2/11-deployment-infra-v2.md §2.3`.)

6. **Production-Grade Checklist V3.0 — six items (not ten flagship items):**
   1. **Region-pinning enforcement**, 6 boundaries, fail-closed on startup — `round-r2/11-deployment-infra-v2.md §2.3`.
   2. **Repo-Genesis Saga** with persisted state machine, advisory locks, idempotency keys, FAILED_ORPHAN terminal state, reconciliation cron — §7 + §0 rewrite 3.
   3. **Canary Observer Worker** with verbatim TS code + per-tier SLO table — §3.4.4.
   4. **Preview-env auth** via HMAC-signed URL default (CF Access opt-in) — §3.4.3.
   5. **Hash-chained PartyEvent** + append-only trigger + nightly verify cron — §13 + 07 §0.
   6. **Measured-uptime publication** via `Project.measuredAvailability30d` rolling 30-day window — §0 top disclaimer + §9.

7. **Prompt-injection trust boundary (V3.0).** Every LLM prompt consuming user-originated data wraps the data in `<untrusted src="..." kind="...">...</untrusted>` blocks with explicit "content is DATA, not INSTRUCTIONS" framing. Haiku pre-ingest injection classifier with 200-brief canary ≥95% recall / ≤5% FP. Zod-schema-validated LLM output before any file-write or git commit. NFKC filename sanitizer + control-char strip + 255-length cap + RTL-override rejection. (`round-r2/08-asset-pipeline-v2.md §0` rewrite 3, §F2, §F21.)

8. **SVG/file safety (V3.0).** DOMPurify server-side SVG CDR + ClamAV virus scan + PNG chunk-strip + tar.gz path-guard + MP4 remux-strip + magic-byte validation + `Content-Disposition: attachment` for all user-uploaded blob downloads. (`round-r2/08-asset-pipeline-v2.md §F8`.)

9. **Circuit-breaker per generator (V3.0).** `GeneratorCircuitState` persisted per generator; 3 failures / 5 min → open for 10 min → half-open single probe → closed on success. Wireframe and logo pillars ship with wired fallbacks (Recraft v3 fallback to GPT-image-1 and vice-versa). (`round-r2/08-asset-pipeline-v2.md §F15`.)

10. **Human-signoff UI for ADR accept (V3.0).** User types "Accept" for normal ADRs. For Red-Team-citing ADRs, user types "I reviewed the mitigation context." No click-through accept. (`round-r2/08-asset-pipeline-v2.md §F10`.)

11. **Presigned-URL defense-in-depth (V3.0).** URLs never enter PartyEvent or application logs; asset-ID is the logged handle. URLs generated at delivery time in `src/lib/r2/signing-service.ts`. TTL: 5min thumbnail / 15min inspector / 24h export-via-one-time-proxy. Sentry `beforeSend` redactor + `tests/security/presign-redaction.test.ts` asserts 5 obfuscation variants (JSON-escaped `&`, double-URL-encoded, URL-in-stack-trace, partial-string, multiline). (`round-r2/08-asset-pipeline-v2.md §F3`.)

12. **Signed codemod registry (V3.0).** ed25519-signed deterministic transforms: Biome format / Prettier format / ESLint --fix / jscodeshift presets / Ruff --fix. Project-admin co-signs user-defined codemods. Arbitrary shell does not ship (`round-r2/05-custom-agents-v2.md §1.1`).

### 7.2 Explicit non-commitments (V3.0)

- **No SOC-2 attestation.** V4.0 earning-back only. The audit is not engaged; there is no control-list; there is no report. `00-vision.md §14` V4.0 cell carries the €30K audit spend line-item.
- **No "99.9% SLA" claim.** V3.0 ships `Project.measuredAvailability30d` as a honest rolling-window measurement. Users requiring contractual uptime must wait for BYOK-Infra (V4.0+) and contract their own tiers with upstream providers.
- **No multi-region cross-region-DB replication.** V3.5 ships single-region-picker. V4.0 earns-back against paid-SRE + DB-migration gate.
- **No contractual GDPR "HARD guarantee" language.** The *mechanism* (6-boundary enforcement, HMAC-salt erasure) is real; the *marketing phrase* is killed until contractual DPA + published DPIA ship in V4.0+.
- **Managed-mode only in V3.0.** BYOK-for-Infra is V4.0. V3.0 publishes an honest cost-passthrough disclosure ("Your project consumes €X/mo of our Railway Pro-tier; €Y/mo of our CF Free-tier") in the Studio UI.

---

## §8 Microcopy + UX Scars

The UX text changes below are **load-bearing**: they are how the honesty retraction is visible to the user, and how the Green-Team constraints become enforceable in UI code.

### 8.1 Label renames (V3.0)

| Old label (R1 specs, pre-triage) | New label (V3.0) | Why |
|---|---|---|
| "Harden" (button next to Pick / Re-race) | **"Iterate"** | `round-r2/09-deep-iterate-v2.md §F-10-H-shortcut-conflict`: `H` rebinds to `I`. "Hardened" is a marketing claim we cannot verify for R1-only. |
| "Sandbox" (internal term for tool-scope guarantee) | **"tool-scope-limit"** | `round-r2/05-custom-agents-v2.md §0.6`: OS-sandbox (gVisor / Firecracker) is the V4.0 thing called "sandbox"; V3.0's closed toolset is not that. |
| "constraints:" / "anti_patterns:" (in persona YAML frontmatter) | **"constraints_advisory:" / "anti_patterns_advisory:"** | `round-r2/05-custom-agents-v2.md §0.6`: §8 disclaimer that the LLM is free to ignore these. "Constraints" implies enforcement the LLM does not give us. |
| "Autopilot" (setting in Project Settings) | **"Autopilot Advisor"** | `round-r2/07-autopilot-advisor-v2.md §0`: scope retraction. FSM stops at Judging. |
| "Auto-pick" (on Race-Card when score > 0.85) | **"Confident pick"** advisory badge | 07 §0: 0.85 threshold retired from auto-pick; becomes advisory annotation. |
| "Aggressive preset" (in Advisor Settings) | — (setting removed entirely) | 07 §0: Aggressive is permanently killed. Only Sensitivity-High / Sensitivity-Low remain. |
| "Conservative preset" / "Balanced preset" | **"Sensitivity-High" / "Sensitivity-Low"** | 07 §0: presets are threshold-only deltas; "autonomy level" language is killed. |
| "1 hardened candidate" (Deep-Iterate marketing) | **"Critique pass with patch suggestions"** | 09 §0: "hardened" retracted until V4.0 triadic data justifies. |
| "brief to production-URL" (Greenfield pitch) | **"brief to best-effort-deployed PR in one session"** | 11 §0: custom-domain DNS propagation may exceed one session. |

### 8.2 Microcopy for new V3.0 states

- **Advisor STOP state microcopy (EN):** *"Racing complete. 5 candidates ranked by Composite-Score. You pick."* (Always human.)
- **Advisor STOP state microcopy (DE):** *"Rennen abgeschlossen. 5 Kandidaten nach Composite-Score gereiht. Du wählst."*
- **Hard-cap cancellation microcopy:** *"Budget cap crossed. In-flight races cancelled. Cancelled candidates saved as losers."* (No false "persisted as hardened" — cancelled is cancelled.)
- **Iterate R1 preset microcopy:** *"5 cross-model critics · per-flaw patch · ~$0.75 · ~30s"* — shown before user confirms Iterate.
- **Region-pin violation microcopy:** *"Region-pin boundary violated on [boundary name]. Request blocked. See region-enforcement runbook."* — hard-block, no soft-degrade.
- **Typed-accept ADR microcopy (normal):** *"Type `Accept` to commit this decision."* (`round-r2/08-asset-pipeline-v2.md §F10`.)
- **Typed-accept ADR microcopy (Red-Team-cited):** *"This decision cites a Red-Team mitigation. Type `I reviewed the mitigation context` to commit."*

### 8.3 Language scope

- **EN + DE primary in V3.0.** All microcopy, all prompt templates, all Studio UI.
- **FR / ES / JA / PT in V3.5+.** `round-r2/07-autopilot-advisor-v2.md §F24`. The reason is honest: we have native DE + strong EN; we do not have native FR/ES/JA/PT and the prompt quality difference is measurable.
- **Asset metadata `renderLanguage` field.** Lang-detect on ingest. DE/FR/ES/EN localized prompt templates for Asset-Pipeline (`round-r2/08-asset-pipeline-v2.md §F16`).

### 8.4 UX scars — intentional roughness

- **No "Pro Mode" toggle.** Progressive disclosure replaces it (`00-vision.md §10`).
- **No tutorials.** Demo-Mode pre-fills a brief; first interaction = first real work.
- **Budget-bar is never hidden.** Lives next to the timeline at the bottom of the Stage (`00-vision.md §6`).
- **Cost-tag on every pick + every re-race.** `~$0.23 · 47s · 3 agents`. Not buried in settings.
- **Per-candidate model-badge.** `opus:4.7` / `sonnet:4.6` / `haiku:4.5` on every race-card in Advisor runs. No silent model degradation.
- **PartyEvent stream always visible**, never behind a "Debug" toggle.

---

## §9 Cost Envelope (consolidated)

Presets across Asset-Pipeline (08), Deep-Iterate (09), and Advisor race-phase allocation (07). Prices are April-2026-current and pinned via `ProviderPricingVersion` (`round-r2/08-asset-pipeline-v2.md §F4`). A weekly cron re-fetches; a 10% delta triggers a warning banner and a 2026-Q4 re-price milestone is already scheduled.

| Scenario | Race-Implementation | Deep-Iterate R1 | Asset gen (image) | Advisor overhead | Total typical |
|---|---|---|---|---|---|
| **Light — Brownfield one-issue, no iterate** | ~$0.30 (5 × Haiku or mixed) | — | — | — | **~$0.30** |
| **Typical — Greenfield one story, one iterate, one wireframe** | ~$0.60 (5 × Sonnet avg) | ~$0.75 (R1 preset) | ~$0.08 (GPT-image-1 single wireframe) | ~$0.05 (judging allocation, 0.10 of race budget) | **~$1.48** |
| **Heavy — Greenfield full story-set (5 stories), each with iterate + wireframe** | ~$3.00 (5 stories × $0.60) | ~$3.75 (5 × $0.75) | ~$0.40 (5 × $0.08) | ~$0.25 | **~$7.40** |
| **Stack-race (V2.7)** | ~$0.90 (5 × Opus-mid) | — | — | — | **~$0.90** |
| **Story-race (V2.5)** | ~$0.60 (5 × Sonnet) | — | — | — | **~$0.60** |
| **Seedance-2 video (V3.5, Pro-tier, 1 video)** | — | — | ~$4.00 (per video, pre-fleet-cap) | — | **~$4.00** (capped at 2/project/month default) |

**Green-Team cost rule honored:** V3.0 preset cost (~$0.75 for Iterate) ≤ V3.0-original Light preset. Pre-flight estimator shown before user confirms (`round-r2/09-deep-iterate-v2.md §F-04`). Per-phase allocation includes **explicit 0.10 judging-phase allocation** (`round-r2/07-autopilot-advisor-v2.md §F27`), previously unbudgeted. Implementation allocation drops from 50% → 40% to make room.

**`ProviderPricingVersion` pinning:** every cost-ledger row carries a `providerPricingVersionId` foreign key. Re-computation against a newer version is read-only; ledger is immutable.

**Cost-passthrough disclosure (V3.0 requirement):** the Studio UI shows, per-project: *"Your project consumes €X/mo of our Railway Pro-tier; €Y/mo of our CF Free-tier; €Z/mo of our Daytona workspace-pool."* Honest by construction (`round-r2/11-deployment-infra-v2.md §0`, triage Q9 rationale).

---

## §10 Open Questions for Nelson (≤12)

These are the questions Concept-v3.0 cannot answer without Nelson's judgment. Each is distilled from R2 specs or cross-cutting tensions the synthesis surfaced.

1. **Pricing model under Greenfield (V2.5 launch).** Per-project flat (e.g. $19 one-time)? Pay-as-you-go BYOK with platform margin on managed-infra passthrough? Hosted with fixed monthly fee + overage? This is load-bearing for the V2.5 landing page. `00-vision.md §16 Q5` retained.

2. **Branding split (V2.5 → V3.0 positioning).** "PatchParty" umbrella + "Studio" as Greenfield product-line, OR "PatchParty" everywhere with "Greenfield / Brownfield" as modes? Squad C never decided. Affects domain choice, logo, marketing URL structure.

3. **GitHub-App permission tiers + naming (V2.5).** Three possible tiers: read-only / read+create-repo / full. Naming is brand-load-bearing. `00-vision.md §16 Q4` retained.

4. **Autopilot intervention-policy schema (V4.0 earning-back).** When full-Autopilot graduates, what's the user-defined config for "page me at"? YAML/JSON DSL, or pre-baked templates? Note: Aggressive template is permanently killed, but the question of *Sensitivity-High / -Low / custom* lives.

5. **Quality-pass conflict resolution (V3.5).** When a11y-fix and sec-fix collide on the same file: sequential (deterministic, slow) or parallel-with-merge-race (fast, chaotic)? Default sequential in V3.5 spec; Nelson's call.

6. **V2.7 Stack templates (3–5 count).** Which ideologies actually ship? Proposed: Batteries-included, Edge-native, Enterprise, OSS-only, Serverless-minimal. That's 5. Could drop to 3 (Batteries / Edge / Enterprise) for first release. Nelson's call.

7. **Brief-normalization across verticals (V2.5 pre-lock).** `00-vision.md §16 Q1` retained. Need a 50–100 brief eval-set before locking the Story-RACE schema. Who compiles the eval-set? When?

8. **V3.0 Preview-env default auth — HMAC-signed URL vs CF-Access SSO.** R2 spec says HMAC default, CF-Access opt-in. For B2B buyer, is that the right default? Or should CF-Access be default for Greenfield accounts (since they're paying customers by that point)?

9. **V3.5 Seedance-2 fleet-cap default.** 2 videos/project/month is the R2-spec default. Is that right for the agency buyer who wants to ship a new demo every sprint? Should Pro-tier include a higher default (e.g. 8/month)?

10. **V4.0 SOC-2 engagement trigger.** Triage Q1 says "when paying customers fund the ~€30K audit spend." What's the revenue threshold? €60K ARR? €120K ARR? The phrase returns to marketing only after audit artefacts ship — but engagement needs to start earlier.

11. **Custom-Agent YAML spec stability (V3.0 → V4.0).** The V3.0 persona-DSL ships with `version`, `content_hash`, `model`, `toolset` required fields. If V4.0 adds signing and revocation, the YAML shape grows. Do V3.0 YAMLs auto-migrate, or do users re-export? Affects the "agent files live forever like tsconfigs" claim.

12. **Hackathon-material in public-facing copy.** `00-vision.md` doesn't mention the AI Builders Berlin win. Should V2.5 launch page cite it (credibility) or stay quiet (keep pressure off)? Default: one line in "About" page, nothing on the landing hero.

---

## §11 V2.5 → V3.0 Implementation Handoff

### 11.1 V2.5 phase plan (cites current WIP)

The V2.0 codebase that ships Brownfield today is the foundation. V2.5 does not fork; it extends. Current WIP lives in:

- `src/app/api/party/[id]/chat/route.ts` — chat-iterate endpoint (V2.0 in flight).
- `src/app/api/party/[id]/resume/route.ts` — resume-queue endpoint.
- `src/app/api/party/[id]/pick/route.ts` — pick endpoint (V2.0 shipping).
- `src/app/api/party/[id]/chat-history/route.ts` — chat history retrieval.
- `src/app/api/byok/route.ts` — BYOK key management.
- `src/app/api/cron/sandbox-lifecycle/route.ts` — sandbox-lifecycle cron.
- `src/lib/byok.ts` — BYOK wrapper over crypto.
- `src/lib/chat.ts` — chat-iterate orchestration.
- `src/lib/costing.ts` — cost-ledger primitive.
- `src/lib/crypto.ts` — AES-GCM primitives.
- `src/lib/events.ts` — PartyEvent emitter.
- `src/lib/sandbox-lifecycle.ts` — Daytona workspace lifecycle.
- `src/lib/trace.ts` — structured-logging + tracing glue.
- `prisma/migrations/20260418200000_v2_telemetry_chat_byok/` — V2.0 telemetry + chat + BYOK migration.

**V2.5 phase order (12 weeks):**

1. **Week 1–2:** Repo-Genesis Saga state machine (Prisma `RepoGenesisRun`, `OrphanedResource`), Saga executor, compensating rollback, reconciliation cron. **GitHub-App repo-creation as LAST step.**
2. **Week 3–4:** Railway + CF + Daytona provider adapters behind the Saga. Region-pinning boundary-check code (3 boundaries: Railway + CF + Daytona; the other 3 land in V3.0). `RegionEnforcementCheck` Prisma model.
3. **Week 5–6:** Stories-RACE (5-persona Sonnet call fan-out), `Story` Prisma model, inspector view.
4. **Week 7:** Stack linear (single default template: Next.js + Postgres + Tailwind + shadcn), `show-alternatives` Haiku diff.
5. **Week 8:** Budget-Governor v1 — soft-watermarks 50/75/90%, hard-cap AbortController cancellation, 90% user-visible-cap / 100% billed-cap delta. `measured_availability_30d` field populated.
6. **Week 9:** Phase 8 MVP — `railway up -s {service} -d` behind a transaction; `DeploymentQueue` ordering.
7. **Week 10:** Demo-Mode Replay (<90s) — pre-recorded PartyEvent stream, `/studio/demo` route, E2E test.
8. **Week 11:** Legal — DPA template, DSR handling runbook, measured-uptime dashboard publication.
9. **Week 12:** Integration test — full Brief → Stories → Stack → Repo-Genesis → one Story-Implementation → `railway up` → PR flow on a fresh account.

**First V2.5 Prisma migration includes:** `RepoGenesisRun`, `OrphanedResource`, `RegionEnforcementCheck`, `UptimeSample`, `DeploymentQueue`, `ProviderPricing`, `ProviderPricingVersion`, `Tenant`, `Tenant.tenantSalt`, and schema updates to `Project` (`measuredAvailability30d`, `cfAccountIndex`, `regionEnforcementAllOk`).

### 11.2 V3.0 phase plan

First migration = §6 data-model deltas above. Specifically: `AssetLogical`, `AssetVersion`, `BlobReference`, `GeneratorCircuitState`, `LogoVariantPack`, `AgentDefinition.contentHash` + advisory renames, `CodemodRegistryEntry`, `CompositionSquad`, `AdvisorRun`, `IterationRound`, `Critique`, `Resolution`, `Artifact`, `PartyEvent.prevHash`, `PartyEvent.eventHash`, append-only trigger, `LoserBranch.tier`, `LoserBranch.pinnedReason`.

**V3.0 phase order (10 weeks, rough sequencing):**

1. **Week 1–2:** V3.0 first migration (above). Append-only trigger + per-event hash computation. Nightly `advisor-verify` cron skeleton. `/api/advisor/runs/{id}/verify` endpoint.
2. **Week 3:** Custom Agents persona-DSL parser + zod schema + `AgentDefinition` fail-closed loader. 5-base-persona hash-lock file. Closed tool-registry ({`read_file`, `search_code`, `apply_codemod`}).
3. **Week 4:** `CodemodRegistryEntry` table + ed25519-signed seed entries (Biome, Prettier, ESLint-fix, jscodeshift, Ruff-fix). Project-admin co-sign flow.
4. **Week 5:** Composition DSL + squad-save constraint-conflict + cosine-0.85 near-dup detection.
5. **Week 6:** Asset-pipeline two-layer model. Key-scheme rewrite with HMAC-salt. `BlobReference` ref-counting. DOMPurify SVG CDR + ClamAV + NFKC filename sanitizer.
6. **Week 7:** Wireframe image generation via GPT-image-1 + Recraft-v3 logo fallback. Circuit-breaker per generator. `asset.generator.rejected` PartyEvent + 50-prompt nightly canary.
7. **Week 8:** Autopilot Advisor FSM 4-state + Composite-Score advisory + per-candidate model-badge + AbortController hard-cap. Sensitivity-High / Sensitivity-Low presets.
8. **Week 9:** Deep-Iterate R1 preset — 5 cross-model critics + per-flaw unified-diff patch + Inspector accept/reject UI + `IterationRound` / `Critique` / `Resolution` persistence + branch naming `iterations/{phase}-{shortid}-r1`.
9. **Week 10:** CF Workers canary-split + preview-envs per PR (HMAC-signed URL) + Canary Observer Worker + integration test.

**Post-13 follow-up tasks (not in this doc's scope):**

- **Task #10:** cascade `IterationRound` + related Prisma additions into `01-data-model.md` so the model-file stays canonical.
- **Task #11:** cascade Deep-Iterate Inspector UI additions into `03-studio-ux.md`.

These are tracked as "post-13 follow-up" and do not block V3.0 migration landing.

### 11.3 What V2.5 does NOT need

Explicitly excluded from V2.5 — ship V3.0 only after V2.5 + V2.7 are stable:

- Canary / Blue-Green (V3.0 / V3.5).
- Custom Agents (V3.0).
- Deep-Iterate (V3.0).
- Autopilot Advisor (V3.0).
- Wireframes (V3.0).
- Video (V3.5).
- BYOK-Infra (V4.0).
- OpenRouter (V4.0).
- SOC-2 (V4.0).
- Multi-region (V4.0+).

### 11.4 Definition of V2.5 "done"

- 30-run fresh-account eval: Brief → Stories-RACE → Stack → Repo-Genesis → one Implementation race → PR → `railway up` succeeds ≥95% of runs with zero orphaned resources.
- Budget-Governor cancellation p99 ≤ 2s on 10-race eval.
- Demo-Mode Replay <90s on 10 consecutive cold-starts.
- DPA template reviewed by external counsel.
- Hackathon-ready: the thing works in front of a live audience (already proven for V2.0 at AI Builders Berlin; V2.5 raises the bar to Greenfield).

---

## §12 Provenance + Adversarial-Design Record

The scope in this document is the **synthesis of a nine-squad, three-red-team, five-green-team adversarial process**. This section documents that process so future readers (including future-Nelson) understand why the V3.0 shape is what it is — and specifically why it *shrank* from the Round-3 specs.

### 12.1 Timeline

```
April 2026   ──►  00-vision.md initial (pre-triage, post-V2.0).
              │
              ▼
Round 1 R-T  ──►  00-vision.md §0 + §12 hardened. Five risks named.
              │
              ▼
Round 2 R-T  ──►  §16 open-questions added. Loser-branch GC + GDPR flagged.
              │
              ▼
Round 3      ──►  9 squads spawned (A through I):
              │     A — Story-RACE scope
              │     B — Autopilot FSM (07)
              │     C — Branding + pricing
              │     D — Data model (01) + Custom-Agent DSL (05)
              │     E — Asset-pipeline (08)
              │     F — Autopilot intervention-policy (07 continued)
              │     G — Asset storage decision (08 continued)
              │     H — Deep-Iterate (09)
              │     I — Deployment infra (11)
              │
              ▼
Round 3b R-T ──►  5 red-team attack files: 05-attack, 07-attack, 08-attack,
              │   09-attack, 11-attack.
              │   Total findings: **131** across all 5 specs.
              │   Verdicts: all 5 BLOCK.
              │
              ▼
Triage       ──►  12-triage-decisions.md answered 12 questions.
(2026-04-18)      Biggest kills: "international-standard", "99.9% SLA",
                   Aggressive preset, run_command, marketplace,
                   14-adversarial-slugs, BYOK-Infra, Deep-Iterate R2+R3,
                   managed agent-sharing, cross-tenant dedup.
              │
              ▼
Round R2     ──►  5 Green-Team specs v2 under round-r2/:
(2026-04-18)      05-custom-agents-v2.md (1112 lines, 20/24 addressed)
                  07-autopilot-advisor-v2.md (1420 lines, 14 addressed V3.0)
                  08-asset-pipeline-v2.md (1406 lines, 21/23 addressed)
                  09-deep-iterate-v2.md (~1450 lines, 14 addressed V3.0)
                  11-deployment-infra-v2.md (1994 lines, 32/34 addressed)
              │
              ▼
Synthesis    ──►  THIS DOCUMENT (13-concept-v3.0-final.md, 2026-04-19).
                  Canonical Concept v3.0 brief.
```

### 12.2 What survived vs. what died

**Survived intact from Round-3:**
- `00-vision.md §1–§13` strategic frame.
- Dual-entry model (Brownfield / Greenfield).
- 3 non-negotiables (Budget-Hard-Cap, Demo-Replay <90s, GitHub-App).
- Three-layer infra topology (Railway + CF + Daytona).
- 5 base personas (hackathon-proven).
- Race-Mechanic Principles 1–7 (loser-branches, edit-then-decide, cost-tag, re-race-takes-priors, Diversity-Judge, Budget-Governor).
- Asset-pipeline as a *concept* (but with rewritten internals: two-layer model, HMAC-salt, demo-pinned flag).
- Repo-Genesis Saga as a *concept* (but GitHub-LAST, not GitHub-FIRST).

**Died:**
- "International-standard" claim (triage Q1).
- "99.9% SLA" claim (triage Q2).
- "SOC-2-ready" claim (triage Q1 rationale).
- "HARD GDPR guarantee" marketing language (triage Q1).
- Full Autopilot in V3.0 (triage Q4). Full Autopilot → V4.0 with 6 gates.
- Aggressive auto-advance preset (permanently killed, triage Q4).
- "1 hardened candidate" Deep-Iterate claim (triage Q3). Triadic → V4.0.
- `run_command` (triage Q6). `apply_codemod` replaces it.
- `fetch_url` (R2 05).
- Managed cross-user agent-sharing (triage Q8). Manual YAML only.
- Public marketplace (`00-vision.md §10` anti-feature, reinforced by R2 05).
- Trust-tier auto-promotion (R2 05).
- 14 pre-baked adversarial slugs (triage Q12). 5-base + composition.
- 4 pre-baked adversarial squads (compliance-red / security-red / ux-red / cost-red, R2 05 defer).
- BYOK-for-Infra in V3.0 (triage Q9). → V4.0.
- Cross-tenant content-addressed dedup (triage Q10). Per-tenant HMAC-salt prefix.
- Wireframe-race in default flow (R2 08). Opt-in only.
- Multi-region with cross-region DB (R2 11). → V4.0+.
- OpenRouter in V3.0 (triage Q7). → V4.0.
- Seedance in V3.0 (triage Q5). → V3.5 Pro-tier fleet-cap.
- 9-state Autopilot FSM (R2 07). → 4-state Advisor FSM.
- 31-entry reversibility-cliff catalogue in V3.0 (R2 07). → V4.0 alongside full Autopilot.
- "Atomic DNS-swap" (R2 11 §0). Worker-origin re-bind instead.
- "Brief to production-URL" (R2 11 §0). "Best-effort-deployed PR."

### 12.3 Findings accounting

| Spec | Findings | Addressed V3.0 | Deferred w/ earning-back |
|---|---|---|---|
| 05 Custom Agents | 24 | 20 | 7 (F1, F3, F4, F10, F12, F20, F22) |
| 07 Autopilot | 28 | 14 | 14 (F2, F5, F7, F9, F11, F12, F13, F15, F16, F18, F21, F23, F25, F26) |
| 08 Asset-Pipeline | 23 | 21 | 2 (F7 Seedance V3.5, F11 Wireframe-race V4.0) |
| 09 Deep-Iterate | 22 | 14 | 10 (F2, F3, F9, F12, F13, F16, F18, F21, presets-arbitrary, instrument-diversity) |
| 11 Deployment-Infra | 34 | 32 | 4 (F4 BYOK-Infra V4.0, F9 multi-region V4.0, F26 secret-rotation V4.0, F31 BYOK-error-proxying V4.0) |
| **Total** | **131** | **101** | **37 (some findings count across specs)** |

Note: deferred-count totals ≈ 37 because several findings map across multiple R2 specs (e.g. OpenRouter-related findings appear in 07, 09, and 11).

### 12.4 Green-Team binding constraints honored

Per `12-triage-decisions.md §3`:

1. **No reintroduction of killed scope under different name.** Verified: this document contains zero occurrences of `run_command`, zero occurrences of `fetch_url`, zero occurrences of "Aggressive preset" except in the kill-list context, zero occurrences of "international-standard" / "99.9% SLA" / "SOC-2-ready" except in kill-list + earning-back context.
2. **No flagship claims without shipped certificates.** Verified: every availability / compliance / security claim in §7 cites a primitive (AES-GCM / HMAC-SHA256 / ed25519 / append-only trigger / fail-closed startup-check) + a path in `round-r2/`. No bare rhetoric.
3. **No rhetoric mitigations.** Verified: every §7 item names a file path, PartyEvent, measurement threshold, or runbook.
4. **No cost-envelope growth.** Verified: V3.0 Iterate preset ~$0.75 is within V3.0-original Light preset envelope. §9 cost table pinned to `ProviderPricingVersion`.
5. **Named primitives only for crypto claims.** Verified: AES-GCM (BYOK), HMAC-SHA256 (tenant-salt), ed25519 (codemod registry), sha256 (content-hash, PartyEvent chain).
6. **No diversity-without-measurement.** Verified: Deep-Iterate ships R1 only because R2 variant-diversity requires measurement data we don't have; Composite-Score is advisory-only because 90-day calibration data doesn't exist; 4 pre-baked adversarial squads deferred until IoU < 0.5 measurement lands.

### 12.5 Attribution

- **Adversarial-design orchestration:** Nelson Mehlis (user), Claude Sonnet 4.6 + Opus 4.7 (agent squads).
- **Round 3 nine-squad execution:** parallel Task-tool agents, Anthropic-only, each squad writing to `planning/v3.0-studio/{NN}-{spec}.md`.
- **Round 3b Red-Team:** five parallel attack-team agents, one per spec.
- **Triage decider:** Claude, delegated authority from Nelson.
- **Round R2 Green-Team:** five parallel defender agents, one per spec.
- **This synthesis document:** Claude Opus 4.7 as final-author on a 18-tool-call budget.

---

## Appendix A — Why "Concept v3.0" and not "v3.0-final-final"

This document is labeled `v3.0-final` because it is the **canonical shippable brief** that feeds the V2.5 implementation work. It is not the last word on the product — the V4.0 earning-back gates in §3.5 explicitly depend on data that V2.5 + V3.0 will *generate*, not on decisions this document can make today. When that data exists, a `14-concept-v3.1-final.md` or `14-concept-v4.0-brief.md` will supersede this doc's V4.0 cells.

The canonical reading order *after* this doc:

1. `00-vision.md` §1–§13 — strategic frame (unchanged).
2. `13-concept-v3.0-final.md` (this file) — roadmap + kill-list + compliance commitments.
3. `round-r2/08-asset-pipeline-v2.md` — asset pipeline engineering spec.
4. `round-r2/11-deployment-infra-v2.md` — infra engineering spec.
5. `round-r2/05-custom-agents-v2.md` — Custom Agents engineering spec.
6. `round-r2/09-deep-iterate-v2.md` — Deep-Iterate engineering spec.
7. `round-r2/07-autopilot-advisor-v2.md` — Autopilot Advisor engineering spec.
8. `src/lib/` + `src/app/api/` — what ships today.
9. `01-data-model.md` + `03-studio-ux.md` — after post-13 follow-up tasks #10 + #11 land.

## Appendix B — Phrase provenance map (what to say, what to never say)

**Say (V3.0 public):**
- "The best agentic software-development studio that exists. Not the fastest. Not the easiest. The deepest." (unchanged from `00-vision.md §0`, depth-claim not compliance-claim)
- "Five Takes per PR." (V2.0 launch)
- "From Brief to Repo, with Five Takes at Every Decision." (V2.5 launch)
- "Build your own squad." (V3.0 launch; reframed as persona DSL, not marketplace)
- "Brief to best-effort-deployed PR in one session." (honest one-session claim)
- "Compose your own persona-squad." (V3.0)
- "Preview every PR at a real URL." (V3.0)
- "Critique pass with patch suggestions." (Deep-Iterate V3.0)
- "Autopilot Advisor: races, scores, ranks. You pick." (V3.0)

**Never say (V3.0 public, killed by triage):**
- "International-standard infrastructure."
- "99.9% SLA." / "99.9% uptime."
- "SOC-2-ready." / "SOC-2-compliant."
- "HARD GDPR region-pinning guarantee."
- "One-click to production."
- "Brief to production-URL." (use "best-effort-deployed PR" instead)
- "Atomic DNS-swap."
- "1 hardened candidate." / "Triadic hardening." (until V4.0)
- "Four pre-baked adversarial squads." (until V4.0 IoU measurement)
- "Instrument-diverse critics." (until OpenRouter lands V4.0)
- "Auto-pick at 0.85." (killed; "Confident pick" advisory badge instead)
- "Aggressive Autopilot." (permanently killed)
- "Agent marketplace." (anti-feature, never)
- "Set budget and walk away." (until V4.0 full-Autopilot graduates against 6 gates)

**Say (V4.0 earning-back — only after gate met):**
- "International-standard" → after SOC-2 Type-1 certificate shipped.
- "99.5% measured availability." → after 6mo measured-uptime dashboard + BYOK-Infra shipped.
- "Set the budget; check in after lunch." → after all 6 full-Autopilot gates green.
- "Instrument-diverse cross-model critique." → after OpenRouter + 500-session variant-selection-rate data.
- "Signed, revocable, audited custom agents." → after ed25519-signed + revocation-registry ships.

---

## Appendix C — Concrete path anchors

For quick navigation by the next agent. Absolute paths. Windows-style root is the repo root; Unix-style path separators used internally by tools.

**R2 Green-Team specs (V3.0 source of engineering truth):**
- `planning/v3.0-studio/round-r2/05-custom-agents-v2.md`
- `planning/v3.0-studio/round-r2/07-autopilot-advisor-v2.md`
- `planning/v3.0-studio/round-r2/08-asset-pipeline-v2.md`
- `planning/v3.0-studio/round-r2/09-deep-iterate-v2.md`
- `planning/v3.0-studio/round-r2/11-deployment-infra-v2.md`

**Triage + Red-Team:**
- `planning/v3.0-studio/10-red-team-round3.md`
- `planning/v3.0-studio/12-triage-decisions.md`

**Strategic frame:**
- `planning/v3.0-studio/00-vision.md` (§1–§13 unchanged and authoritative; §14 + §16 superseded by this doc)

**V2.0 shipping code (foundation V2.5 extends):**
- `src/lib/personas/index.ts` — 5 philosophy-personas (Hackfix / Craftsman / UX-King / Defender / Innovator).
- `src/lib/byok.ts` — BYOK AES-GCM wrapper.
- `src/lib/crypto.ts` — AES-GCM primitives.
- `src/lib/events.ts` — PartyEvent emitter.
- `src/lib/costing.ts` — cost-ledger.
- `src/lib/chat.ts` — chat-iterate orchestration.
- `src/lib/sandbox-lifecycle.ts` — Daytona workspace lifecycle.
- `src/lib/trace.ts` — structured-logging glue.
- `src/app/api/party/[id]/chat/route.ts`
- `src/app/api/party/[id]/chat-history/route.ts`
- `src/app/api/party/[id]/pick/route.ts`
- `src/app/api/party/[id]/resume/route.ts`
- `src/app/api/byok/route.ts`
- `src/app/api/cron/sandbox-lifecycle/route.ts`
- `src/app/app/settings/byok-card.tsx`
- `src/app/party/[id]/chat-pane.tsx`
- `src/app/party/[id]/resume-card.tsx`
- `prisma/migrations/20260418200000_v2_telemetry_chat_byok/`

---

## Appendix D — Summary of the adversarial record (for future-Nelson in one glance)

If you are future-Nelson, six months from now, and you need to remember why V3.0 looks small: **it looks small because a Red-Team review in April 2026 produced 131 findings across 5 specs and every flagship claim broke.** The triage decision was: *honesty over aspiration*. Kill the broken phrases. Ship the honest subset. Generate measurement data for the V4.0 earning-back gates.

The V3.0 you ship is not the V3.0 you dreamed. The V3.0 you ship is the V3.0 that survives a cost-envelope + primitive-citation audit and does not contradict `00-vision.md §13` non-negotiables. That is the point. The dream V3.0 lives in V4.0 now, and V4.0 earns its way back by *measuring*, not by *promising*.

The hackathon win on 17.04.2026 is proof that the V2.0-shape works in front of operators. The V2.5 extension, the V3.0 scope, and the V4.0 earning-back are the three honest next steps from that proof-point. If you keep to the plan and the measurement gates, none of the killed phrases come back as marketing until they come back as shipped certificates. That is the shape of the business.

---

**End of Concept v3.0 — Final Shippable Brief.**
