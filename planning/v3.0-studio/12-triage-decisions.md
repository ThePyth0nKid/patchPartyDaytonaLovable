# 12 — Triage Decisions (Round 3b → Round R2 Green-Team)

**Status:** 12 open questions from `10-red-team-round3.md §8` answered. Decisions are binding for Round R2 Green-Team scope. Vision doc (`00-vision.md`) updated in this commit to match.

**Date:** 2026-04-18
**Decider:** Claude, delegated authority from Nelson ("Du bist für das bestmögliche Ergebnis verantwortlich. Du kennst die ganze Situation extrem gut. Wähle du aus.")
**Next step:** Round R2 Green-Team spawns against 5 specs with these decisions as hard constraints.

---

## 0. Meta-Principle Guiding All 12 Decisions

**Honesty over aspiration.** Every flagship claim Red-Team broke (SOC-2, 99.9%, international-standard, HARD-GDPR, brief-to-production-URL, cryptographically-hardened, LLM-judged-diversity) falls into one of two categories: (a) true-but-requires-investment-we-don't-have-yet, or (b) never-achievable-at-solo-dev-tier. For (a) we defer with a named earning-back window. For (b) we kill the phrase.

**Second principle: V2.5 must ship in 12 weeks.** Every decision that adds Enterprise-tier cost, Legal-work blocker, or 3-provider-complexity pushes us past that. The Red-Team broke V2.5-as-specified; we accept the break and ship a smaller honest V2.5, not a delayed dishonest one.

---

## 1. Decisions

### Q1. "international-standard" — KILL

**Decision:** Remove the phrase from Vision §1, §5, §14, and all marketing copy. Replace framing with *"production-grade infrastructure stack (Railway + Cloudflare + Daytona) at solo-dev-affordable-tier, with explicit best-effort-inherited-from-upstream availability."*

**Earning-back path:** V4.0 SOC-2 Type-1 engagement begins when we have paying customers funding the ~€30K audit spend. Phrase returns then, backed by certificate.

**Affects:** 00-vision §1, §14 roadmap V4.0 cell, §17 handoff. 11-deployment-infra §6 International-Standard-Checklist renamed to "Production-Grade Checklist (V3.0)" with 4 items removed (SOC-2-Ready, 99.9% SLA-fähig, multi-region-default, DDoS-default-via-CF-Free-Tier-is-marketing-theater).

### Q2. "99.9% SLA" — KILL

**Decision:** Remove the phrase from Vision §14 V4.0 cell and `11-deployment-infra.md`. Replace with *"best-effort availability inherited from upstream providers; users requiring contractual SLA must use BYOK-for-infra at Enterprise tiers we do not broker (V4.0+)."*

**Rationale:** Red-Team 11-F7 correct — 99.9% composed from three providers each at 99.9% = 99.7% effective. Also: PatchParty has zero enterprise contracts with any of the three at solo-dev-tier. Claim is marketing fiction.

**Earning-back path:** If BYOK-for-Infra ships V4.0 + customer contracts their own tiers + PatchParty publishes a measured-uptime-dashboard for 6 months of managed-mode — phrase returns as "99.5% measured" (honest, not aspirational).

**Affects:** 00-vision §14 V4.0. 11-deployment-infra §6, §12 (V4.0 roadmap), §13.

### Q3. Deep-Iterate V3.0 — R1-critique + per-flaw patch-suggestion (not raw critique-list)

**Decision:** Ship V3.0 as R1-critique layer that produces `{flaw, severity, evidence, proposed-patch-as-diff-suggestion}` per critique. User sees 5 critics × N flaws = actionable patch-suggestions they can accept/reject individually. This is a real feature, not "here's what's wrong, figure it out yourself."

**Why not pure critique-list:** Red-Team 09-F-ghost correct — "shows flaws but doesn't fix" is a ghost feature. Adding per-flaw patch-suggestion at R1 makes the V3.0 MVP genuinely valuable.

**Why not R2+R3:** Red-Team 09 core thesis correct — parallel R2 variants collapse to risk-appetite-scalar; R3 is compression mis-labeled as hardening. No ship until measurable variant-diversity exists.

**Green-Team constraint:** R1 critics remain same-family (Opus/Sonnet/Haiku); naming changes from "5 adversarial critics" to "5 cross-model critiques". Per-flaw patch-suggestion cost budgeted inside existing Deep-Iterate-Light preset envelope (~$0.75).

**Earning-back R2+R3:** V4.0 when (a) OpenRouter provides instrument-diversity or (b) we have 500+ sessions of data showing user-selection-rate varies by R2-variant. Until then, triadic-pattern marketing copy is killed.

**Affects:** 00-vision §5 Principle #8, §14 V3.0 and V4.0 cells. 09-deep-iterate.md reduced scope; R2/R3 sections become "V4.0 exploration" with the caveat that data must justify.

### Q4. Autopilot V3.0 — Preview-only (FSM stops at Judging)

**Decision:** Ship V3.0 as **"Autopilot Advisor"** — name-change is mandatory; "Autopilot" with auto-advance contradicts Vision §13 Non-Negotiable #1 ("human signs final PR").

Behavior: Budget-Governor active, Composite-Score computed and shown as advisory overlay on Race-Cards, FSM transitions Idle → BudgetLocked → Racing → Judging → **(stops here — human picks)**. No Picking / Committing / Reversibility-Check / Deploy in V3.0. Aggressive/Balanced/Conservative presets become "advisor sensitivity" not "autonomy level".

**Why Preview:** preserves roadmap narrative, generates composite-score calibration data over 500+ sessions, keeps Demo-Mode compelling.

**Why not full deferral:** full deferral loses a line-item Nelson repeatedly mentions as pitch-axis. Preview keeps the axis while honestly scoping.

**Earning-back full Autopilot:** V4.0 when (a) 90-day calibration data shows composite-score error < 10%, (b) hard-cap cancellation + append-only audit chain shipped, (c) 31-cliff catalogue has zero red-team-identified holes. Aggressive-preset as-specified is killed permanently — any future "fully auto" mode requires explicit per-action human-confirmation or it contradicts §13.

**Affects:** 00-vision §3 Autopilot description reworked, §14 V3.0 and V4.0. 07-autopilot-mode.md — preserve the 10-way failure-audit and budget-governor as V3.0 scope; FSM reduced to 4 states (Idle → BudgetLocked → Racing → Judging); Aggressive preset removed entirely; Conservative/Balanced rebranded as advisor sensitivities.

### Q5. Seedance-2 Video — V3.5 behind Pro-Tier + Fleet-Cap

**Decision:** Keep V3.5 but gate behind Pro-tier pricing plan and project-level fleet-cap (default: 2 videos/project/month, hard-cap configurable in BYOK mode). Demo-video is a legitimate market differentiator for agency buyers.

**Green-Team constraint:** Per-project cost cap enforced at start-of-generation (reject, don't retroactively refuse). Video-gen queue-position visible to user. Generator-pick must support fallback (Pika or Runway) on Seedance-2 outage — single-vendor failure must not break demo.

**Affects:** 08-asset-pipeline §2 Generator-Picks; §14 roadmap V3.5 gains Pro-tier requirement.

### Q6. `run_command` V3.0 — Narrow apply_codemod-Registry only

**Decision:** Ship V3.0 with `run_command` replaced by an allowlisted `apply_codemod` tool that executes only signed, registered transformations: Biome format, Prettier format, ESLint --fix, jscodeshift presets from our registry, Ruff --fix. Arbitrary shell execution defers to V4.0.

**Why:** Red-Team 05-F1 correct — `run_command` in default registry is CVE-surface. Apply_codemod keeps 80% of user value (programmatic code transforms) with 2% of risk (allowlisted operations only).

**Green-Team constraint:** Registry is Project-scoped + signed. Each entry declares input-type, output-type, idempotency, side-effects (must be `none` for V3.0). User-defined codemods require Project-admin signature.

**Earning-back full run_command:** V4.0 with OS-level sandbox (e.g., gVisor, Firecracker) + per-invocation permission-modal + audit-log-before-execute. No "trust tier" auto-promotion ever.

**Affects:** 05-custom-agents §4 tool-registry (remove `run_command`, `fetch_url`), §5 failure-modes (tool-router privilege-escalation section shrinks).

### Q7. OpenRouter V3.0 — V4.0

**Decision:** V3.0 stays Anthropic-only (Opus 4.7 + Sonnet 4.6 + Haiku 4.5). OpenRouter / multi-provider defers to V4.0.

**Why:** Memory `project_infra_stack.md` + prior-session decision "Anthropic-only-for-V2.5" was load-bearing and Red-Team did not challenge it successfully. Adding OpenRouter now: (a) introduces a vendor we can't validate quickly, (b) breaks the Opus-4.7-leadership moat argument, (c) adds billing complexity.

**Consequence for Deep-Iterate:** R1 critics in V3.0 are honestly-named "cross-model (Opus/Sonnet/Haiku 3× sampled)" not "instrument-diverse". Green-Team must reflect this in 09-deep-iterate.md.

**Earning-back multi-provider:** V4.0, once (a) Anthropic-only-shape of the platform is proven-profitable, (b) customers explicitly ask for non-Anthropic (compliance/geopolitical), (c) at least one paid engineer can own the provider-abstraction layer.

**Affects:** 09-deep-iterate §3 R1 critic-team renaming. 00-vision §14 V4.0 keeps OpenRouter line.

### Q8. Custom-Agent Sharing V3.0 — V4.0

**Decision:** V3.0 Custom Agents are **Project-scope only**. No cross-user sharing via the platform. Users can still share YAML files manually (email, Slack, git-repo-checkin) — same workflow as sharing a Prettier config today — but PatchParty does not broker, index, sign, or serve them.

**Why:** Red-Team 05 proved "private sharing" is a de-facto marketplace with zero moderation. Full solution requires signing + revocation + trust-tier + threat-model, none of which fit V3.0. Manual YAML-share is honest and aligns with Vision §10 Anti-Feature "no marketplace".

**Earning-back shared agents:** V4.0 with ed25519-signed agent definitions + per-agent content-hash-pinning + revocation registry + installed-agent audit-log. "Private sharing" phrase removed from 05-custom-agents; replaced with "file-based config, like a tsconfig."

**Affects:** 05-custom-agents §6 sharing-model section rewritten. 00-vision §10 anti-features table reinforced.

### Q9. BYOK-for-Infra V3.0 — V4.0

**Decision:** V2.5 and V3.0 are **managed-mode only**. PatchParty-hosted Railway project / Cloudflare account / Daytona account. BYOK-for-infra defers to V4.0.

**Why:** BYOK-for-infra means PatchParty error-reporting must proxy 3 different provider error formats (Red-Team 11-supp). Solo-dev support-ops can't absorb this at V2.5. Managed-mode lets us own the happy path and the failure path.

**Affects:** 00-vision §12 residual risks updated. 11-deployment-infra §8 BYOK-for-Infra section moved to V4.0-roadmap. New V3.0 requirement: published cost-passthrough model (user sees "Your project consumes €X/mo of our Railway Pro-tier ; €Y/mo of our CF Free-tier" — honesty by construction).

### Q10. Cross-Tenant Content-Addressed Dedup — DISABLED

**Decision:** Confirmed. Per-tenant namespaces only. Accept 5-15% R2 cost penalty vs GDPR Art. 17 erasure risk.

**Affects:** 08-asset-pipeline §4 content-addressed-key-scheme reworded: key prefix becomes `{projectId}/{tenantSalt-hmac-sha256}/sha256/{ab}/{cd}/{fullHash}.{ext}` — same hash within a tenant enables dedup; cross-tenant isolated by HMAC salt. GDPR erasure deletes tenant-salt, rendering all content unreachable even if blobs survive.

### Q11. Loser-Branch GC — ADR-cited pinned-forever, uncited 90d default

**Decision:** Confirmed with tiered policy:
- **Tier A (pinned-forever):** Loser-Branches cited by any ADR, referenced in any user-facing URL, or marked-user-pinned. Never GC'd while the Project exists.
- **Tier B (90d default, user-configurable 30-365d):** Race-losers not cited. User can configure per-project; default 90d matches incident-recovery window.
- **Tier C (7d immediate):** Diversity-Judge re-rolls, re-races that the user explicitly discarded, sandbox-ephemera. GC 7d.

**GDPR override:** user DSR (data-subject-right) erasure deletes all tiers; ADR text redacted with `[redacted per user-request]` marker; hash-chain continuity preserved via deletion-event-in-chain.

**Affects:** 01-data-model.md — `LoserBranch.tier` enum + `LoserBranch.pinnedReason` field. 00-vision §16 Q2 answered (closes open-question).

### Q12. 14 `defaultPersona:` Slugs — DROP, ship 5 base personas + Composition-DSL

**Decision:** V3.0 ships **5 base personas** (Nelson's V2.0-race already has these from hackathon code: the 5 implementation-personas). The "adversarial squad" concept becomes *"compose your own squad from 5 base personas via Custom-Agent DSL"* — not *"pre-baked 14 specialist personas"*.

**Why:** Red-Team 05-F undefined-slugs correct — 14 slugs without content is worse than 5 slugs with content. Composition + 5-base-personas has the same product-surface without the auth-work of defining and maintaining 14 extra personas.

**Marketing cost:** we can no longer claim "4 pre-baked adversarial squads" (compliance-red / security-red / ux-red / cost-red). Red-Team proved they were 1 LLM in 4 hats anyway — killing them improves honesty.

**Earning-back specialist personas:** V4.0 when we have (a) usage data showing which compositions users actually build (data-driven persona-factoring) and (b) at least 1 paid persona-contributor (e.g., an OWASP-auditor persona endorsed by OWASP).

**Affects:** 05-custom-agents §7 pre-baked-squads section replaced with "5 base personas + composition-DSL".

---

## 2. Aggregate Effect on Vision (00-vision.md)

Changes committed in this PR:

| Section | Change |
|---|---|
| **§0 Status line** | Concept downgrades to "Concept v3.0-draft, post-triage". Flagship-phrases ("international-standard", "99.9% SLA") removed. |
| **§1 One-line vision** | Unchanged — still "Final Cut Pro for software production". |
| **§3 Dual-Entry + Autonomy** | Autopilot renamed "Autopilot Advisor (V3.0)"; description notes preview-only scope; full-Autopilot explicitly deferred to V4.0. |
| **§4 Phase 8 Release** | Big-Bang kept as V2.5-only anti-pattern; Canary / Blue-Green explicitly deferred V3.0 / V3.5. |
| **§5 Principle #8 Deep-Iterate** | Rephrased: "Race gives breadth. Deep-Iterate V3.0 surfaces flaws with patch-suggestions. R2/R3 triadic defers to V4.0 when data justifies." |
| **§10 Anti-Features** | Reinforced "no marketplace" with explicit "no managed cross-user Custom-Agent sharing in V3.0". |
| **§12 Risks** | Vendor-concentration risk text updated; "international-standard" aspirational framing removed; SOC-2 engagement moved from V4.0 hand-wave to V4.0 budget-line. |
| **§13 Non-Negotiables** | Unchanged — Budget-Hard-Cap / Demo-Replay / GitHub-App stay. |
| **§14 Roadmap** | V2.5 cell: "Best-effort-deployed PR" replaces "Railway-deployed PR" nomenclature — honest availability framing. V3.0 cell: Autopilot-Advisor, Deep-Iterate R1-only, Custom-Agents reduced-scope, `apply_codemod` only. V3.5 cell: Seedance-2 Pro-tier gated. V4.0 cell: picks up full Autopilot, Deep-Iterate R2+R3, BYOK-for-Infra, OpenRouter, SOC-2 engagement. Flagship-marketing language stripped from all cells. |
| **§15 Marketing one-liners** | "Five Takes per PR" kept. "From Brief to Repo" kept. "Build your own squad" kept but reframed as "persona DSL, not agent marketplace". V4.0 "Set the budget, check in after lunch" kept (Autopilot full graduation target). "Studio ships to international-standard infrastructure" **killed**. |
| **§16 Open Questions** | Q2 (Loser-Branch GC under GDPR) closed via Q11 decision. Q7 (asset-pipeline storage) closed via 08-spec. Q8 (Autopilot intervention-policy schema) retained as V4.0 question. |

---

## 3. Green-Team Constraints (binding)

Round R2 Green-Team defends each of the 5 specs within the reduced scope above. Green-Team **cannot**:

1. Re-introduce killed scope under a different name. (`apply_codemod` ≠ `run_command` is fine; renaming `run_command` to `shell_exec` is not.)
2. Claim flagship capabilities ("international-standard", "99.9% SLA", "SOC-2-ready") without a shipped certificate.
3. Address Red-Team findings with rhetoric (*"we will ensure X"*). Every mitigation must cite file-path, PartyEvent name, measurement threshold, or operator runbook.
4. Grow the cost-envelope of any phase. If a defense adds an LLM call or storage write, it either replaces an existing one or defers to V4.0.
5. Claim cryptographic guarantees without naming the primitive (ed25519, HMAC-SHA256, etc.) and the key-management model.
6. Claim diversity-without-measurement. Variant count is decoration; output-diversity is the product (AST-diff, semantic-diff, selection-rate).

Green-Team **must**:

1. Address **all CRITICAL and HIGH findings** in the relevant Red-Team attack file, either by fix-in-V3.0 or by explicit defer-to-V4.0 with earning-back criteria.
2. Deliver a V2 of the spec file with frontmatter `round: r2-green`, `addresses-findings: [list]`, `deferred-findings: [list with earning-back-version]`.
3. Cite Vision §13 Non-Negotiables in every §10-equivalent scope-boundary section.

---

## 4. Priority of Green-Team Work

In rough order of value-to-effort:

1. **08 Asset-Pipeline (HARDEN)** — core concept sound; highest ROI on Red-Team defense investment.
2. **11 Deployment-Infra (REDUCE)** — load-bearing for Nelson; reframe as honest stack.
3. **05 Custom Agents (REDUCE)** — reduce to persona-DSL + Composition; kill tool-grant surface.
4. **09 Deep-Iterate (REDUCE)** — R1 + patch-suggest only; strip R2/R3 marketing.
5. **07 Autopilot (DEFER)** — Advisor-only V3.0; FSM reduced to 4 states.

All five spawn in parallel; above order is documentation priority, not gating order.

---

## 5. Handoff

**Round R2 Green-Team reads in order:**
1. This document — the constraints.
2. `10-red-team-round3.md` — the attacks being defended against.
3. `red-team/{NN}-{spec}-attack.md` — the specific attack-file for their target spec.
4. `{NN}-{spec}.md` — the original Round-3 spec they are defending.
5. `00-vision.md` — post-triage vision doc (updated in this commit).

Each Green-Team writes output to `round-r2/{NN}-{spec}-v2.md`.

**Synthesis round after R2:** single consolidated `13-concept-v3.0-final.md` master document merges all R2-hardened specs + triage decisions + surviving Vision. That document becomes the canonical Concept v3.0 — shippable brief for V2.5 + V3.0 + V3.5 + V4.0 roadmap work.
