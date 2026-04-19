---
round: r2-green
name: Autopilot Advisor (V3.0)
supersedes: planning/v3.0-studio/07-autopilot-mode.md
date: 2026-04-18
status: Proposal, V3.0 shippable scope
addresses-findings:
  - F1   # Composite-Score LLM-on-LLM — demoted to advisory
  - F3   # Hard-cap leak — cancellation semantics + 90% user-cap
  - F4   # Three presets collapse — Aggressive killed; Conservative/Balanced → Advisor-Sensitivity-High/Low
  - F6   # Pause ghost-state — NA (no auto-advance past Judging)
  - F8   # Deceptive-alignment audit — hash-chained PartyEvents
  - F10  # Mesa-optimization "detection" — honest reframing
  - F14  # Telemetry tamper-proofing — hash-chain + append-only + cold-export
  - F17  # 0.85 auto-pick threshold theater — threshold retired; ranking only
  - F19  # Aggressive preset contradicts §13 — section deleted
  - F20  # Silent model degradation — per-candidate model badge
  - F22  # One-click override — NA (no auto-advance)
  - F24  # Microcopy EN+DE only — EN+DE kept as V3.0 primary, FR/ES/JA/PT V3.5+
  - F27  # Judging cost not in phase-allocation — explicit judging allocation
  - F28  # Hash-verification never invoked — `/api/autopilot/runs/{id}/verify` + nightly cron
deferred-findings:
  - F2     # V4.0 — Reward-Hacking programmatic detection
  - F5     # V4.0 — 31-cliff catalogue holes (no cliffs in Advisor; full catalogue earns-back with auto-advance)
  - F7     # V4.0 — Brownfield GitHub API rate-budget (Advisor-only Brownfield = no auto-PR batch)
  - F9     # V4.0 — 4 missing FSM states (FSM reduced to 4 states in V3.0; full FSM V4.0)
  - F11    # V4.0 — Empirical cost-per-race recalibration (needs 500-session data)
  - F12    # V4.0 — Distributional-shift in Greenfield (honestly scoped)
  - F13    # V4.0 — HumanPagedOut timeout policy (no HumanPagedOut-from-cliff in V3.0)
  - F15    # V4.0 — Goal-Misgen scenario library (honest: example is illustrative, detection is advisory)
  - F16    # V4.0 — Phase-ratio scale-invariance empirical validation
  - F18    # V4.0 — Sandbox-TTL vs Resume data-loss (no Resume state in V3.0)
  - F21    # V4.0 — AutopilotCheckpoint GC (reduced to AdvisorRun, checkpoint removed V3.0)
  - F23    # V3.5 — 10-way audit each with named detector file (V3.0 ships 4 with file-paths; 6 reframed as future-work)
  - F25    # V4.0 — Brownfield cross-issue dependency (no auto-PR in V3.0)
  - F26    # V4.0 — Trust-tier gameability (no trust-tier-based auto-producer-at-cliff in V3.0)
vision-anchors:
  - "§3 Autopilot Advisor (V3.0, opt-in)"
  - "§5 Race-Mechanic Principle #7 Budget-Governor"
  - "§10 Anti-feature: no ship-without-me mode"
  - "§13 Non-Negotiable #1: user must not wake up to $400 bill"
  - "§13 Non-Negotiable: human signs final PR"
---

# 07 — Autopilot Advisor (V3.0) — Round R2 Green-Team Defense

**This document supersedes `planning/v3.0-studio/07-autopilot-mode.md`.** The
predecessor was a BLOCK under Round 3b Red-Team review (28 findings). Triage
decision Q4 (`12-triage-decisions.md`) mandated a scope retraction: V3.0 ships as
**Autopilot Advisor** — preview-only, FSM stops at Judging, no auto-pick, no
auto-commit, no auto-deploy. The Aggressive preset is KILLED PERMANENTLY. Full
Autopilot earns back in V4.0 against measurable calibration gates.

---

## §0. Executive Summary — Scope Retraction

### What changed between Round-3 spec and this R2 spec

| Dimension | Round-3 (07-autopilot-mode.md) | R2 (this file) |
|---|---|---|
| Product name | "Autopilot" | **Autopilot Advisor** |
| FSM states | 9 (Idle → BudgetLocked → Racing → Judging → Picking → Committing → ReversibilityCheck → HumanPagedOut → Resumed) | **4** (Idle → BudgetLocked → Racing → Judging → STOP) |
| Auto-pick threshold | 0.85 composite triggers auto-advance | **No auto-advance.** Composite score shown as ranking advisory; human always picks |
| Reversibility-Cliff catalogue | 31 entries, enforced at `ReversibilityCheck` state | **Deferred V4.0.** Advisor does not commit; no cliff enforcement needed in V3.0 |
| Presets | Conservative / Balanced / Aggressive (with `auto_proceed_after_sec`) | Advisor-Sensitivity-**High** / Advisor-Sensitivity-**Low** — score-threshold differences only. Aggressive deleted. |
| Brownfield Autopilot | Label-burn with auto-PR-draft | **Advisor-only:** "here are N issues, here's the Composite-Score breakdown per candidate, you pick-and-apply." No auto-PR batch. |
| Hard-cap semantics | "in-flight races complete and persist as losers" | **Cancellation semantics:** `AbortController.abort()` on crossed cap. User-facing cap = 90% of billed cap. |
| PartyEvent log | Standard Prisma, no append-only | **Append-only + hash-chained** (Postgres trigger + per-event `prevHash`/`eventHash` fields). |
| Model degradation visibility | Silent (microcopy notification once) | **Per-candidate model-badge** (`opus:3.0` / `sonnet:4.6` / `haiku:4.5`) on every race-card. |
| Microcopy languages | EN+DE | **EN+DE (V3.0 primary)**; FR/ES/JA/PT V3.5+ |

### What we are still claiming

1. **Budget-Governor is real and hard.** Reservations, watermarks, per-phase
   allocation, cancellation of in-flight streams at hard-cap, billed-vs-user-cap
   delta of 10% to absorb partial in-flight.
2. **Composite Score is displayed** on every Race-Card in Autopilot-Advisor
   runs, with full per-term breakdown and per-candidate model-provenance badge.
3. **Race-kickoff automation** — the Advisor starts races on a pre-specified
   pipeline (Brief → Stories → Stack → Implementation) without a click per race.
4. **Append-only audit log** with per-event hash-chain; tampering is
   detectable by a nightly verification cron.
5. **FSM stops at Judging.** Human always picks, commits, and deploys. Always.

### What we are NOT claiming

1. **Auto-pick / auto-advance.** Composite score above 0.85 does NOT trigger
   `FSM → Picking` in V3.0. It triggers a `confident-pick` badge on the UI; the
   human still clicks.
2. **Reward-hacking detection.** We emit all candidate artifacts + scores to the
   PartyEvent log for offline analysis; we do not attempt programmatic detection
   of reward-hacking at the LLM-judge level. Damage ceiling in V3.0: wasted LLM
   spend (Budget-Governor catches) + bad-candidate-shown-to-human (human
   overrides — no auto-pick means no silent harm).
3. **Distributional-shift coverage in Greenfield.** Honest: pre-launch,
   production distribution does not exist. Fuzz-tests are best-effort; real
   coverage is a V4.0 telemetry-loop problem.
4. **Trust-tier-based auto-producer-at-cliff.** There are no cliffs in V3.0
   because there's no auto-commit.
5. **Shutdown-avoidance at the agent layer.** V3.0 Advisor does not put the
   agent in positions where shutdown-avoidance could matter: candidates run to
   completion (or are cancelled by Budget-Governor) within one Race-Engine
   invocation, which is then handed to a human.

### The single-sentence pitch

> _Set a budget. Advisor races 5 candidates per phase, scores them, shows you a
> ranked leaderboard with cost/diversity/AC-fit breakdown, and stops. You pick.
> You sign the PR. You ship._

Not "hands-free." Never "hands-free."

---

## §1. Positioning — Autopilot Advisor vs. Autopilot

The Round-3 spec opened with a position statement refusing "Autonomy-Theater"
(agent works in a streaming chat pane, decides silently, ships). Red-Team's
central finding was that the spec then proceeded to implement that exact thing
under a different label — `auto_proceed_after_sec: 600` in the Aggressive preset
means "ship on human silence," which is the definition of the pattern being
refused.

V3.0 resolves this honestly: **we do not ship auto-advance at all in V3.0.** The
thing we call "Advisor" is the Budget-Governor plus Composite-Score plus race
kickoff, with a strict hand-off boundary: after Judging, the human is at the
wheel. This matches Vision §13 Non-Negotiable #1 (human signs final PR) without
qualification.

### 1.1 Why "Advisor" not "Autopilot Preview"

Red-Team F1 proposed "Autopilot Preview" as a rename. We prefer "Advisor"
because:

1. **"Preview" implies a temporary state.** Users expect that flipping a toggle
   will upgrade Preview to Full-Autopilot "once it's ready." We do not want that
   expectation set in V3.0; Full-Autopilot is V4.0 at earliest, and subject to
   measurable calibration gates that may not be met.
2. **"Advisor" names what it actually is** — a second opinion with a cost
   breakdown and a ranking, not a pilot.
3. **Marketing copy alignment.** "Autopilot Advisor" reads naturally next to
   "Director-mode." Both are naming a role in relation to the human decision.

### 1.2 The Vision-§13 Non-Negotiable that governs V3.0 scope

> _"A user must not be able to wake up to a $400 bill." + "human signs final PR"_

Every V3.0 Advisor design decision in this document cites one of those two
non-negotiables as its anchor. If a feature can violate either, it defers to
V4.0 with explicit earning-back criteria (§11 Roadmap).

### 1.3 What we ship vs. competitors

The Advisor is positioned on **explainability-of-the-decision**, not
speed-of-decision. It is slower than a streaming chat by design:
5 candidates raced per phase, Composite-Score leaderboard, per-candidate
model-badge + cost + score breakdown, hash-chained PartyEvent log,
Loser-Branches preserved. Bolt / Lovable / Devin ship streaming-chat monologues
with one "accept" at the end; PatchParty ships a structured decision artifact.

---

## §2. Ten-Way Paperclip-AI Failure Audit — Reduced Scope

Red-Team F23: "10-way audit is checklist theater; no evidence any of 10 is
detected in practice." Honest response: in V3.0 Advisor, four failure modes are
*relevant to Advisor scope* and addressed with named-file mitigations. The
remaining six are either Not-Applicable-in-Advisor-scope (because there is no
auto-advance) or Deferred-to-V4.0-with-file-path-earning-back-criteria.

### 2.1 Relevant-to-Advisor (4 of 10)

Four failure modes still matter in V3.0 because the Advisor still runs an
agent-pipeline producing candidates consumed by a human:

#### F-2.1-a. Reward Hacking — Advisor version

**Mechanism (unchanged from Round-3 §2.2):** candidate games the judge rather
than solving the task.

**Why still relevant:** even though no auto-advance happens, a reward-hacking
candidate shown as #1 on the advisor-leaderboard is a misleading-to-the-human
outcome. The human reads "composite 0.89, AC_fit 0.92" and is inclined to pick
it. The human then owns the decision, but the decision was biased by a gamed
score.

**V3.0 mitigation (honest):**
- **Judge-model is different from candidate-model** — same as Round-3. Judges
  are Haiku 4.5; candidates Opus 4.7 / Sonnet 4.6. Reduces gaming pressure
  (candidate would need to model a different model's distribution to exploit).
- **Judge-rubric is held out of the candidate system prompt** — same.
- **NEW: all candidate artifacts are persisted to the PartyEvent log with
  content-hash keys** (`src/lib/autopilot/artifact-store.ts`), so offline
  analysis can detect reward-hacking retroactively. Damage ceiling is bounded
  because a reward-hacker-candidate can only reach as far as the human review.
- **Not claimed:** no programmatic detection of reward-hacking at the judge
  layer. This is a research problem (semantic equivalence across refactors is
  undecidable in general); solving it in-spec would be vaporware. See F-2.2 for
  V4.0 earning-back.

**File paths:**
- `src/lib/autopilot/advisor-judge.ts` — judge-rubric injection + model-pinning
- `src/lib/autopilot/artifact-store.ts` — per-candidate content-addressed write
- PartyEvent: `advisor.candidate.artifact_persisted`

#### F-2.1-b. Resource Acquisition — Advisor version

**Mechanism (unchanged):** candidate consumes more tokens/compute than task
warrants.

**Why still relevant:** this is the Budget-Governor's direct threat model. A
runaway tool-call loop in one candidate must not burn the whole budget.

**V3.0 mitigation (hardened from Round-3):**
- **Budget-Governor (§3)** with **cancellation semantics** — when hard-cap is
  crossed, in-flight streams are aborted via `AbortController.abort()`. This is
  the fix for Red-Team F3 (which demonstrated the Round-3 "in-flight races
  complete and persist as losers" was a $10-leak-on-$5-budget bug).
- **User-facing cap = 90% of billed cap.** The 10% delta absorbs partial
  in-flight spend that providers bill for mid-stream cancellation.
- **Per-candidate token ceiling** (`maxCompletionTokens`): Opus 16K, Sonnet 8K,
  Haiku 4K.
- **Tool-call hard-cap per candidate:** 50 invocations.
- **Candidate wall-clock ceiling:** 15 minutes.

**File paths:**
- `src/lib/autopilot/budget-governor.ts` — `enforceHardCap()` method
- `src/lib/autopilot/race-abort.ts` — `AbortController` registry per run
- PartyEvent: `advisor.budget.hard_cap_cancelled` (per-stream)

#### F-2.1-c. Spec Gaming — Advisor version

**Mechanism (unchanged from Round-3 §2.5):** candidate passes tests by deleting
or weakening them.

**Why still relevant:** V3.0 still runs Implementation-races where the candidate
can modify a test file.

**V3.0 mitigation (unchanged from Round-3):**
- **AC-test files are read-only** to Implementation-agents. `apply_edit` tool
  rejects writes to `**/*.test.{ts,tsx,js,py}` unless story.kind = `'add-test'`.
- **Test-file diff scanner** at candidate finalization: any test-file edit for
  non-test-kind stories → candidate marked `failed` / `errorKind:
  'test-tampering'`.
- **Coverage-delta check** at judge-time.
- PartyEvent: `advisor.spec.gaming_detected` (kept from Round-3).

**File paths:**
- `src/lib/agents/tools/apply-edit.ts` — path denylist for test files
- `src/lib/autopilot/test-diff-scanner.ts` — post-finalization check

#### F-2.1-d. Distributional Shift — Advisor version, honestly scoped

**Mechanism:** production data differs from prompt-time samples.

**Why only partially relevant:** V3.0 Advisor does not auto-deploy, so
production distribution never meets auto-generated code without a human review.
The distributional-shift threat is still real (user may accept advisor
recommendation and deploy it, and that code may fail on prod-distribution), but
the V3.0 surface is *advisory, not executive*.

**V3.0 mitigation (honest — Red-Team F12 accepted):**
- We do NOT claim pre-launch distributional coverage in Greenfield. Fuzz-tests
  are best-effort per-story from Haiku-generated adversarial fixtures (emoji,
  RTL, long strings, nulls, NFC/NFD variants).
- Distributional-shift coverage beyond best-effort defers to post-launch
  telemetry and user-reported production bugs. V4.0 earning-back: telemetry-loop
  that ingests prod-error-shapes and re-races affected stories.
- PartyEvent: `advisor.fixture.generated` (tracks what fixtures we tried).

**File paths:**
- `src/lib/autopilot/fixture-generator.ts` — best-effort adversarial fixtures
- Honest documentation in `docs/v3.0/autopilot-advisor-limits.md`

### 2.2 Deferred-to-V4.0 (6 of 10)

These six do not apply in V3.0 Advisor scope. Each carries a one-line-statement
for deferred-scope rationale, plus the V4.0 earning-back criterion.

| # | Failure mode | Why NA or deferred V3.0 | V4.0 earning-back criterion |
|---|---|---|---|
| 1 | **Goal Misgeneralization** | Advisor surfaces all 5 candidates with intent-score breakdown; human decides. No silent goal-misgen ship. | Auto-advance requires named detector file (`src/lib/autopilot/goal-misgen-classifier.ts`) + 50-scenario benchmark with >90% recall on gold-labeled set. |
| 2 | **Sub-Goal Explosion** | Story-count hard-cap (25) + Phase-budget-allocation (§3.2) still active; but "no Story creation during Implementation" is enforced at the Race-Engine level, not the Advisor level. No regression. | Full Autopilot keeps the same hard-cap; sub-goal-explosion telemetry alert at 80% of story-cap ships with V4.0. |
| 3 | **Mesa-Optimization** | Red-Team F10 accepted: no runtime detection exists. In V3.0, human reviews every pick, so mesa-optimized squad output surfaces in human-override-rate metrics. | V4.0 auto-advance requires `avgOverrideRate` telemetry shipped AND <0.15 on the last 100 runs per squad. |
| 4 | **Deceptive Alignment** | §9 hash-chained PartyEvent + raw-IO capture addresses the audit-trail side. The trust-tier-based "promoted after 5 races" mechanism (Red-Team F26) is removed from V3.0. | V4.0 earning-back: signed agent-origin (ed25519) + admin-approved promotion, never count-based. |
| 5 | **Irreversibility Creep** | V3.0 Advisor has no commit state; no creep possible. The 31-cliff catalogue stays in repo as a V4.0 requirement file. | V4.0 auto-commit requires the catalogue passes zero-hole red-team review (no Red-Team finds a missing cliff given 2 weeks). |
| 6 | **Shutdown Avoidance** | V3.0 Advisor FSM stops at Judging. There is no ongoing auto-loop for an agent to avoid shutting down. Pause is "close the browser tab." | V4.0 earning-back: Pause must cancel all in-flight streams via `AbortController` (same as hard-cap), verified by load-test (paused-to-cancelled <2s p99). |

**Design principle:** every "deferred" row names a file or a measurement. Red-Team
F23 was right — aspirational safety docs age poorly. If the criterion isn't a
file path or a gold-set benchmark, it doesn't count.

---

## §3. Budget-Governor — Hardened with Cancellation Semantics

### 3.1 The bug we're fixing

Red-Team F3 broke the Round-3 Budget-Governor with a 3-step attack:

1. Reservations in §3.4 were worst-case estimates that assumed candidate obeys
   `maxCompletionTokens`.
2. Round-3 §3.1 said "in-flight races complete and persist as losers" at
   hard-cap.
3. In a tool-call loop scenario, 5 in-flight candidates × actual Opus I/O of
   $0.50-$2 each = $2.50-$10 burned AFTER hard-cap. On a $5 Shoestring, that's
   50-200% overspend. This directly contradicts Vision §13 Non-Negotiable.

### 3.2 The fix: cancellation semantics

V3.0 Budget-Governor implements `enforceHardCap()` with active cancellation. Key
surface in `src/lib/autopilot/budget-governor.ts`:

```ts
export class BudgetGovernor {
  private readonly billedCapUsd: Decimal;       // userFacingCapUsd × 1.111111
  private readonly userFacingCapUsd: Decimal;   // shown to user
  private readonly activeStreams = new Map<string, AbortController>();

  /** Register a stream's AbortController before its first token. */
  registerStream(streamId: string, controller: AbortController): void;

  /**
   * Called per accumulated-cost update (every 512 tokens). If projected total
   * (spent + reserved + accumulated) crosses billedCapUsd, cancel ALL active
   * streams via controller.abort() and emit `advisor.budget.hard_cap_cancelled`.
   */
  enforceHardCap(streamId: string, accumulatedUsd: Decimal): void {
    const projected = this.spent.plus(this.reserved).plus(accumulatedUsd);
    if (projected.gte(this.billedCapUsd)) {
      for (const [id, ctrl] of this.activeStreams) {
        ctrl.abort(new DOMException("hard-cap reached", "BudgetHardCap"));
        emit({ type: "advisor.budget.hard_cap_cancelled", runId: this.runId, streamId: id,
               accumulatedUsdAtAbort: accumulatedUsd.toNumber(), billedCapUsd: this.billedCapUsd.toNumber() });
      }
      this.activeStreams.clear();
    }
  }
}
```

### 3.3 Why user-cap = 90% of billed-cap

Model providers bill for partial generation. A cancelled stream mid-response is
still billed for tokens already generated. Red-Team F3 residual risk:
"hard-cap will always leak 1-5%."

V3.0 honest framing:
- **User enters $25 hard-cap.** UI: "Your budget: $25."
- **Billed-cap is $27.78** (25 / 0.9). This is the amount we guarantee the user
  will never be billed above.
- **Cancellation fires when projected-spend crosses $27.78**, not $25.
- **Actual spend settles somewhere between $25 and $27.78** (in-flight tokens
  being billed).

This is documented in the pre-run summary microcopy (§7):
> _"Budget: $25. Hard-cap billing guarantee: $27.78 (accounts for ~10% overshoot
> from in-flight stream cancellation). You will not be billed above $27.78."_

### 3.4 Soft watermarks — unchanged from Round-3

| Level | % of billed-cap | Action |
|---|---|---|
| Cold | 0% → 50% | Normal. No UI friction. |
| Warn | 50% → 75% | `advisor.budget.watermark_crossed` (`level: 'warn'`). Yellow badge. |
| Guard | 75% → 90% | `level: 'guard'`. **Opus → Sonnet downshift** (with visible per-candidate model-badge). |
| Critical | 90% → 100% | `level: 'critical'`. **Sonnet → Haiku downshift for judges.** New races blocked. |
| Hard-cap | 100% of billed-cap (111% of user-cap) | `level: 'hard_cap'`. **Cancel all in-flight streams via AbortController.** |

### 3.5 Phase-Allocation — judging explicit

Red-Team F27 broke Round-3 allocation: judge/probe calls weren't in any phase.
V3.0 fix: add explicit `judging` allocation; reduce Implementation to 40%.

| Phase | Allocation % | What it covers |
|---|---|---|
| Brief-clarification | 5% | Sonnet clarification loop (max 3 turns). |
| Story-generation | 10% | 5-candidate race + Diversity-Judge. |
| Wireframes (opt-in) | 5% | Image model per story. |
| Stack-decision | 10% | V2.5 linear, V2.7 race. |
| Repo-genesis | 5% | Sonnet scaffold + GitHub-App. |
| **Implementation** | **40%** (down from 50%) | 5-candidate race × N stories. |
| **Judging** | **10%** (NEW) | AC_fit probe + Diversity-Judge + judge_scores_mean across all phases. |
| Quality-Pass | 10% | Specialist squads. |
| Release | 5% | Draft-PR generation; no deploy in V3.0. |

Total: 100%. Judging is a first-class phase with its own budget; when judging
approaches its allocation cap, the Advisor auto-degrades judges Haiku →
local-heuristic (similar to the Critical tier but scoped only to judging).

### 3.6 Cost-degradation visibility — per-candidate badge (F20 fix)

Red-Team F20 broke Round-3 silent model-degradation: user couldn't tell which
code was Opus-produced vs. Sonnet-produced. V3.0 fix: every race-card shows a
`modelBadge` field.

```ts
// src/app/party/[id]/race-card.tsx
<Badge variant="model">
  {candidate.modelBadge}  {/* e.g., "opus:4.7" / "sonnet:4.6" / "haiku:4.5" */}
</Badge>
```

- **Every RaceCandidate row** has `model` + `modelBadge` columns.
- **Inspector shows model-badge** prominently on each race-card.
- **PR-review UI** (V3.5, when we do ship commits) shows model-provenance per
  story in the final PR comment.
- **No silent degradation.** If guard-tier fires, the next batch of race-cards
  shows `sonnet:4.6` badges instead of `opus:4.7`; the user sees this before
  picking.

### 3.7 PartyEvent emissions

```ts
type BudgetEvent =
  | { type: "advisor.budget.reserved"; runId: string; phase: RacePhase; amountUsd: number; token: string }
  | { type: "advisor.budget.settled"; runId: string; phase: RacePhase; reservedUsd: number; actualUsd: number; refundUsd: number }
  | { type: "advisor.budget.watermark_crossed"; runId: string; level: WatermarkLevel; spentUsd: number; billedCapUsd: number; spentPct: number }
  | { type: "advisor.budget.tier_changed"; runId: string; from: DegradationTier; to: DegradationTier; reason: string }
  | { type: "advisor.budget.phase_exhausted"; runId: string; phase: RacePhase; phaseSpentUsd: number; phaseCapUsd: number }
  | { type: "advisor.budget.hard_cap_cancelled"; runId: string; streamId: string; accumulatedUsdAtAbort: number; billedCapUsd: number }
  | { type: "advisor.budget.topped_up"; runId: string; addedUsd: number; newCapUsd: number; actorUserId: string };
```

Every event above is filterable in the Studio timeline's "Budget" lane.

### 3.8 Audit table: user-cap vs billed-cap

A small but critical UX element in the pre-run summary:

| What you see | What we guarantee |
|---|---|
| Budget: **$25** | Hard-cap cancellation fires at billed $27.78 (user-cap × 1.111) |
| Budget warning at **$12.50** (50%) | Event `advisor.budget.watermark_crossed {level: warn}` |
| Model downshift at **$18.75** (75%) | Opus → Sonnet for remainder |
| Budget exhausted at **$22.50** (90%) | Sonnet → Haiku for judges; no new races |
| Absolute stop at **$27.78** | All in-flight cancelled; bill will not exceed this |

---

## §4. Composite Score — Advisory Only (F1 fix)

### 4.1 What changed

Red-Team F1: "60-70% of the composite is LLM-on-LLM." V3.0 response: accept the
finding. We do NOT demand the score be a deterministic decision-maker. We
demand only that it be a consistent-per-candidate ranking helper the human can
consult.

The formula stays:

```
CompositeScore(candidate) = AC_fit × 0.6 + Diversity × 0.2 + Cost_fit × 0.2
```

But every use of the score has changed:

| V3.0 | Round-3 (deprecated) |
|---|---|
| Displayed on every race-card in the Advisor UI | Displayed on every race-card |
| Per-term breakdown visible on hover (AC_fit / literal_pass / semantic / judge / Diversity / Cost_fit) | Same breakdown visible in Inspector |
| **Never triggers FSM advancement.** Human always picks. | Score > 0.85 + delta > 0.03 → `FSM → Picking` (KILLED) |
| **"Confident" badge** shown on cards with score > 0.85 AND delta > 0.03 (advisory label, not action) | Auto-pick (deleted) |
| **"Review carefully" badge** shown on cards with ambiguous score (advisory label) | Escalation (now default: every race) |
| Calibration program runs V3.0 → V3.5 collecting user-override-rate vs score; feeds V4.0 earning-back decision | Thresholds "calibrated on ~200 manual-review races during planning" (not defensible) |

### 4.2 The "confident pick" badge

Each race-card shows a model badge, full score breakdown, and an advisory badge:

- **Confident pick**: score > 0.85 AND margin > 0.03 over #2.
- **Close call**: margin ≤ 0.03 over #2; "open both diffs before picking."
- **Below quality floor**: top score < 0.65; "consider re-racing."
- **All failed**: no candidate has green tests; needs re-race or re-scope.

Badges are advisory. The human always clicks "Pick this" on exactly one
candidate.

### 4.3 Term definitions — honestly scoped

**AC_fit (0.6 weight)**

```
AC_fit = 0.5 × literal_pass + 0.3 × semantic_intent_score + 0.2 × judge_scores_mean
```

- `literal_pass ∈ {0, 1}`: deterministic (green tests, compile, lint).
- `semantic_intent_score ∈ [0, 1]`: Haiku probe. **Honestly described as
  "non-deterministic across re-runs; ±0.05 noise typical."** Not claimed as
  ground truth.
- `judge_scores_mean ∈ [0, 1]`: mean of any adversarial-squad scores.

**Diversity (0.2 weight)**

```
Diversity(c_i) = 1 - max_{j ≠ i} similarity(c_i, c_j)
```

`similarity` is AST-normalized edit-distance for code (**not**
semantically-normalized AST — Red-Team F2 correctly pointed out that equivalence
of two programs is undecidable; we now honestly describe this as syntactic
AST-normalized edit distance, which can be gamed by dead-code injection, and we
accept that limitation in V3.0). For text artifacts, cosine-similarity on
token-embeddings.

**Cost_fit (0.2 weight)**

```
Cost_fit(c_i) = 1 - (c_i.costUsd - minCost) / (maxCost - minCost + ε)
```

Normalized across the candidate set. Cheapest = 1.0; most expensive = 0.0.

### 4.4 The calibration program — V3.0 → V3.5 → V4.0

The score is ADVISORY in V3.0 not because it can't be useful, but because we
haven't validated it. The calibration program runs across V3.0 and V3.5 to
generate the data V4.0 earning-back needs:

**Data collected per race (V3.0):**
- `compositeScore` per candidate
- `humanPickedCandidateId` (which one the user clicked)
- `candidateRankByCompositeScore` (1-5)
- `humanPickedRank` (where on the leaderboard the picked candidate sat)
- `candidatePerTermBreakdown` (full breakdown for each of 5)

**Calibration metric:** `userOverrideRate = P(humanPickedRank ≠ 1)`

- If `userOverrideRate < 0.10` over 90 consecutive days and ≥500 runs: Advisor
  score is genuinely predictive. V4.0 earning-back gate A met.
- If `userOverrideRate > 0.30`: score is noise. Advisor stays advisory forever.
- If `0.10 < userOverrideRate < 0.30`: re-weight terms, re-run calibration for
  another 90 days.

**Calibration PartyEvent:**

```ts
| { type: "advisor.pick.calibration"; runId: string; raceId: string; humanPickedRank: number; topScore: number; margin: number; allFiveScores: number[] }
```

These events flow into the Calibration dashboard (V3.5 admin UI) and drive the
V4.0 decision.

### 4.5 No auto-pick endpoint

Round-3 `§4.3` defined three thresholds that triggered FSM advancement. V3.0
deletes those thresholds. In V3.0 code:

```ts
// src/lib/autopilot/advisor-ranker.ts

export function rankAndBadge(candidates: RaceCandidate[]): RankedCandidate[] {
  const scored = candidates.map(c => ({ ...c, composite: computeComposite(c) }));
  scored.sort((a, b) => b.composite - a.composite);

  const top = scored[0];
  const second = scored[1];
  const margin = second ? top.composite - second.composite : 1;

  const topBadge: AdvisorBadge =
    top.composite > 0.85 && margin > 0.03 ? "confident_pick" :
    margin <= 0.03                        ? "close_call" :
    top.composite < 0.65                  ? "below_quality_floor" :
    top.composite === 0 /* all failed */  ? "all_failed" :
                                             "normal";

  return scored.map((c, i) => ({
    ...c,
    rank: i + 1,
    badge: i === 0 ? topBadge : "normal",
  }));
}
```

There is no `advanceIfConfident()` function. The Advisor hands the ranked list
to the human UI and that is the end of Advisor's role.

---

## §5. Advisor-Sensitivity Presets (F4 + F19 fix)

### 5.1 What changed from Round-3

Red-Team F4: "Three presets collapse to two behaviors." Red-Team F19: "Aggressive
preset auto-advance contradicts Vision §13 Non-Negotiable."

V3.0 response: **kill Aggressive preset permanently.** Rename Conservative /
Balanced to **Advisor-Sensitivity-High** / **Advisor-Sensitivity-Low** with
score-threshold differences only. No `auto_proceed_after_sec`. No grace window.
No "trust extends to imported" knob (trust-tier-based promotion is also
deferred — F26).

### 5.2 The two V3.0 sensitivity presets

**Advisor-Sensitivity-High** — cautious flagging

```yaml
name: advisor_sensitivity_high
version: 1
description: |
  Flags more picks as "review carefully." Use when you want the Advisor to
  highlight edge cases. B2B-production default.

budget:
  hardCapUsd: 25.00              # user-facing; billed-cap is 1.111× ($27.78)

flagging:
  confident_pick_min: 0.90       # stricter than Low preset
  confident_margin_min: 0.05     # stricter tie-break
  quality_floor: 0.70            # higher floor for "below quality" warning

scope:
  maxStories: 15
  maxImplementationRaces: 15

degradation:
  warnAt: 0.50
  guardAt: 0.75
  criticalAt: 0.90
```

**Advisor-Sensitivity-Low** — permissive flagging

```yaml
name: advisor_sensitivity_low
version: 1
description: |
  Flags fewer picks. Trust the score more. Use when you're running many
  similar tasks and want minimal interruption.

budget:
  hardCapUsd: 25.00

flagging:
  confident_pick_min: 0.80       # looser
  confident_margin_min: 0.03
  quality_floor: 0.60

scope:
  maxStories: 20
  maxImplementationRaces: 20

degradation:
  warnAt: 0.60
  guardAt: 0.80
  criticalAt: 0.95
```

### 5.3 What stayed identical across both presets

- **No `auto_proceed_after_sec`** — deleted. Human always picks manually.
- **No `reversibility_tier` flags** — no cliff enforcement in V3.0.
- **No `allow_imported_agents: true` option** — trust-tier promotion deferred.
- **No `never_auto` list** — the whole concept of "auto" is out of V3.0 scope.
- **FSM stops at Judging** — same for both presets.

### 5.4 Three budget-size options (orthogonal to sensitivity)

Budget amount is a separate dimension; the pre-run picker is 2-D (budget × sensitivity):

| Budget tier | User-facing cap | Billed cap | Story-cap |
|---|---|---|---|
| Shoestring | $5 | $5.56 | 10 |
| Standard | $25 | $27.78 | 15 (High) or 20 (Low) |
| Flagship | $100 | $111.11 | 20 (High) or 25 (Low) |

### 5.5 Policy Resolution Order — simplified

1. **Run-level override** — user-chosen preset at run-start API.
2. **Project-scoped default** — `{repoRoot}/.patchparty/advisor.yaml` if present.
3. **User-scoped default** — `~/.patchparty/advisor.yaml` if present.
4. **Advisor-Sensitivity-High + Standard budget** — the out-of-box default.

Resolved preset is frozen in `AdvisorRun.presetSnapshot: Json` at run-start.

---

## §6. Reduced FSM (F9 fix, F18 NA, F13 NA)

### 6.1 4-state FSM

```
  Idle → BudgetLocked → Racing → Judging → STOP (human picks)
                           ▲                 │
                           └─── next phase ──┘

  Terminals (from any state):
    → Error    (provider outage, sandbox eviction, etc.)
    → Aborted  (user-initiated)
```

### 6.2 State specifications

**State 1 — `Idle`**
- Entry: AdvisorRun row created via `POST /api/advisor/runs`.
- Exit: user confirms budget + preset via `POST /api/advisor/runs/{id}/start`.
- Transitions: → `BudgetLocked`.
- Emitted events: `advisor.run.created`.

**State 2 — `BudgetLocked`**
- Entry: BudgetGovernor constructed with frozen `userFacingCapUsd`,
  `billedCapUsd`, `phaseAllocationPct`. Preset snapshot frozen.
- Exit: first phase starts.
- Transitions: → `Racing` (normal); → `Error` (trust-tier or policy-parse
  failure).
- Emitted events: `advisor.run.started`, `advisor.budget.reserved` (phase 1).

**State 3 — `Racing`**
- Entry: phase-start. Race-Engine invoked.
- Exit: all candidates settle.
- Transitions: → `Judging` (normal settle); → `Error` (Anthropic 529 / sandbox
  eviction / external-dep-down; see §6.3 error handling); → `Aborted` (user
  clicks abort; hard-cap cancellation).
- Emitted events: `advisor.phase.entered`, `advisor.race.started`,
  `advisor.race.settled`, `advisor.budget.settled`.

**State 4 — `Judging`**
- Entry: all candidates settled. Diversity-Judge runs. Composite Score computed.
- Exit: scores finalized; ranked leaderboard surfaced to human UI.
- Transitions: **→ STOP**. The human now picks manually. The next phase only
  starts if the human clicks "continue with picked candidate." From the
  human's UI click, a new `Racing` transition fires for the next phase.
- Emitted events: `advisor.race.judged`, `advisor.leaderboard.surfaced`.

**Terminal states (reachable from any state):**
- `Error` — unexpected failure. Run preserved for forensic audit. User sees
  actionable error copy.
- `Aborted` — user-initiated abort. Reservation refunded; run preserved.

### 6.3 Error handling — the 4 states Red-Team F9 flagged

Red-Team F9: Round-3 was missing `ErrorRecovery`, `SandboxEvicted`,
`ExternalDependencyDown`, `CostOverrunAbort`. V3.0 response: **consolidate into
one `Error` terminal state** with a structured `errorKind` field. This is honest
about the V3.0 boundary — we don't have auto-recovery for these conditions
because we don't have an auto-advancing FSM for them to recover *to*. The human
sees the error, the human decides.

```ts
enum AdvisorErrorKind {
  ANTHROPIC_OVERLOAD,         // 529 response
  SANDBOX_EVICTED,            // Daytona 30min TTL hit mid-race
  EXTERNAL_DEP_DOWN,          // GitHub / Railway / Cloudflare 5xx
  COST_RESERVATION_OVERFLOW,  // actual > reserved (should not happen but guard)
  PROVIDER_POLICY_VIOLATION,  // Anthropic content-policy block
  UNKNOWN                     // catch-all
}
```

**Error-to-user microcopy (§7)** names the kind + suggests an action ("retry,"
"wait 5min and re-run," "contact support"). Because V3.0 has no auto-retry, the
error is a full-stop — the human restarts or accepts the partial result.

### 6.4 Forbidden transitions

- No `Racing` → `Idle` (Racing always goes through Judging or terminates in
  Error / Aborted).
- No `Judging` → `Racing` directly (human-click required between phases).
- No terminal state → non-terminal (once Error, stays Error).
- No `Error` → `Racing` without a new run-id.

### 6.5 Completion

A run completes when the last phase (Release, which in V3.0 just drafts a PR
rather than deploying) finishes Judging and the human picks the final PR draft.
Run status transitions to `COMPLETED`. Emits `advisor.run.completed`.

### 6.6 Red-Team states NOT added and why

| Red-Team-flagged state | V3.0 decision | Rationale |
|---|---|---|
| `Picking` | **Not in FSM.** | Human picks; not an FSM state. The transition is click-driven. |
| `Committing` | Deferred V4.0. | No auto-commit in V3.0. |
| `ReversibilityCheck` | Deferred V4.0. | No auto-commit → no cliff to check. |
| `HumanPagedOut` | Not needed. | There's no "page out" in Advisor; FSM just stops at Judging and waits for click. |
| `Resumed` | Not needed. | See above. Re-entering is just clicking "continue." |
| `PartialCommit` | Deferred V4.0. | No commits in V3.0. |
| `SandboxEvicted` / `ExternalDependencyDown` / `ErrorRecovery` | Consolidated into `Error` terminal. | V3.0 has no auto-recovery; human decides. |

---

## §7. Microcopy — EN + DE (F24 honest scoping)

### 7.1 What changed

Red-Team F24: "Microcopy is EN+DE only; ES/FR/JA/PT users get English."
V3.0 response: **we do not claim international coverage in V3.0 beyond EN+DE.**
The "Singapore region users get German fallback" scenario is addressed by
falling back to **English**, not German, and by explicitly scoping the V3.0
Advisor to EN/DE primary markets. V3.5 adds FR/ES/JA/PT with build-time
key-set enforcement.

Red-Team verdict: this is a LOW-severity finding; triage decision is acceptance
with explicit scope documentation.

### 7.2 ~25 slots across 6 categories

Stored in `src/lib/autopilot/copy/{en,de}.ts` as typed const objects.
Translation-completeness enforced at build time: EN and DE files must export
identical key-sets.

### 7.3 Budget

| Slot | EN | DE |
|---|---|---|
| Budget warn watermark | "Advisor has used 50% of your $25 budget. Opus agents still available. [View spend]" | "Advisor hat 50% des $25-Budgets verbraucht. Opus-Agenten weiterhin verfügbar. [Ausgaben ansehen]" |
| Budget guard watermark | "75% spent. Opus→Sonnet downshift active for remaining races. Model badge on each race-card shows which model was used." | "75% verbraucht. Opus→Sonnet-Downshift jetzt aktiv. Jede Race-Karte zeigt das genutzte Modell als Badge." |
| Budget critical watermark | "90% spent. Judges downshifted to Haiku. One more race may exhaust the budget." | "90% verbraucht. Juroren auf Haiku heruntergestuft. Ein weiterer Race kann das Budget aufbrauchen." |
| Hard-cap cancellation fired | "Billed cap ($27.78) reached. In-flight streams cancelled. Actual spend will settle below $27.78. [Abort run] or [Top up]" | "Abrechnungs-Grenze ($27.78) erreicht. Laufende Streams abgebrochen. Tatsächliche Kosten werden unter $27.78 liegen. [Abbrechen] oder [Aufstocken]" |
| Phase allocation exceeded | "Implementation phase has used its 40% allocation. [Top up phase] or [Stop and review]" | "Implementation-Phase hat ihre 40%-Zuteilung aufgebraucht. [Phase aufstocken] oder [Stoppen und prüfen]" |

### 7.4 Score advisory

| Slot | EN | DE |
|---|---|---|
| Confident pick | "#1 scored 0.91 with a 0.05 margin over #2. Advisor is confident; your call." | "#1 erreichte 0.91 mit 0.05 Abstand zu #2. Advisor ist zuversichtlich; deine Entscheidung." |
| Close call | "Top two are within 0.02 of each other. Open both diffs before picking." | "Die ersten zwei liegen 0.02 auseinander. Beide Diffs öffnen, bevor du wählst." |
| Below quality floor | "No candidate passed 0.65. [Re-race with different prompts] or [Adjust story AC]" | "Kein Kandidat hat 0.65 erreicht. [Re-race mit anderen Prompts] oder [Story-AC anpassen]" |
| All failed literal_pass | "All 5 candidates failed AC tests. [Re-race] or [Rewrite story]" | "Alle 5 Kandidaten sind an den AC-Tests gescheitert. [Re-race] oder [Story umschreiben]" |
| Semantic intent below threshold | "Candidate passes AC literally but intent-score is 0.58. Review carefully before picking." | "Kandidat erfüllt AC wörtlich, aber Intent-Score ist 0.58. Vor Auswahl sorgfältig prüfen." |

### 7.5 Degradation badge (F20 fix)

| Slot | EN | DE |
|---|---|---|
| Model badge tooltip (opus) | "Produced by Opus 4.7 at Cold tier (<50% budget). Highest-quality tier for this race." | "Erzeugt von Opus 4.7 bei Cold-Tier (<50% Budget). Höchste Qualitätsstufe für dieses Race." |
| Model badge tooltip (sonnet) | "Produced by Sonnet 4.6 at Guard tier (75-90% budget). Opus was downshifted to stay within budget." | "Erzeugt von Sonnet 4.6 bei Guard-Tier (75-90% Budget). Opus wurde heruntergestuft, um im Budget zu bleiben." |
| Model badge tooltip (haiku) | "Produced by Haiku 4.5 (Critical tier / fallback). Highest-speed tier; review more carefully." | "Erzeugt von Haiku 4.5 (Critical-Tier / Fallback). Schnellste Stufe; sorgfältiger prüfen." |

### 7.6 Pause / Abort / Error

| Slot | EN | DE |
|---|---|---|
| Abort confirmation | "Abort this run? Race losers and the PartyEvent log will be preserved for audit." | "Diesen Lauf abbrechen? Loser-Races und PartyEvent-Log bleiben für Audit erhalten." |
| Abort final | "Aborted. Spent $${amount}. Results (including losers) saved as losers/advisor-${shortId}." | "Abgebrochen. $${amount} verbraucht. Ergebnisse (inkl. Losers) gespeichert als losers/advisor-${shortId}." |
| Top-up prompt | "Add more budget to continue? Current: $${spent} of $${cap}. Add: [$10] [$25] [Custom]" | "Mehr Budget, um weiterzumachen? Aktuell: $${spent} von $${cap}. Plus: [$10] [$25] [Individuell]" |
| Error: Anthropic overload | "Anthropic is throttling. Wait 5 minutes and [Retry] — or [Abort and review partial results]." | "Anthropic drosselt. 5 Minuten warten und [Erneut versuchen] — oder [Abbrechen und Teilergebnisse prüfen]." |
| Error: Sandbox evicted | "Daytona sandbox exceeded its 30-minute TTL. Partial results saved; can't resume. [Start new run] or [Review so far]" | "Daytona-Sandbox hat 30-min-TTL überschritten. Teilergebnisse gespeichert; kein Resume. [Neuen Lauf starten] oder [Bisheriges prüfen]" |

### 7.7 Pre-Run

| Slot | EN | DE |
|---|---|---|
| Budget tier header | "How much should Advisor spend, at most?" | "Wie viel soll der Advisor maximal ausgeben?" |
| Shoestring blurb | "$5 (billed up to $5.56) · Hackathon prototype. Haiku-heavy. ~10 stories." | "$5 (max. $5.56 Abrechnung) · Hackathon-Prototyp. Haiku-lastig. ~10 Stories." |
| Standard blurb | "$25 (billed up to $27.78) · B2B-MVP. Opus for implementation. ~20 stories. Recommended." | "$25 (max. $27.78 Abrechnung) · B2B-MVP. Opus für Implementation. ~20 Stories. Empfohlen." |
| Flagship blurb | "$100 (billed up to $111.11) · Agency project. Opus across the board." | "$100 (max. $111.11 Abrechnung) · Agentur-Projekt. Überall Opus." |
| Sensitivity picker header | "How strict should the Advisor be when flagging picks?" | "Wie streng soll der Advisor bei der Kennzeichnung sein?" |
| Sensitivity-High blurb | "Cautious. Flags more picks as 'review carefully.' B2B default." | "Vorsichtig. Kennzeichnet mehr Picks als 'sorgfältig prüfen'. B2B-Standard." |
| Sensitivity-Low blurb | "Permissive. Trusts the score more. Minimal interruption." | "Großzügig. Vertraut dem Score mehr. Minimale Unterbrechung." |
| Hard-cap explainer | "Hard-cap guarantees your total bill won't exceed ${userCap × 1.111}. This 10% buffer absorbs in-flight stream cancellation." | "Der Hard-Cap garantiert, dass deine Gesamtabrechnung ${userCap × 1.111} nicht übersteigt. Der 10%-Puffer deckt in-flight Stream-Abbruch ab." |
| Start button | "Start Advisor" | "Advisor starten" |

### 7.8 Run-Complete

| Slot | EN | DE |
|---|---|---|
| Completion | "Advisor finished. Spent $${spent}. ${storyCount} stories in PR draft. Your review next." | "Advisor fertig. $${spent} verbraucht. ${storyCount} Stories im PR-Entwurf. Jetzt dein Review." |
| Partial completion | "Advisor stopped at phase ${phase}. Spent $${spent}. [Resume next phase] [Abort] [Review so far]" | "Advisor hat bei Phase ${phase} gestoppt. $${spent} verbraucht. [Nächste Phase starten] [Abbrechen] [Bisheriges prüfen]" |

### 7.9 Non-EN/DE fallback

When browser locale is not `en` or `de`:

| Slot | Copy |
|---|---|
| Fallback notice | "Advisor UI is available in English and German. Your locale (${locale}) will show English. Full locale support for FR/ES/JA/PT ships in V3.5." |

---

## §8. Brownfield Advisor (F7 fix via scope-reduction)

### 8.1 What changed

Red-Team F7: "Brownfield autopilot = self-DDOS on user's GitHub." Numbers
(25 issues × 5 candidates × 3 GitHub tool-calls = 375 API calls per run, against
a 5000/hr pool shared with live-human work) demonstrated a real rate-limit
DDOS risk.

V3.0 response: **Brownfield Advisor is Advisor-only, like Greenfield.** No
auto-PR batch. The user picks issues one at a time, the Advisor races each
picked issue, the user reviews and applies. This eliminates the 25×-issue
multiplier because issues are processed interactively, not in a burst.

### 8.2 Brownfield Advisor flow

1. User picks a GitHub label filter in the Studio UI. Advisor lists all open
   issues matching the label (1 GitHub API call per filter, paginated).
2. User selects ONE issue from the list.
3. Advisor runs a standard Implementation-race (5 candidates × Opus/Sonnet) on
   that single issue. Budget-Governor and Composite-Score same as Greenfield.
4. Advisor surfaces the ranked leaderboard. **Human picks the winning
   candidate.**
5. Human clicks "Apply as PR draft" → Advisor creates a draft PR. (1 GitHub API
   call: create-PR-with-diff.)
6. User can repeat for the next issue.

**GitHub API call budget per single-issue Advisor run:**
- 1 × list-issues
- 5 × candidates × ~3 fetch-file calls = 15 calls (avg)
- 1 × create-draft-PR
- **Total: ~17 calls per issue**, vs. Round-3's 375 calls per burst run.

### 8.3 What defers to V4.0

- **Auto-PR batch for multiple issues in one run.** (Requires F7-fix:
  rate-budget-accounting, back-off-with-jitter, per-installation global limit.)
- **Cross-issue dependency check** (F25). N/A in V3.0 because issues are processed
  interactively; the sandbox is re-instantiated per issue, so the "sequential
  with semantic conflict" scenario doesn't arise.
- **Preflight scope classifier.** Still runs per-issue in V3.0, but lightweight
  (one Haiku call per issue the user opens) — O(N) not O(N × 5).

### 8.4 PartyEvents

```ts
| { type: "advisor.brownfield.issues_listed"; runId: string; labelFilter: string; issueCount: number; apiCallsUsed: number }
| { type: "advisor.brownfield.issue_raced"; runId: string; issueNumber: number; raceId: string }
| { type: "advisor.brownfield.pr_drafted"; runId: string; issueNumber: number; prNumber: number; compositeScore: number; actorUserId: string }
```

---

## §9. PartyEvent Telemetry — Append-Only + Hash-Chain (F8 + F14 + F28 fix)

### 9.1 What changed

Red-Team's three audit-trail attacks (F8 Deceptive Alignment via trail
compromise, F14 not-tamper-proof, F28 hash-verification never invoked) all
point at the same weakness: Round-3 audit-trail is vaporware. V3.0 response:
implement the trail with three hardening measures, each named by file path.

### 9.2 Append-only enforcement

```sql
-- prisma/migrations/20260418200000_advisor_append_only/migration.sql

CREATE OR REPLACE FUNCTION patchparty.reject_party_event_mutation()
  RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'PartyEvent table is append-only; DELETE/UPDATE forbidden (runId=%)', OLD."runId";
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER party_event_no_mutate
  BEFORE DELETE OR UPDATE ON "PartyEvent"
  FOR EACH ROW
  EXECUTE FUNCTION patchparty.reject_party_event_mutation();
```

An agent-controlled backend path cannot `DELETE` or `UPDATE` a PartyEvent. The
trigger blocks it at the Postgres level. Drop of the trigger itself requires
superuser (the app-tier DB user does not have `TRIGGER` permission).

### 9.3 Hash-chain per event

Every PartyEvent gets a `prevHash` + `eventHash` column. The chain is:

```
eventHash_i = sha256(prevHash_{i-1} || canonicalize(payload_i))
prevHash_0 = sha256("patchparty-genesis-" || projectId || "-" || runId)
```

Prisma model additions:

```prisma
model PartyEvent {
  id         String   @id @default(cuid())
  projectId  String
  runId      String?
  type       String
  payload    Json
  createdAt  DateTime @default(now())

  // V3.0 advisor hardening (applies to ALL PartyEvent, not just advisor.*)
  prevHash   String                         // hex-sha256 of prior event in (projectId, runId) chain
  eventHash  String                         // hex-sha256 of (prevHash || canonicalize(payload))

  @@index([projectId, runId, createdAt])
  @@index([eventHash])                      // for verification queries
}
```

Writes go through `src/lib/events/append.ts` which:
1. Takes a lock on `(projectId, runId)`.
2. Reads the latest event's `eventHash` as `prevHash`.
3. Computes canonical payload (JSON-canonicalize per RFC 8785).
4. Computes `eventHash = sha256(prevHash || canonical)`.
5. Inserts the row.
6. Releases lock.

Lock contention is managed via Postgres advisory locks keyed on
`hashtext(projectId || runId)`. The lock is held for <5ms per write in practice.

### 9.4 Raw LLM I/O capture (F8 fix)

`src/lib/autopilot/artifact-store.ts` exports `persistRawIO(runId, streamId,
input, output)`. Canonicalizes input (`prompt + tools + systemPrompt`) and
output (`completion + toolCalls + finishReason`) separately, SHA-256-hashes each,
stores under R2 keys `advisor/{runId}/{streamId}/{input|output}/{hash}.json`,
emits `advisor.llm.raw_io_persisted` with both hashes and S3 keys. Every
tool-call persists raw args + raw result.

**Cost** (Red-Team F8 residual): ~2KB per tool-call × 50 × 5 candidates × 20
races = ~10MB per run. At 500 runs/user/year × 100 users = 500GB/year. R2 at
$0.015/GB-month → $90/year. Acceptable.

### 9.5 Nightly verification cron (F28 fix)

Round-3's `snapshotHash` was never verified. V3.0 ships a cron:

```ts
// src/app/api/cron/advisor-verify/route.ts

export async function GET(req: Request) {
  authorizeCron(req);

  const staleRuns = await prisma.advisorRun.findMany({
    where: {
      status: { in: ["COMPLETED", "ABORTED"] },
      completedAt: { gte: subHours(new Date(), 24) },
    },
  });

  for (const run of staleRuns) {
    const result = await verifyHashChain(run.id);
    if (!result.valid) {
      emit({
        type: "advisor.audit.mismatch",
        runId: run.id,
        expectedHash: result.expectedHash,
        actualHash: result.actualHash,
        brokenAtEventId: result.brokenAtEventId,
      });
      await notifyOps({ severity: "P1", runId: run.id });
    } else {
      emit({ type: "advisor.audit.verified", runId: run.id, eventCount: result.eventCount });
    }
  }

  return Response.json({ verified: staleRuns.length });
}
```

Also exposes a per-run endpoint for on-demand verification:

```
POST /api/advisor/runs/{id}/verify
→ { valid: boolean, eventCount: number, brokenAt?: string }
```

### 9.6 PartyEvent catalogue — advisor.*

~20 events shipping V3.0. Union type:

```ts
type AdvisorEvent =
  // Lifecycle
  | { type: "advisor.run.created"; runId: string; projectId: string; presetName: string; budgetTier: string }
  | { type: "advisor.run.started"; runId: string; userFacingCapUsd: number; billedCapUsd: number; phaseAllocation: Record<RacePhase, number> }
  | { type: "advisor.run.completed"; runId: string; finalSpentUsd: number; totalRaces: number; durationSec: number }
  | { type: "advisor.run.aborted"; runId: string; actorUserId: string; reason: string; spentAtAbortUsd: number }
  | { type: "advisor.run.error"; runId: string; errorKind: AdvisorErrorKind; details: string }

  // Budget
  | { type: "advisor.budget.reserved"; runId: string; phase: RacePhase; amountUsd: number; token: string }
  | { type: "advisor.budget.settled"; runId: string; phase: RacePhase; reservedUsd: number; actualUsd: number; refundUsd: number }
  | { type: "advisor.budget.watermark_crossed"; runId: string; level: WatermarkLevel; spentUsd: number; billedCapUsd: number }
  | { type: "advisor.budget.tier_changed"; runId: string; from: DegradationTier; to: DegradationTier }
  | { type: "advisor.budget.hard_cap_cancelled"; runId: string; streamId: string; accumulatedUsdAtAbort: number; billedCapUsd: number }
  | { type: "advisor.budget.phase_exhausted"; runId: string; phase: RacePhase; phaseSpentUsd: number; phaseCapUsd: number }
  | { type: "advisor.budget.topped_up"; runId: string; addedUsd: number; newCapUsd: number; actorUserId: string }

  // Phase / Race
  | { type: "advisor.phase.entered"; runId: string; phase: RacePhase; phaseSpentUsd: number; phaseCapUsd: number }
  | { type: "advisor.phase.completed"; runId: string; phase: RacePhase; phaseSpentUsd: number; phaseDurationSec: number }
  | { type: "advisor.race.started"; runId: string; raceId: string; phase: RacePhase; candidateCount: number }
  | { type: "advisor.race.settled"; runId: string; raceId: string; candidateCount: number; durationSec: number }
  | { type: "advisor.race.judged"; runId: string; raceId: string; topScore: number; margin: number }
  | { type: "advisor.leaderboard.surfaced"; runId: string; raceId: string; rankedCandidates: Array<{ candidateId: string; composite: number; rank: number; badge: AdvisorBadge }> }

  // Human action (Advisor-boundary)
  | { type: "advisor.pick.calibration"; runId: string; raceId: string; humanPickedCandidateId: string; humanPickedRank: number; topScore: number; margin: number; allFiveScores: number[]; pickedAt: number }

  // Audit
  | { type: "advisor.llm.raw_io_persisted"; runId: string; streamId: string; inputHash: string; outputHash: string; inputS3Key: string; outputS3Key: string }
  | { type: "advisor.audit.verified"; runId: string; eventCount: number }
  | { type: "advisor.audit.mismatch"; runId: string; expectedHash: string; actualHash: string; brokenAtEventId: string }

  // Spec-gaming (F-2.1-c)
  | { type: "advisor.spec.gaming_detected"; runId: string; candidateId: string; kind: "test_tampering" | "coverage_drop"; detail: string }

  // Brownfield
  | { type: "advisor.brownfield.issues_listed"; runId: string; labelFilter: string; issueCount: number; apiCallsUsed: number }
  | { type: "advisor.brownfield.issue_raced"; runId: string; issueNumber: number; raceId: string }
  | { type: "advisor.brownfield.pr_drafted"; runId: string; issueNumber: number; prNumber: number; compositeScore: number; actorUserId: string };
```

**Retention:** hot-store 90 days, cold-export to R2 indefinite (for EU AI Act
audit-trail). Cold-export runs nightly; see §10 for the `AdvisorRun` model.

---

## §10. Prisma Models — AdvisorRun (reduced from AutopilotRun)

### 10.1 What changed

Round-3 had three models: `AutopilotRun`, `AutopilotCheckpoint`,
`AutopilotIntervention`. V3.0 reduces to **one**: `AdvisorRun`. Rationale:

- `AutopilotCheckpoint` existed for "auto-pick moments" and "phase-complete
  snapshots" — both tied to auto-advance semantics that V3.0 doesn't have.
  Checkpoints collapse into PartyEvents (which are already hash-chained and
  append-only).
- `AutopilotIntervention` existed for "human pages + approvals" — V3.0 has no
  pages; the human just picks a candidate. The "intervention" is a normal UI
  click logged as `advisor.pick.calibration`.

This reduces schema complexity, removes F21 (unbounded checkpoint growth)
because the checkpoint table is deleted, and aligns with the FSM reduction.

### 10.2 AdvisorRun

```prisma
// prisma/migrations/20260418200000_v2_telemetry_chat_byok/advisor-run.prisma
// (added alongside existing v2 migrations)

model AdvisorRun {
  id                  String             @id @default(cuid())
  projectId           String
  userId              String

  // Mode & preset
  mode                AdvisorMode                          // GREENFIELD | BROWNFIELD
  sensitivityPreset   String                               // 'advisor_sensitivity_high' | 'advisor_sensitivity_low' | 'custom'
  budgetTier          String                               // 'shoestring' | 'standard' | 'flagship' | 'custom'

  // Budget
  userFacingCapUsd    Decimal            @db.Decimal(10, 2)
  billedCapUsd        Decimal            @db.Decimal(10, 2)  // = userFacingCapUsd × 1.111
  spentUsd            Decimal            @default(0) @db.Decimal(10, 4)
  reservedUsd         Decimal            @default(0) @db.Decimal(10, 4)
  phaseAllocationPct  Json                                 // Record<RacePhase, number>
  phaseSpentUsd       Json               @default("{}")    // Record<RacePhase, number>

  // Frozen preset snapshot
  presetSnapshot      Json                                 // full preset at run-start

  // FSM (reduced to 4 states + 2 terminals)
  state               AdvisorFsmState    @default(IDLE)
  currentPhase        RacePhase?
  currentTier         DegradationTier    @default(NORMAL)

  // Brownfield-specific
  labelScope          String?
  focusedIssueNumber  Int?                                 // single-issue mode in V3.0

  // Status
  status              AdvisorRunStatus   @default(ACTIVE)
  startedAt           DateTime           @default(now())
  completedAt         DateTime?
  abortReason         String?
  errorKind           AdvisorErrorKind?

  // Metrics (denormalized; source of truth = hash-chained PartyEvent)
  totalRaces          Int                @default(0)
  totalHumanPicks     Int                @default(0)       // for calibration

  project             Project            @relation(fields: [projectId], references: [id], onDelete: Cascade)
  user                User               @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([projectId, status])
  @@index([userId, startedAt])
  @@index([status, state])
}

enum AdvisorMode {
  GREENFIELD
  BROWNFIELD
}

enum AdvisorFsmState {
  IDLE
  BUDGET_LOCKED
  RACING
  JUDGING
  ERROR            // terminal
  ABORTED          // terminal
  COMPLETED        // terminal (all phases done, last human-pick made)
}

enum AdvisorRunStatus {
  ACTIVE
  COMPLETED
  ABORTED
  ERROR
}

enum DegradationTier {
  NORMAL
  GUARD
  CRITICAL
}

enum AdvisorErrorKind {
  ANTHROPIC_OVERLOAD
  SANDBOX_EVICTED
  EXTERNAL_DEP_DOWN
  COST_RESERVATION_OVERFLOW
  PROVIDER_POLICY_VIOLATION
  UNKNOWN
}
```

### 10.3 What's NOT in the model

Deliberately omitted from V3.0:
- `AutopilotCheckpoint` — collapsed into PartyEvents.
- `AutopilotIntervention` — V3.0 has no paged-out intervention events (all human
  actions are normal UI clicks; `advisor.pick.calibration` captures them).
- `policySnapshot` / `interventionPolicy` — replaced by simpler
  `presetSnapshot` + `sensitivityPreset`.

### 10.4 Cold-export for EU AI Act audit trail

A nightly cron exports completed/aborted runs to R2 for long-term retention:

```ts
// src/app/api/cron/advisor-cold-export/route.ts

export async function GET(req: Request) {
  authorizeCron(req);

  const runs = await prisma.advisorRun.findMany({
    where: {
      status: { in: ["COMPLETED", "ABORTED", "ERROR"] },
      completedAt: { lte: subDays(new Date(), 90) },
      coldExportedAt: null,
    },
  });

  for (const run of runs) {
    const events = await prisma.partyEvent.findMany({
      where: { runId: run.id },
      orderBy: { createdAt: "asc" },
    });

    const bundle = canonicalize({ run, events });
    const bundleHash = sha256(bundle);
    const s3Key = `advisor-cold/${run.projectId}/${run.id}/${bundleHash}.json.zst`;

    await r2.put(s3Key, zstdCompress(bundle));

    await prisma.advisorRun.update({
      where: { id: run.id },
      data: { coldExportedAt: new Date(), coldExportS3Key: s3Key, coldExportHash: bundleHash },
    });
  }

  return Response.json({ exported: runs.length });
}
```

Bundle hash is computed over the final hash-chained tail, providing a single
value for long-term audit-integrity verification.

---

## §11. Roadmap — V3.0 / V3.5 / V4.0 with Earning-Back Criteria

### 11.1 V3.0 MVP — Advisor ships

| Scope | File / entity |
|---|---|
| Advisor FSM (4 states + 2 terminals) | `src/lib/autopilot/fsm.ts` |
| Budget-Governor with cancellation | `src/lib/autopilot/budget-governor.ts` |
| Composite-Score ranker (advisory) | `src/lib/autopilot/advisor-ranker.ts` |
| Race-kickoff per phase | `src/lib/autopilot/race-runner.ts` |
| Per-candidate model badge | `src/app/party/[id]/race-card.tsx` |
| 2 sensitivity presets + 3 budget tiers | `src/lib/autopilot/presets/*.ts` |
| Append-only hash-chained PartyEvent | `src/lib/events/append.ts` + Postgres trigger |
| Raw LLM I/O capture | `src/lib/autopilot/artifact-store.ts` |
| Nightly audit verify cron | `src/app/api/cron/advisor-verify/route.ts` |
| Cold-export cron | `src/app/api/cron/advisor-cold-export/route.ts` |
| Brownfield Advisor (single-issue) | `src/app/api/advisor/brownfield/issue/route.ts` |
| Microcopy EN+DE | `src/lib/autopilot/copy/{en,de}.ts` |
| AdvisorRun Prisma model | `prisma/migrations/.../advisor-run.prisma` |
| ~25 PartyEvent types | (see §9.6) |
| Calibration dashboard (admin) | V3.5 (data collection starts V3.0) |

**Sellable promise:** _"Set a budget. Advisor races 5 candidates per phase, scores
them, shows a ranked leaderboard. You pick. You sign the PR. You ship."_

### 11.2 V3.5 additions

- Calibration dashboard: chart `userOverrideRate` vs `compositeScore` over the
  first 500+ runs. First public data on whether the score is useful.
- FR / ES / JA / PT microcopy (build-time enforced key-set same as EN/DE).
- Brownfield Advisor with pre-fetched issue-previews (so single-issue-select UX
  is faster).
- Calibration-feedback UI: when Advisor sees `userOverrideRate > 0.30`, prompt
  user "would you like to adjust composite-score weights for this project?"
  Adjustments don't retroactively change past runs; they are project-scoped
  going forward.
- Score-term-weights become user-configurable (per Project), replacing the
  hardcoded 0.6 / 0.2 / 0.2 for users who've earned the data to tune.
- Telemetry hardening: `avgOverrideRate` per squad (Red-Team F10 V4.0-pre-req
  shipped in V3.5 instead, since it's useful in Advisor scope too).

### 11.3 V4.0 — Full Autopilot earning-back

**Gate A. Composite-Score calibration**
- **Criterion:** `userOverrideRate < 0.10` over 90 consecutive days, ≥500 runs.
- **File:** `src/lib/autopilot/calibration/gate-a.ts`
- **Event trigger:** gate evaluated weekly; passes → `advisor.gate.a.passed`.
- **Rationale:** if humans agree with the Advisor's top-pick 90%+ of the time,
  the score is genuinely predictive and auto-advance becomes plausible.

**Gate B. Budget-Governor cancellation load-tested**
- **Criterion:** p99 time-from-hard-cap-breach to all-streams-cancelled < 2s
  under worst-case (5 in-flight Opus streams, 50 tool-calls/candidate).
- **File:** `tests/load/advisor-hard-cap-cancellation.ts`
- **Evidence:** CI-integrated load test; failing build if p99 regresses.
- **Rationale:** auto-advance past Judging means more in-flight at any moment;
  cancellation must be fast or the 10% billed-vs-user buffer won't hold.

**Gate C. Append-only audit chain field-tested**
- **Criterion:** 12 months of production `advisor.audit.verified` events with
  zero `advisor.audit.mismatch` in hot-store.
- **File:** `src/app/api/cron/advisor-verify/route.ts` (data, not new file)
- **Rationale:** the audit trail claim needs real production mileage before
  backing an auto-advance decision.

**Gate D. 31-Cliff catalogue zero-hole review**
- **Criterion:** 2-week Red-Team round against the full catalogue produces zero
  Red-Team-acknowledged missing cliffs in V4.0 scope.
- **File:** `planning/v4.0-studio/red-team/cliff-zero-hole-review.md`
- **Rationale:** Red-Team F5 correctly identified 8 holes in Round-3's
  catalogue. Before auto-commit ships, the catalogue needs adversarial review
  coverage.

**Gate E. Aggressive-preset-class killed permanently**
- **Criterion:** no V4.0+ preset defines `auto_proceed_after_sec` for anything
  that would ship code (PR merge, deploy, npm publish, secret rotate, bulk
  email).
- **File:** `src/lib/autopilot/presets/*.ts`
- **Rationale:** Vision §13 Non-Negotiable. The "silence = consent" pattern
  does not earn back.

**Gate F. Cost-per-race empirical data**
- **Criterion:** ≥500 Implementation races across $5 / $25 / $100 presets.
  Published dashboard showing actual cost distribution per-story.
- **File:** `src/lib/autopilot/calibration/cost-per-race-report.ts`
- **Rationale:** Red-Team F11 showed $0.62/story under Round-3 Standard was
  impossible. V4.0 recalibrates preset ratios on real data.

**If all 6 gates pass:** V4.0 ships Full-Autopilot — auto-pick + auto-commit +
auto-staging-deploy, with the 31-cliff catalogue enforced at
`ReversibilityCheck` state, new states `Picking` / `Committing` /
`ReversibilityCheck` / `HumanPagedOut` / `Resumed` added to FSM, and
HumanPagedOut timeout policy (24h Conservative, 4h Balanced, 1h
removed-equivalent — because the Aggressive name stays killed).

**If Gate A fails (userOverrideRate ≥ 0.30):** Advisor stays advisory forever.
This is a legitimate possible outcome. The product remains viable as "Advisor"
with honest positioning.

### 11.4 Anti-promises (things V3.0 / V3.5 / V4.0 will NOT do)

- No "hands-free" marketing copy. Ever. (Vision §10 anti-feature.)
- No `auto_proceed_after_sec` knob applied to any cliff-catalogue action.
  Ever. (Vision §13 Non-Negotiable.)
- No silent model degradation. Every candidate always has a visible model
  badge. (F20 permanent fix.)
- No trust-tier-based auto-promotion of imported agents based on run count.
  (F26 permanent fix — earning-back is signature-based, not count-based.)
- No removal of PartyEvent append-only enforcement. (F14 permanent fix.)

---

## §12. Open Questions

1. **Composite-Score term weights per Project in V3.5.** Admin-only edit;
   `advisor.score.weights_changed` logs the change.
2. **Admin dashboard metrics.** Weekly digest: `userOverrideRate` per Project
   per preset, median `compositeScore`, cost per race, cancellation frequency.
3. **Brownfield issue-state filter.** `open` default; `open+closed` toggle V3.5.
4. **Hash-chain verification on fast-path writes.** Sync-verify at run-complete
   (<10ms for 100-event runs); emit `advisor.audit.verified` inline.
5. **Brownfield multi-issue batch.** Blocked on GitHub-API rate-budget
   (`advisor.github.rate_budget_watermark`); V3.5 ships the accounting, V4.0
   opens the batch mode.
6. **Cold-export format stability.** JSON-canonicalize per RFC 8785 + zstd. No
   proto/avro/parquet in V3.0.
7. **Postgres app-user TRIGGER permission escape.** Defense in depth: nightly
   verifier + `advisor.audit.mismatch` + ops runbook
   (`docs/ops/advisor-audit-integrity.md`).
8. **Advisor opt-in for Director users.** Per-project toggle in Project
   settings; pure Director sees no Advisor affordance.

---

## Files referenced

- `planning/v3.0-studio/00-vision.md` — §3 Autopilot Advisor (post-triage), §5
  Race-Mechanic #7, §10 Anti-features, §13 Non-Negotiables
- `planning/v3.0-studio/07-autopilot-mode.md` — superseded Round-3 spec
- `planning/v3.0-studio/red-team/07-autopilot-attack.md` — 28-finding BLOCK
- `planning/v3.0-studio/12-triage-decisions.md` — Q4 Autopilot decision
- `planning/v3.0-studio/01-data-model.md` — ADR-001 (RaceRun/RaceCandidate),
  ADR-004 (diversity-score)
- `planning/v3.0-studio/05-custom-agents.md` — §8 tool-router (read-only test
  files)
- `prisma/migrations/20260418200000_v2_telemetry_chat_byok/` — existing V2
  migrations alongside which Advisor migration lands

---

**End of Round R2 Green-Team defense.**
