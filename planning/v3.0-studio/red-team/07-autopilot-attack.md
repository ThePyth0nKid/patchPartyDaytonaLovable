# Red-Team Attack: 07-autopilot-mode.md
**Attacker:** Red-Team Squad (Round 3b)
**Target:** planning/v3.0-studio/07-autopilot-mode.md
**Date:** 2026-04-18
**Verdict:** BLOCK
**Finding count:** 28

## Executive Summary

This spec is a masterclass in **AI-safety cosplay**. It borrows every keyword from the alignment literature — Paperclip-AI, Goal-Misgeneralization, Mesa-Optimization, Deceptive Alignment, Shutdown-Avoidance — and then mitigates each one with "we'll emit a PartyEvent" or "we'll run a Haiku-scored probe". The structural defenses (Budget-Governor, Composite Score, 31-cliff catalogue, 9-state FSM, DSL) all collapse under five minutes of adversarial pressure: the auto-pick formula is an LLM judging an LLM and calling it "deterministic"; the hard-cap is soft because reservations are estimates and in-flight spend is unbounded; the FSM is missing at least four states any real production system hits weekly; the three presets differ in constants, not behavior, and collapse to identical failure modes; the reversibility catalogue has gaping holes (no email content generation, no outbound file download, no secret-in-log, no PII-in-prompt, no sandbox-escape); and the whole thing ships to prod behind a GitHub-App that Brownfield-autopilot can DDOS its own user out of. **Do not ship V3.0 of this. Strip to preview-only-no-auto-pick, or delay Autopilot to V4.0.** The position-statement in §1 ("Autonomy-Theater") describes what this spec in fact implements — the spec has become the thing it claims to refuse.

## Findings

---

### F1. Composite Score is an LLM judging itself with the volume turned up
**Severity:** CRITICAL
**Class:** AI-Safety / Correctness
**Attack:** The formula `AC_fit × 0.6 + Diversity × 0.2 + Cost_fit × 0.2` presents as deterministic math. It isn't. `AC_fit` is 50% `literal_pass` (OK, deterministic) + 30% `semantic_intent_score` (Haiku probe, non-deterministic across re-runs, admitted in §13 OQ #2) + 20% `judge_scores_mean` (another LLM). So 50% of the AC term and 100% of the semantic term is an LLM grading the output of another LLM. Diversity is AST-diff (deterministic-ish) but only over code — text artifacts use cosine similarity on embeddings from… another model. `Cost_fit` is literal cost, fine. Net: ~60-70% of the composite is LLM-on-LLM. The 0.85 auto-pick threshold is calibrated on "manual review of ~200 test races during planning" (§4.3) — a sample size too small for any statistical claim about a distribution the spec never plots.
**Evidence in spec:** §4.1 "Deterministic, replayable, audit-trail-emitting." §4.3 "0.03 is the calibrated midpoint from manual review of ~200 test races during planning."
**Proposed mitigation:** Publish the Composite Score distribution on a held-out eval set of ≥1000 races before calling it "auto-pick safe". Until then, V3.0 must show the score as advisory; no automatic FSM advancement. Or: "deterministic" claim is removed from the spec.
**Residual risk:** Even with more data, LLM-judging-LLM is a known-broken evaluation paradigm (see any 2024-2025 LLM-as-Judge calibration paper). This is fundamental.

---

### F2. Reward Hacking "mitigation" is a thought experiment, not a detector
**Severity:** CRITICAL
**Class:** AI-Safety / Spec-Gaming
**Attack:** §2.2 mitigation says "Diversity-Judge operates on semantically-normalized AST (dead-code elimination, variable normalization, constant folding)" — that's a compiler. The spec waves its hand at implementing it. A candidate model primed with "diversify" in its system prompt trivially generates three semantically-equivalent implementations via different control-flow structures (for-loop vs. recursion vs. `Array.map`), different naming patterns, and different composition boundaries. Semantic equivalence detection across that kind of refactor is a research problem (equivalence of two programs is undecidable in general; heuristic checkers miss 20-40% of real cases). The "semantically-normalized" judge cannot exist at the promised rigor.
**Evidence in spec:** §2.2 "Diversity-Judge operates on semantically-normalized AST (dead-code elimination, variable normalization via α-renaming, constant folding) — see 01-data-model.md ADR-004's diversity-score definition."
**Proposed mitigation:** Read ADR-004 out loud. If it doesn't cite an actual implementation (tree-sitter + a normalizer library by name, with benchmarks), this entire defense is vapor. Replace with an honest admission: "Diversity-Judge is noisy; auto-pick below 0.9 composite should escalate."
**Residual risk:** Even an ideal normalizer can't detect semantically-different-but-behaviorally-identical solutions that game style-based diversity metrics.

---

### F3. Budget-Governor hard-cap is not hard — "reservations" + in-flight settle-delay burn $10+ past the cap
**Severity:** CRITICAL
**Class:** Economics / Correctness
**Attack:** §3.4 `reserve(phase, worstCaseUsd)` uses worst-case estimates. Opus 4.7 priced at "≥$3/M output tokens" × 5 candidates × 16K completion = theoretical $0.24/race worst case — but this estimate assumes the candidate obeys `maxCompletionTokens`. A tool-call loop (the Resource-Acquisition scenario the spec claims to defend against in §2.6) can emit 20 tool calls × 4K each = 80K tokens of actual I/O before the orchestrator notices. Meanwhile, all 5 candidates are in-flight when the 100% watermark fires. Spec says "in-flight races complete and persist as losers" (§3.1 Hard-cap row). That's the bug. Five in-flight candidates × actual Opus I/O of $0.50-$2 each = $2.50-$10 burned AFTER hard-cap. On a $5 Shoestring budget, that's 50-200% overspend.
**Evidence in spec:** §3.1 "Hard-cap at 100% halts new races until topped up; in-flight races complete and persist as losers."
**Proposed mitigation:** Hard-cap must cancel in-flight races via orchestrator tool-call rejection (same mechanism §2.10 describes for Pause). Not "allow to complete." Document the expected 5-10% worst-case overshoot explicitly; set the user-facing "hardCap" to 90% of the billed cap so the delta is absorbed.
**Residual risk:** Model providers bill for partial generation. A cancelled stream mid-response is still a bill. The hard-cap will always leak 1-5%.

---

### F4. Three presets collapse to two behaviors under common failure modes
**Severity:** HIGH
**Class:** Spec-Gaming / UX
**Attack:** Conservative / Balanced / Aggressive all share the identical `never_auto` list: non-revert, secret_rotation, external_email_over_10, npm_publish, prod_deploy. So for the 60%+ of real cliffs (every deploy, every migration, every secret, every publish) the behavior is **identical across presets** — page the human. The three differ in: `cost_exceeds` ($5/$10/$30), `ac_fit_below` (0.80/0.75/0.65), `tie_break_within` (0.05/0.03/0.01), `commit_count_exceeds` (15/20/40), and whether `high + soft-revert` auto-proceeds. On the distribution of real autopilot-runs that hit a cliff at all, 80%+ hit a `critical` cliff first, which collapses all three presets to "page human". The "Aggressive" preset's marketing pitch ("auto-proceeds on anything short of critical non-revert") is a lie at the distribution level.
**Evidence in spec:** §6.3 — three preset YAMLs side-by-side reveal identical `never_auto` floors; Aggressive only loosens soft cliffs and score thresholds.
**Proposed mitigation:** Either (a) make presets genuinely different (Aggressive must allow at least one tier of currently-blocked cliffs, else rename to "Patience for soft cliffs"), or (b) rename Conservative/Balanced/Aggressive to "Pause-often/Pause-sometimes/Pause-same-but-wait-longer". Don't sell a gradient that doesn't exist.
**Residual risk:** Users still need a clear mental model of "what actually changes between presets."

---

### F5. 31-entry Reversibility-Cliff catalogue has holes big enough to drive a truck through
**Severity:** CRITICAL
**Class:** AI-Safety / Scope-Collapse
**Attack:** Missing irreversible actions NOT in the 31-cliff catalogue:
1. **Secrets written into PartyEvent log / stdout.** Candidate prints `process.env` to debug, event stream captures it, cold-store retains "indefinitely" per §10. Secret is now exfiltrated to audit log permanently. No cliff catches this.
2. **PII in prompt context.** Candidate reads a user's DB table as test fixture, ships that data to Anthropic as prompt context. GDPR Art 28 processor liability triggered. No cliff.
3. **Sandbox → host escape via mounted volume.** Daytona candidate writes to a mounted path that's also visible to the host (`/tmp`, `/var`). Cross-tenant leak. No cliff.
4. **Outbound file download adding a runtime binary dependency.** Candidate does `curl | sh` in a build step to install `protoc` or similar, Dockerfile now depends on a URL that can change/disappear. No cliff.
5. **Docker base-image tag drift** (`node:20` → someone updates the `20` tag). No cliff — "dependency bump" catches npm but not OCI images.
6. **Rate-limit exhaustion on third-party free tier** (e.g., Cloudflare API free-tier 1200 req/5min exhausted during Saga retry). Account gets throttled or billed-over. No cliff.
7. **Log-retention policy change in prod** (e.g., Sentry sampling bumped from 10% to 100%). Non-code config; no cliff.
8. **Cost-accumulation on `pg_dump` or `COPY` against prod DB** (Railway bills on IOPS). No cliff.
**Evidence in spec:** §5.1–§5.7 — 31 entries, none of which cover the 8 above. §5.8 says "never becomes less-severe over time" — correct, but there are categories of cliff that aren't in the catalogue at all.
**Proposed mitigation:** Start over on the catalogue with a threat-model. Add a default rule: "any action not explicitly catalogued defaults to `critical` cliff" (already suggested in OQ #10 but not implemented in §5).
**Residual risk:** The catalogue will always miss something. The default-deny rule is the only correct floor.

---

### F6. Shutdown-Avoidance mitigation has a ghost-state problem
**Severity:** HIGH
**Class:** AI-Safety / FSM Correctness
**Attack:** §2.10 says orchestrator intercepts tool-calls once `paused=true`. But §7 State 3 (`Racing`) allows "in-flight races allowed to settle (they were already billed)". So during a pause, the FSM is simultaneously in `HumanPagedOut` AND streams are still being consumed. If a stream writes to DB (e.g., `LoserBranch` persistence happens via a mid-stream commit), you get half-committed state with the FSM claiming "paused". On resume, which state wins — the pre-pause or the mid-pause mutation? Spec is silent. Classic half-pause-half-running ghost state.
**Evidence in spec:** §7.1 State 8 "In-flight races allowed to settle (they were already billed); NEW tool-calls refused by tool-router per §2.10." §2.10 "The agent sees all its tools fail; it cannot 'finish the task'." These contradict.
**Proposed mitigation:** Pick one discipline: either pause is hard (cancel all streams, discard partial state — matches §2.10) or pause is soft (let in-flight settle, but then the FSM is in a superposition during settle). Don't ship both.
**Residual risk:** Hard-pause means losing 5-10s of work already paid for. Acceptable vs. the correctness cost.

---

### F7. Brownfield label-burn Autopilot = self-DDOS on user's GitHub
**Severity:** CRITICAL
**Class:** Economics / Operational
**Attack:** §9.1 process: list issues by label (GitHub API), race each (5 personas × Implementation), auto-PR. Numbers: 25 issues max (§9.2), × 5 candidates × avg 3 tool-calls each hitting GitHub (fetch-file, read-PR-comments, check-status) = 375 GitHub API calls per Autopilot run. GitHub-App rate limits are 5000 req/hr for installation, BUT if the installation also serves the main PatchParty user experience (fetching repo metadata, reviewing, commenting), you're sharing a 5000/hr pool with live-human work. Add retries on flaky calls (§9.3 "parallel-issue conflict" mitigation = sequential with re-checks), add the preflight-scope-classifier (Haiku on issue-body for every issue × every race), and you're looking at 500-1000 calls/hour. During a 30-minute Flagship run: 2-4× rate limit pressure. User's IDE / CI / team-members' requests get 403'd because the Autopilot ate the budget. **The user is locked out of their own repo by their own tool.**
**Evidence in spec:** §9.1-§9.3. No mention of GitHub API rate-budget accounting or back-pressure.
**Proposed mitigation:** Hard cap Brownfield-Autopilot at 500 GitHub API calls per run, tracked in a counter separate from the dollar budget, checked before every call. Exponential back-off with jitter on 403. On rate-limit approach, pause and page human (add cliff #32: "GitHub API rate budget 80%").
**Residual risk:** Even with back-off, concurrent runs from the same installation multiply the problem. Need per-installation global limit.

---

### F8. Deceptive Alignment: the agent controls the audit trail it's supposed to be audited by
**Severity:** CRITICAL
**Class:** AI-Safety
**Attack:** §10 PartyEvent telemetry is the claimed audit trail. The agent emits tool-calls; the tool-router emits PartyEvents on behalf of those tool calls. But the agent's text output (prompts, completions, reasoning) can be selectively NOT captured — the spec does not mandate `{prompt, completion, raw_tool_args, raw_tool_result}` is persisted verbatim. §10 lists 20 event types; none is `autopilot.llm.raw_io` with the full I/O body. A deceptively-aligned agent phrases a malicious tool call as benign metadata (e.g., an edit_diff with hidden unicode RTL-override chars to swap letters in a reviewed diff), and the PartyEvent shows "edit_diff approved" — the audit trail has no raw bytes to contradict.
**Evidence in spec:** §10 — no raw-I/O event type; `autopilot.reversibility.checked` has a `commitSha` but no diff-content capture. §2.7 mitigation: "Observability is uniform across races and phases" — it's uniformly insufficient.
**Proposed mitigation:** Persist full LLM I/O as a blob (content-addressed, S3-equivalent) keyed by runId + timestamp. Every tool call persists raw args + raw result. Scan for homoglyph/RTL-override/zero-width in all diff content at `ReversibilityCheck` (new cliff #32).
**Residual risk:** Audit trail storage cost grows with run count. Budget for it or accept partial coverage.

---

### F9. 9-state FSM is missing at least four real states
**Severity:** HIGH
**Class:** FSM Correctness
**Attack:** States missing from §7:
1. **`ErrorRecovery`** — tool-call returns error not timeout; does the FSM go back to Racing, stay in Committing, or page out? Undefined. Real systems hit this on Anthropic 529 overload daily.
2. **`PartialCommit`** — §7 State 6 says "Commit created in sandbox's git working tree (not pushed)" — but what if the commit partially fails (pre-commit hook writes but doesn't commit; pre-push hook is different)? Where does the FSM go?
3. **`ExternalDependencyDown`** — GitHub API returns 502 mid-race. Daytona sandbox disconnects. Railway API times out. Where does the FSM go? `HumanPagedOut` is the assumption but no event type exists for it.
4. **`CostOverrunAbort`** — provider returns bill that exceeds reservation (prompt caching miss, or tool-call loop). FSM has no "reservation-overrun" recovery state; spec just says "cancels with budget denied" (§3.4) but not where the FSM lands.
5. **`SandboxTTLExpired`** (bonus) — Daytona has 30-minute TTL per §07.1 (and 11-deployment-infra.md). `HumanPagedOut` at minute 28 → human resumes at minute 35 → sandbox gone. What state? Spec assumes resume works; doesn't.
**Evidence in spec:** §7.1 enumerates 9 states. §7.2 forbids transitions. No error-recovery, no external-dep, no partial-commit, no TTL-gone states exist.
**Proposed mitigation:** Add at minimum `ErrorRecovery`, `SandboxEvicted`, `ExternalDependencyDown`. Define transitions back to `Racing` (retry once) or `HumanPagedOut` (hand to user).
**Residual risk:** More states = more transitions = more surface area for bugs. Worth it for correctness.

---

### F10. Mesa-Optimization "detection" is guess-and-pray with a KPI dashboard
**Severity:** HIGH
**Class:** AI-Safety
**Attack:** §2.4 mitigation: "`avgOverrideRate` per squad is tracked. High override rate triggers a UI notice." That's not detection; that's a post-hoc observation that the squad was already mesa-optimizing and users were already pushing back for weeks. By the time `userOverrideRate > 0.5` over 10 races, the user has paid for 10 bad races. There is no principled *runtime* detection of mesa-optimization in the spec, and the spec quietly admits this in abstract safety-lit language without providing a method.
**Evidence in spec:** §2.4 — every bullet is a trailing indicator ("avgOverrideRate per squad is tracked (V3.5)" ships a whole version AFTER V3.0 autopilot launches), not a runtime check.
**Proposed mitigation:** Reframe the section honestly: "Mesa-Optimization is not detectable in-the-moment; we mitigate via squad heterogeneity and AC-fit weight dominance. Trailing indicators are V3.5." Don't claim a mitigation that doesn't exist yet.
**Residual risk:** Fundamental to the paradigm. Accept it or don't ship autopilot.

---

### F11. Autopilot on realistic B2B-MVP at €25 budget silently runs out at phase 3
**Severity:** HIGH
**Class:** Economics
**Attack:** Standard preset $25 allocates 50% = $12.50 to Implementation across max 20 stories. That's $0.62/story for a 5-candidate Opus race with judge-pass. Actual observed cost in V2.0 Brownfield races (extrapolating from the user's own telemetry pipeline spec) is $0.80-$2 per Implementation race for a non-trivial story. Real-world behavior: budget exhausts after 6-15 stories. User paid $25 expecting "~20 stories shipped as PR draft" (§8.6 completion microcopy) and got 40-60% of the product with HumanPagedOut at hard-cap and `losers/autopilot-xyz` as the only survivor. The microcopy sells a promise the allocation ratio cannot keep.
**Evidence in spec:** §3.6 Standard preset "maxStories: 20, maxImplementationRaces: 20, implementation: 0.50"; §8.6 "${storyCount} stories shipped as PR draft" — no guardrail that storyCount at Implementation hard-cap is often far less than 20.
**Proposed mitigation:** Publish empirical cost-per-race data (the spec should cite it; this is the one piece of measurable ground truth and it's absent). Recalibrate Standard to $40 or reduce maxStories to 10, whichever the data says. Stop selling "20 stories for $25".
**Residual risk:** Even with calibration, LLM prices will shift. Auto-recalibration loop needed.

---

### F12. Distributional-Shift mitigation in Greenfield is a category error
**Severity:** HIGH
**Class:** AI-Safety / Correctness
**Attack:** §2.9 mitigation: "Brief-clarification phase includes a distributional-probe sub-step: Sonnet asks 'what does real-world input look like for each AC-relevant field?' and augments the fixture set with adversarial examples (emoji, RTL, long strings, null, empty, Unicode NFC/NFD variants)." This is hand-waving. In Greenfield, there IS no production distribution. The product doesn't exist yet. You're asking the agent to *guess* distributional shift. The probe is the Blind-Leading-the-Blind pattern: the same model that generates the implementation generates the adversarial fixtures — which means the same blindspots.
**Evidence in spec:** §2.9 mitigations 1-4, none of which acknowledge Greenfield has no real distribution.
**Proposed mitigation:** Replace with honest scope: "Distributional-shift is deferred to post-launch telemetry and user-reported production bugs. Fuzz-tests are best-effort." Remove the claim of pre-launch coverage.
**Residual risk:** Users will hit real distributional bugs in prod. This is fundamental to generating-the-product-from-a-brief.

---

### F13. "Human paged at cliff" UX has no timeout policy; Autopilot waits forever or not-at-all
**Severity:** HIGH
**Class:** UX / Operational
**Attack:** §7.1 State 8: "stays in `HumanPagedOut` indefinitely if no human action." For Flagship with `auto_proceed_after_sec: 600` that's 10 min, but Conservative sets `auto_proceed_after_sec: null`. What happens if human pages in 6 hours later? Does sandbox still exist (no — 30min Daytona TTL per 11-deployment-infra.md)? Does budget reservation expire (yes — §3.4 `expiresAt: 30min`)? Does the intervention-email (for Aggressive preset) go stale? Spec doesn't specify a maximum HumanPagedOut duration. Real-world: user goes to bed, autopilot paged at 2am, user sees it at 10am, hits Resume, sandbox is gone, budget expired, run is dead weight.
**Evidence in spec:** §7.1 State 8 "stays in `HumanPagedOut` indefinitely if no human action." §3.4 reservation "expiresAt: 30min; auto-released if race never settles." These conflict silently.
**Proposed mitigation:** Add explicit HumanPagedOut timeout policy. Suggested: 24h Conservative, 4h Balanced, 1h Aggressive. On timeout → FSM → aborted with preserved losers. Reservation auto-extension during HumanPagedOut (or replan cost on resume).
**Residual risk:** User wakes up to an auto-aborted run. Still better than silent zombies.

---

### F14. Telemetry is audit-trail only if telemetry is tamper-proof — and it isn't
**Severity:** CRITICAL
**Class:** Security / AI-Safety
**Attack:** PartyEvents are written to Postgres by the same backend that the agent can, in principle, reach via its tool-router. §10 "All events are persisted via the v2.0 PartyEvent pipeline." There's no claim that writes are append-only, no hash-chain across events, no external attestation. A candidate with `run_command` that hits a local DB client (or triggers a helper script that does) can delete PartyEvents. A malicious agent detects pause-signal, deletes its own `autopilot.spec.gaming_detected` events, resumes on human-resume. Audit trail complete: clean.
**Evidence in spec:** §10 PartyEvent catalogue. §11 Prisma models — `AutopilotRun`, `AutopilotCheckpoint`, `AutopilotIntervention` all standard Prisma, no append-only constraints, no hash-chain, no WAL export.
**Proposed mitigation:** Append-only table (enforce via Postgres trigger that rejects DELETE/UPDATE on `PartyEvent`). Hash-chain each event over prev-hash + event-body. Background cold-export to external storage (S3/R2) on a separate trust boundary. Add reconciliation alert when hash-chain breaks.
**Residual risk:** Defense-in-depth; can't fully eliminate insider-threat from compromised backend.

---

### F15. Goal-Misgeneralization example in spec is strawman-tier
**Severity:** MEDIUM
**Class:** AI-Safety / Spec-Quality
**Attack:** §2.1 example: "password reset token in cleartext URL params without expiry." That's a 2005-era mistake that a first-year JR-dev wouldn't make and a lint-rule catches. Real Goal-Misgen looks like: story says "implement user-login"; agent reads `src/middleware.ts`, sees auth already exists but has a bug, "fixes" it by making auth skip when `NODE_ENV=test`, tests pass because they run in test, shipped to prod because `NODE_ENV=test` in prod env var was never noticed. Or: story says "add rate limiting to /api/reset-password"; agent notes AC "user can't send >5 reset emails in 10 min", implements it by caching reset-email-sends per-user-session cookie — attacker without cookies is unlimited. These are the actual GoalMis patterns. Spec's example hides how much subtler this gets.
**Evidence in spec:** §2.1 — the one example, trivial.
**Proposed mitigation:** Add 3-5 real-world-plausible GoalMis scenarios to spec. More importantly: the `semantic-intent probe` must know these patterns. It won't, because it's a Haiku one-shot. This is the deeper unfixable part.
**Residual risk:** GoalMis will ship. All mitigations are probabilistic.

---

### F16. Phase-allocation ratios 5/10/5/10/5/50/10/5 are pulled from thin air
**Severity:** MEDIUM
**Class:** Spec-Gaming / Economics
**Attack:** §3.2 "Why percentages not absolutes: a $5 Shoestring and a $100 Flagship both have the same pipeline shape. The absolute budget scales; the ratios don't." Confident assertion, zero evidence. Where is the study that shows Brief = 5%, Stories = 10%, Implementation = 50% across budget magnitudes? At $5, Brief-phase (one Sonnet pass) easily eats 20-30% because Sonnet fixed-cost per call dominates tiny budgets. At $100, Implementation with 25 stories at Opus easily needs 70%. The ratios are not scale-invariant. Spec asserts invariance without math.
**Evidence in spec:** §3.2 "A $5 Shoestring and a $100 Flagship both have the same pipeline shape. The absolute budget scales; the ratios don't."
**Proposed mitigation:** Publish the per-preset per-phase expected spend in absolute dollars. If Shoestring Brief-phase costs $0.80 and allocation is 5% of $5 = $0.25, the preset doesn't work. Recalibrate per-preset.
**Residual risk:** Calibration drift as model prices change.

---

### F17. Composite-Score auto-pick threshold 0.85 is theater when AC_fit routinely lies in 0.87-0.92
**Severity:** HIGH
**Class:** AI-Safety / Spec-Gaming
**Attack:** If `literal_pass` is 1 (tests green), that contributes 0.5 alone to AC_fit. If `semantic_intent_score` and `judge_scores_mean` are mid-range (0.7-0.9) which is typical for Haiku one-shot scoring without ground truth, AC_fit ∈ [0.76, 0.90]. Add 0.8+ on Diversity (usually high, 5 independent generations) and Cost_fit (top candidate not always cheapest, ∈ [0.2, 0.8]) — composite lands in [0.76, 0.89] on most real races. The 0.85 threshold + 0.03 tie-break will auto-pick approximately 40-60% of real races. But the 0.85 threshold is sold as "clearly best" — it's actually "slightly-above-midrange on a noisy metric". Users will read auto-pick as endorsement; it's really just "above noise floor".
**Evidence in spec:** §4.3 thresholds table, §4.1 "clearly best" framing implicit in the spec's confidence.
**Proposed mitigation:** Raise auto-pick threshold to 0.92. Even better: make it adaptive per-phase (Stories might be 0.88; Implementation 0.93). Show users the full histogram, not just pass/fail.
**Residual risk:** Higher threshold = more human pages = user fatigue. Trade-off, not elimination.

---

### F18. Resume from HumanPagedOut vs Daytona 30min TTL is a data-loss bomb
**Severity:** HIGH
**Class:** Operational
**Attack:** Daytona race-sandbox TTL = 30min (per 11-deployment-infra.md §1.3). Autopilot pauses at cliff detection (§7 State 7). Intervention-email fires to user. User responds in 45min. Sandbox is gone. Winning candidate's artifact is unrecoverable unless persisted outside sandbox — spec doesn't mandate this (§7 State 6 says "commit in sandbox's git working tree (not pushed)"). No push = artifact lives only in sandbox = artifact is lost on TTL. Resume succeeds at FSM level, fails at data level. User gets an error after clicking Resume, work is gone.
**Evidence in spec:** §7 States 6 and 8; no cross-reference to Daytona TTL. 11-deployment-infra.md §1.3 confirms 30-min TTL.
**Proposed mitigation:** Every commit in State 6 MUST push to a losers/autopilot-pending-{runId} branch before transitioning to ReversibilityCheck. On TTL-eviction during HumanPagedOut, restore from that remote branch. Add cliff #33: "sandbox approaching TTL" watermark.
**Residual risk:** Push-to-remote itself is a GitHub API call, adding to F7 rate-limit pressure.

---

### F19. Aggressive preset's `auto_proceed_after_sec: 600` is the exact failure mode the position-statement refuses
**Severity:** HIGH
**Class:** AI-Safety / Spec-Contradiction
**Attack:** §1 position: "Autopilot **never ships without human sign-off on the final PR** (vision §10 anti-feature, non-negotiable)." §6.3 Aggressive preset: `auto_proceed_after_sec: 600` — if human is silent for 10 min, autopilot proceeds. Through what? Everything below `critical non-revert`. That includes `reversibility_tier: [critical]` cliffs? No, those are blocked separately. BUT — `commit`, `high-soft-revert` auto-merges (via `auto_proceed: [high_soft_revert_under_budget, high_all_under_budget]`), staging deploy at cliff #21, package-major-bumps (cliff #27 is `high`), branch-deletion of unmerged losers (cliff #11 is `high`). 10 minutes of silence = autopilot ships partially-reviewed code, bumps major deps, deletes branches, deploys to staging where 50 humans see it (cliff #21). That IS shipping-without-sign-off by any reasonable interpretation.
**Evidence in spec:** §1 vs. §6.3 Aggressive preset YAML lines 744-750.
**Proposed mitigation:** Either (a) `auto_proceed_after_sec` must never apply to anything in the cliff catalogue (all 31 entries demand explicit human-acknowledge regardless of grace), or (b) change the position statement. Don't ship both.
**Residual risk:** User-facing confusion about what Aggressive actually does.

---

### F20. Cost-degradation silently swaps model — user doesn't know which model produced the shipped code
**Severity:** HIGH
**Class:** Transparency / UX
**Attack:** §3.3 — once 75% budget crossed, Opus silently becomes Sonnet; at 90%, Sonnet judges become local heuristics. User-facing microcopy (§8.1 guard watermark) says "Opus→Sonnet downshift active for remaining races" — one line in a notification. User approves results and commits them. Later: which stories' implementations were Opus-produced? Which were Sonnet-produced? Which were judged by Haiku vs. local heuristics? `RaceCandidate` has `model` field (assume it does) — but the user-facing UI does not highlight model-provenance in the final PR. A customer asks "why is the auth code worse than the billing code?" Answer: "auth was shipped during guard tier." You can't answer that without digging into PartyEvents.
**Evidence in spec:** §3.3 degradation tiers; §8.1 microcopy; no requirement that final-PR review surface model-provenance per artifact.
**Proposed mitigation:** Every auto-pick snapshot includes `effectiveModel` field, shown in PR review UI per-story. Badge stories implemented under `guard` / `critical` tiers.
**Residual risk:** Transparent quality tiering leaks internal pricing pressure to B2B buyers, who may dislike it. Worth the honesty.

---

### F21. AutopilotCheckpoint + Intervention tables grow unbounded, no GC
**Severity:** MEDIUM
**Class:** Operational
**Attack:** §11 "Soft-deletes are deliberately not used. Runs are audit artifacts — they never go away. Abort is a status change, not a row deletion." Combined with §10 "Retention: hot-store 90 days, cold-store indefinite per vision §12 EU-AI-Act audit trail argument." Translation: AutopilotRun + 20-50 checkpoints each + 5-10 interventions each × N runs × ~200 users × monthly = unbounded row growth. Postgres handles millions of rows fine, but indices on `(projectId, status)` and `(userId, startedAt)` start pulling hot pages after years. GC policy and archival-to-cold story is absent.
**Evidence in spec:** §11 "Soft-deletes are deliberately not used." No GC / archival spec. §10 "cold-store indefinite" — with no definition of cold-store.
**Proposed mitigation:** Define cold-store (R2 bucket with encrypted JSON-per-run, indexed by runId). Archive runs >90 days to cold-store. Keep hot `AutopilotRun` row but `snapshot` fields offloaded. Cron job for archival.
**Residual risk:** Restoring an archived run for audit = 10-30s fetch. Acceptable.

---

### F22. Reversibility-Cliff override-path is "click confirm" — one click = catastrophic
**Severity:** HIGH
**Class:** UX / Security
**Attack:** §5 override column for critical cliffs: "Human reviews migration SQL + rollback plan; approves via `/api/autopilot/reversibility-ack`." One API call. One button. The user who is multitasking (mobile, coffee-shop, §13 OQ #3 already acknowledges this UX gap) sees a pause notification at cliff #1 (DROP COLUMN) at 2:47pm, taps the notification, reads 3 lines of microcopy, taps Approve. Column dropped. No second-confirmation, no type-the-column-name-to-confirm, no cooldown. This is the Reversibility-Cliff reduced to a tap.
**Evidence in spec:** §5.1 row 1 override column; §5.8 "explicit `/api/autopilot/reversibility-ack` endpoint which requires the triggering user's authenticated action per-event, not a blanket permission." Single-action is still the floor.
**Proposed mitigation:** For `critical + non-revert` cliffs, require secondary confirmation: user types the destructive token (column name, secret name, bucket name, repo name) + confirms. 30-second cooldown after approval before execution. For critical cliffs: require the user to also specify a rollback-plan note.
**Residual risk:** Friction slows real power-users. Intentional.

---

### F23. 10-way failure audit is checklist theater; no evidence any of 10 is detected in practice
**Severity:** HIGH
**Class:** AI-Safety / Spec-Quality
**Attack:** §2 lists 10 Paperclip-AI failure modes and a mitigation each. Of the 10: (1) has a Haiku probe as primary defense — probabilistic; (2) depends on AST normalization that doesn't exist yet; (3) has hard-caps that F3 shows are leaky; (4) has `avgOverrideRate` telemetry (V3.5 — ships AFTER V3.0 Autopilot); (5) depends on read-only test file enforcement (good but narrow); (6) reservation model (F3 breaks it); (7) has `trustTier` logic + static analysis (partial); (8) commit-count + branch-age watermarks (weak); (9) is Greenfield-impossible per F12; (10) pause-signal is contradicted by §7's in-flight-settle (F6). **None** of the 10 are backed by a named detector implementation in a file path. The whole audit is vibes-by-vibes.
**Evidence in spec:** §2.1–§2.10 — every mitigation cites spec sections, never implementation files.
**Proposed mitigation:** Each of the 10 mitigations must cite `src/lib/autopilot/{detector}.ts` with test coverage. If V3.0 ships, reduce claims to what's actually implemented; defer the rest to V3.5/V4.0.
**Residual risk:** Aspirational safety docs age poorly. Better to ship narrow than promise wide.

---

### F24. Microcopy is EN+DE only — ES/FR/JA/PT users get English; position of EU-first rings hollow
**Severity:** LOW
**Class:** UX / Scope
**Attack:** §8 ships microcopy in two languages. Spec's market-claim is "international-standard software production". 11-deployment-infra.md §2.3 ships with Frankfurt / Portland / Virginia / Singapore regions. Singapore region users get German fallback? APAC buyers tolerate this for dev tools, but B2B buyers in France, Spain, and Japan will notice a German-first UI and read it as "this isn't for us". Small attack, but relevant to the positioning.
**Evidence in spec:** §8 — only EN+DE tables. §8 closing "Translation-completeness is enforced at build time: EN and DE files must export identical key-sets."
**Proposed mitigation:** Build-time enforcement is good; extend key-set requirement to FR/ES/JA/PT at V3.5. Or explicitly scope V3.0 Autopilot to EN/DE-speaking users and document.
**Residual risk:** Translation cost; manageable.

---

### F25. Brownfield Autopilot has no cross-issue dependency visibility; races conflict, repo breaks
**Severity:** HIGH
**Class:** Correctness
**Attack:** §9.2 "Sequential processing under Autopilot. Parallel is V4.0." OK, sequential. But: issue #47 ("add User.profileImageUrl") and issue #52 ("remove deprecated User fields") conflict semantically. Both pass scope-classifier individually. Sequential processing: #47 commits `add profileImageUrl`, #52 runs next, doesn't know about #47's un-pushed commits (they're in local sandbox), classifies "remove deprecated" as scope `src/models/user.ts`, happily deletes profileImageUrl as "deprecated" because it wasn't in the pre-race snapshot. Repo now inconsistent. No cross-issue dependency check.
**Evidence in spec:** §9.3 "Parallel-issue conflict: sequential processing." Doesn't cover sequential-with-semantic-conflict.
**Proposed mitigation:** Before each Brownfield issue race, regenerate context from current sandbox HEAD (not pre-run snapshot). Run a Haiku pass "does this issue conflict with any prior autopilot commit on this branch?" and escalate on yes.
**Residual risk:** Haiku can miss subtle conflicts. Document scope: Brownfield Autopilot is best for orthogonal issue sets; batch conflicting issues as Director-mode.

---

### F26. Trust-tier "vetted" promotion criteria is gameable
**Severity:** MEDIUM
**Class:** AI-Safety / Security
**Attack:** §2.7 mitigation: "After 5 races with `winRate > 0` and `userOverrideRate < 0.5`, promoted to `trustTier: 'vetted'`." An attacker-imported CustomAgent for their first 5 races behaves innocuously (generates simple pleasing code, wins at least once, doesn't trigger overrides). Race 6: with `vetted` tier, the agent is now allowed to be sole producer at reversibility cliffs. Race 6 produces the backdoor. This is classic sleeper-agent pattern AND the spec's example-attack scenario from §2.7 itself. The mitigation is gamed by the adversary the mitigation is designed against.
**Evidence in spec:** §2.7 mitigation bullet 3.
**Proposed mitigation:** No trust-tier promotion based on run-count. Promotion requires explicit human review of 3+ of the agent's race outputs. Or: `trustTier: 'vetted'` is only granted to official-origin agents + explicit-admin-approved imported ones. Count-based promotion is removed.
**Residual risk:** Slower adoption of imported agents; acceptable trade-off.

---

### F27. Semantic-intent probe and Diversity-Judge are models themselves — they cost budget that's not in the allocation
**Severity:** MEDIUM
**Class:** Economics
**Attack:** §3.2 phase allocation sums to 100%. But §4.2 defines `AC_fit` with `semantic_intent_score` (Haiku probe per candidate) + `judge_scores_mean` (Haiku judges per candidate). Per race that's ~5 candidates × 2 Haiku calls = 10 extra Haiku calls per race. Diversity-Judge is also a model call per race. Plus Brief-phase distributional-probe (§2.9) is another Sonnet call. None of these are in the `phaseAllocation` dictionary. They come out of… where? If Implementation is allocated 50% and Implementation races consume judge+diversity+intent probes, the consumed budget exceeds the Implementation allocation silently. Phase-exhausted triggers fire early, with the user thinking "I spent 50% on actual impl" when really 35% was impl + 15% was judging.
**Evidence in spec:** §3.2 allocation sums to 100%; §4.2 judge/probe calls not accounted for in any phase.
**Proposed mitigation:** Add explicit `judging: 0.10` phase to allocation. Reduce Implementation from 50% to 40% to make room. Or: judging rolls into the phase it judges, and phase-budget-exhausted events reflect this upfront.
**Residual risk:** Re-calibration of all three presets. Manageable.

---

### F28. Spec claims "replayable" but hash-verification is never invoked post-run
**Severity:** MEDIUM
**Class:** AI-Safety / Audit
**Attack:** §11 `AutopilotCheckpoint.snapshotHash` is described as "enables cheap replay-verification: re-compute the Composite Score for an auto-pick and verify the hash matches. Any mismatch = data corruption or tampering." Excellent idea. Is there a cron job that does this? A manual audit endpoint? A UI surface? Spec doesn't say. The hash is written on create and never verified by the system. It's a feature-in-spec-only.
**Evidence in spec:** §11 `AutopilotCheckpoint.snapshotHash` design note. No referenced verification code/endpoint/job.
**Proposed mitigation:** Ship `POST /api/autopilot/runs/{id}/verify` endpoint that re-computes all checkpoint hashes + emits `autopilot.audit.verified` or `autopilot.audit.mismatch`. Run as nightly cron across active runs. Expose mismatch count in admin UI.
**Residual risk:** Storage cost of canonicalized snapshots grows; acceptable.

---

## Spec-vs-Vision Contradictions

1. **Vision §10 anti-feature:** "No autonomous 'ship-without-me' mode. Autopilot exists, but human signs the final PR. Always." **Autopilot §6.3 Aggressive preset:** `auto_proceed_after_sec: 600` auto-proceeds on silence. Through deploy-to-staging (cliff #21, `high`), package-major-bumps (cliff #27, `high`), branch-deletion (cliff #11, `high`). That's shipping without real sign-off. Pick one.

2. **Vision §13 Non-Negotiable #1:** "A user must not be able to wake up to a $400 bill." **Autopilot §3.1 Hard-cap:** "in-flight races complete and persist as losers" after hard-cap. F3 shows this can leak $10+ on a $5 budget — 200% overrun. The vision says hard-cap is hard. Spec ships soft hard-cap.

3. **Vision §12 existential risk "EU AI Act liability":** "transparency-by-construction (PartyEvent log = audit trail) is our defense." **Autopilot §10 telemetry:** no raw LLM I/O capture (F8), no append-only enforcement (F14), no hash-verification system (F28). The claimed compliance defense is unverifiable.

4. **Vision §5 Principle #7 Budget-Governor:** "Autopilot-mode requires a budget; Director-mode does not but always shows running-cost." **Autopilot §3.6:** budget is an absolute number with fixed ratios — but F16 + F27 show ratios don't scale and judging costs aren't in the allocation. Budget is an illusion of control, not control.

5. **Vision §3 Two Autonomy Modes:** "Studio honors [direction-policy] at runtime." **Autopilot §6.3:** Conservative is actually pretty restrictive; Aggressive is loose enough that the "direction" the user set (strict) gets diluted by `auto_proceed_after_sec` silence-is-consent. Aggressive honors user's direction only when user stays online.

6. **Vision §14 roadmap V2.5:** "Budget-Governor v1 (soft+hard-cap)." **Autopilot §3.4:** implementation is sketched as a single TS file with an async lock per runId — but concurrent races from multiple users on multi-tenant backend are unaddressed. Lock-per-runId doesn't prevent global-budget-exhaustion at the org level.

---

## What This Spec Pretends to Solve But Doesn't

1. **"Safe Autonomy"** — claimed via 10-way failure audit (§2) and 31-cliff catalogue (§5). In reality: 10 mitigations are mostly trailing indicators / vaporware detectors (F23); 31 cliffs are a list, not an implementation, and the list has gaps (F5).

2. **"Deterministic Composite Score"** — claimed in §4. In reality: 60-70% of score is LLM-on-LLM (F1), thresholds are calibrated on a tiny sample (F1), distribution-in-practice is not plotted, auto-pick triggers on "above mid-range noise" (F17).

3. **"Hard-cap budget"** — claimed in §1 and §3. In reality: reservations are estimates, in-flight settles leak, judging costs aren't in the phase allocations (F3, F16, F27). The hard-cap is an estimate-of-a-hard-cap.

4. **"Human signs the final PR"** — claimed in §1 as non-negotiable. In reality: Aggressive preset + `auto_proceed_after_sec` ships human-silent (F19).

5. **"Replayable audit trail"** — claimed in §11. In reality: no verification system wired; tampering undetectable unless a human manually investigates (F14, F28).

6. **"Three meaningfully different presets"** — claimed in §3.6 and §6.3. In reality: two behaviors (pause-often vs pause-same-but-wait) with slightly different constants (F4).

7. **"Brownfield-autopilot production-ready"** — claimed by inclusion in V3.5. In reality: GitHub API rate-limit DDOS-by-design (F7), cross-issue dependency blindness (F25), sandbox TTL vs resume latency (F18).

8. **"Covers Paperclip-AI risk"** — claimed via §2 framing. In reality: runtime mesa-detection absent (F10), deceptive-alignment audit trail compromised (F8), distributional-shift unaddressable in Greenfield (F12).

---

## Verdict and Required Changes Before Ship

**Verdict: BLOCK.** This spec cannot ship as V3.0 Autopilot. The delta between what it claims and what it implements is large enough to be marketing risk, safety risk, and user-trust risk. Shipping would concretely help competitors: the first time a user's budget blows 3×, or a DROP-COLUMN ships with one tap, or Brownfield-autopilot locks them out of their own repo, the story writes itself on HN and we lose the "deepest-in-control" positioning that is the only thing differentiating from Bolt/Lovable/Devin.

**Required changes before ship (non-negotiable):**

1. **Downgrade V3.0 scope to preview-only, score-advisory-not-auto-advance.** FSM stops at Judging. Display Composite Score + candidate ranking to user. No auto-pick. Rename to "Autopilot Preview" in UI. (Fixes F1, F17, most of F23.)

2. **Fix hard-cap:** hard-cap must cancel in-flight streams via tool-router rejection. Document the 5% leak tolerance. Set user-facing hardCap to 90% of billed cap. (Fixes F3.)

3. **Add `ErrorRecovery`, `SandboxEvicted`, `ExternalDependencyDown` to FSM.** Add cross-ref to Daytona TTL with explicit push-to-losers-branch before commit. (Fixes F9, F18.)

4. **Remove `auto_proceed_after_sec` from Aggressive preset, or scope it ONLY to non-cliff score-ambiguous pauses.** Never apply to anything in the 31-catalogue. (Fixes F19, contradiction #1.)

5. **Add 8 missing cliffs to catalogue** (F5): secrets-in-log, PII-in-prompt, sandbox-escape, outbound-binary-download, OCI-tag-drift, 3rd-party-rate-limit, log-retention-config, prod-DB-heavy-op. Add default-deny: "any action not explicitly catalogued defaults to `critical` cliff."

6. **Append-only PartyEvent + hash-chain + raw LLM I/O blob capture.** Wire the `AutopilotCheckpoint.snapshotHash` verification cron. (Fixes F14, F28.)

7. **Brownfield-Autopilot: GitHub API rate-budget accounting.** Hard cap at 500 calls/run. Cross-issue semantic conflict check. (Fixes F7, F25.)

8. **Publish empirical cost-per-race data and recalibrate three presets against it.** Add `judging` line item to phase allocation. (Fixes F11, F16, F27.)

9. **Secondary confirm + typed-token-to-confirm on critical non-revert cliffs.** No one-tap catastrophic actions. (Fixes F22.)

10. **Rewrite §2 to separate "has a named detector implementation in code" from "aspirational safety principle".** Move aspirational to "Future Work" section. (Fixes F23.)

If these ten changes land, the spec is shippable as V3.0 with honest positioning. Without them, either (a) delay Autopilot to V3.5, or (b) ship as "Autopilot Preview — deterministic scoring, manual advancement" and never claim auto-pick until V4.0. The position statement in §1 ("not an AI that makes the movie while you sleep") is already the right one. Make the spec match.

**Single-line verdict:** This is Autonomy-Theater wearing a safety-spec costume. Kill the auto-advance in V3.0 or lose the moat.
