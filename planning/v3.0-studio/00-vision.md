# v3.0 — Studio (Final Cut Pro for Software Production)

**Status:** Concept v3.0-draft, **post-triage** (2026-04-18). Survived Red-Team rounds 1+2 + Round 3 squad deliverables + Round 3b Red-Team brutal attack (131 findings, all 5 specs BLOCKED). Triage-decisions committed in `12-triage-decisions.md` — flagship claims killed, reduced-scope V3.0 + honest V2.5 defined. Awaiting Round R2 Green-Team defense + final consolidation into Concept v3.0.

**Scope expansion in this revision (post-triage, honest):** deployment/infrastructure is a **first-class part of the Studio product**, not a hand-off. Three-layer stack — **Railway (prod runtime) + Cloudflare (edge / DNS / CDN / WAF / Workers / R2 / Access / Pages) + Daytona (race-sandbox → preview-envs → dev-envs)** — is load-bearing. Rationale: the Studio's market claim is _"brief to best-effort-deployed PR in one session"_ (not "production-URL" — that phrase is marketing fiction at solo-dev-tier and has been killed). See `11-deployment-infra.md`.

**Killed by triage (2026-04-18):** the phrases "international-standard", "99.9% SLA", "HARD GDPR region-pinning", and "SOC-2-ready" are removed from Vision and marketing. They earn their way back in V4.0 only via shipped certificates + measured uptime + contracted enterprise tiers. Honesty over aspiration.

**One-line vision (final form):**
_PatchParty is a software-production studio in the spirit of Final Cut Pro. The developer is the director. Squads of agents deliver alternative takes at every meaningful decision. The human picks, scrubs, edits, branches, and ships an explainable PR — or sets a budget and lets the studio build itself, with the human cutting in anywhere they like._

**Market claim (we say it out loud):**
_The best agentic software-development studio that exists. Not the fastest. Not the easiest. The deepest._

---

## 0. What changed from v1.0

| Area | v1.0 | v2.0 | Reason |
|---|---|---|---|
| Race-phases in V2.5 MVP | Stories + Stack | **Only Stories** | Solo-dev-realist + Stack-race needs ≥3 templates we don't have yet. Stack ships V2.7 as race; until then linear with `show-alternatives`. |
| V2.5 timeline | 8 weeks | **12 weeks** | Repo-Genesis includes real GitHub-App, CI wiring, OAuth scope migration, BYOK plumbing for greenfield. Honest estimate. |
| Provider strategy | TBD | **Anthropic-only for V2.5; OpenRouter optional V3.0+** | Opus 4.7 leadership is the moat for race-quality right now. Multi-provider is a v3.0+ defensive play, not a launch feature. |
| Education positioning | Core sales argument | **OSS / community pitch only** | B2B buyers do not buy "we teach your devs". They buy "ship faster + observable + we own the dataset". Education stays load-bearing in product, not in pitch. |
| Race-Mechanic Principles | 5 | **8** (added Diversity-Judge + Budget-Governor + Deep-Iterate) | Defends against "5 candidates that all look the same" failure mode, against runaway-cost incident, and against "race-breadth without depth" failure mode (5 mid takes vs. 1 hardened take). |
| Asset model | Implicit (text-only) | **First-class asset pipeline** (Wireframes, images, Seedance-2 videos) | User explicit: real assets, not placeholders. Bin becomes the heart of the Studio. |
| Custom Agents | Not in scope | **Platform feature, V3.0** | User-defined personas/squads — Claude-Code-subagent-style. The thing that turns PatchParty from "tool" into "platform". |
| Autonomy model | Manual-only | **Two modes: Director + Autopilot (Paperclip-style, budget-bounded)** | Greenfield-buyer wants "set budget, watch it build, intervene anywhere". Director-mode stays the default; Autopilot is opt-in per-project. |
| Branding | "PatchParty" | **PatchParty (umbrella) + Studio (Greenfield product line)** open question — Round 3 Squad C decides | Possible split: Brownfield = "PatchParty" (developer tool), Greenfield = "PatchParty Studio" (B2B production studio). One repo, two pitches. |

The V2.0 codebase (Brownfield) does not change scope. Everything below is post-V2.0.

---

## 1. Why this exists (and why it's not Lovable / Bolt / v0 / Cursor / Devin)

The vibe-coding generation optimised _time-to-first-app_. They won that axis. The cost they paid:

- **No real versioning** — snapshots, not commits. A user who leaves the platform leaves their decisions behind.
- **No observability** — the agent is a black box. The user cannot reconstruct why X was chosen over Y.
- **No alternatives** — one answer per prompt. The user develops no comparison muscle, no judgment.
- **Hidden cost** — credit-systems instead of token-cost. The user never learns to budget.
- **Wrong didactics** — they teach _delegation_ ("AI fixes it") instead of _direction_ ("I pick between options"). Junior devs lose foundational skills; senior devs do not adopt.
- **No assets-as-first-class** — wireframes, design tokens, brand-guides, demo-videos all live outside the tool.
- **No agent-orchestration surface** — the user cannot define "I want this squad to look at this kind of work". One vendor's persona-recipe forever.

PatchParty inverts every one of those. **Versioning-first, observability-first, alternatives-first, cost-transparent, didactic-by-construction, assets-first-class, agents-user-definable.** The price is _time-to-first-app_ — accepted, because we serve a different buyer.

## 2. Who this is for (and who it isn't)

| Buyer | Mode | Buys what |
|---|---|---|
| **Hackathon dev / senior dev with existing repo** | **Brownfield** (today's V2.0) | Race-mechanic on a single issue. Ships PR in <30 min. Replaces Cursor-Composer for "five takes on one ticket". |
| **B2B-software builder / agency / founder with a brief** | **Greenfield – Director** | Full pipeline brief → Stories → Stack → fresh GitHub repo → Story-by-Story implementation → PR-stream. Replaces "two weeks of solo discovery + scaffolding". |
| **Founder/agency that wants to prototype fast and intervene only at risky junctions** | **Greenfield – Autopilot** | "Here is the brief, here is €40 budget, build it. Page me at every reversibility-cliff." Replaces Bolt/Lovable's auto-build with one that checkpoints, audits, and version-controls every step. |

**Not for:** non-technical CRM-builders (Base44's territory), users who want one prompt → one app (Lovable's), users who want raw IDE control (Cursor's). We do not chase any of these.

## 3. Dual-Entry Model + Two Autonomy Modes

```
                       ┌──────────────────────────────────────────────────────┐
                       │                                                      │
  GREENFIELD ──►  Brief ──► Stories ──► [Stack] ──► Repo-Genesis ──┐         │
                  (linear) (RACE)       (lin/RACE) (linear)        │         │
                                                                   ▼         │
                                                        Story-Implementation │
                                                              (RACE)         │
                                                                   │         │
                                                                   ▼         │
                                                        Quality-Pass (linear)│
                                                                   │         │
                                                                   ▼         │
                                                              Release        │
                                                                   │         │
  BROWNFIELD ──►  Existing GitHub repo ──► Issue-pick ─────────────┘         │
                  (today's V2.0)                                              │
                                                                              │
  ──────── Two autonomy modes overlay any path: ─────────────────────────────┤
                                                                              │
  DIRECTOR (default):  Studio waits at every race. Human picks, edits,       │
                       branches. Cost-tag visible. No race fires unless      │
                       initiated.                                            │
                                                                              │
  AUTOPILOT ADVISOR    Human sets budget + advisor-sensitivity + AC. Studio │
  (V3.0, opt-in):      races, computes Composite-Score, shows score as      │
                       advisory overlay on Race-Cards. FSM stops at Judging  │
                       — human manually picks, commits, deploys. Budget-     │
                       Governor + Hard-Cap active. Aggressive auto-advance   │
                       is KILLED (contradicted Vision §13 Non-Negotiable).   │
                                                                              │
  AUTOPILOT FULL       (V4.0 earning-back): 90-day calibration of Composite- │
  (deferred V4.0):     Score + hard-cap cancellation + append-only audit    │
                       chain + zero-hole reversibility-cliff catalogue.      │
                       Until then, full Autopilot is roadmap-only.           │
```

**Both autonomy modes share the same Race-Engine.** Autopilot is a meta-orchestrator on top, not a parallel codepath. Brownfield can also run Autopilot for "burn down this label of issues with €X budget".

## 4. Pipeline Phases (race vs. linear, explicit, with V2.5/V2.7/V3.0 markers)

Only **3 phases race in steady state.** This is the answer to Red-Team's decision-fatigue attack — ~10–15 picks per project under Director, ~3–5 under Autopilot.

| # | Phase | Mode | Race? | Sandbox? | Model | Ships in | Notes |
|---|---|---|---|---|---|---|---|
| 1 | **Brief Clarification** | Greenfield | linear | no | Sonnet | V3.0 | Multimodal: text/PDF/transcript/voice/Loom. Returns 1 `ProblemStatement` + clarifying-questions thread. |
| 2 | **Story Generation** | Greenfield | **RACE 5** | no | Sonnet | **V2.5** | 5 slicing philosophies: MVP-lean / Feature-complete / Verticals / Journey-first / Risk-first. |
| 3 | **Wireframes** | Greenfield (opt-in) | _show-alternatives_ | no | Haiku → image-model | V3.5 | Real Wireframe-images (not ASCII). Generated via image-model from Story+Brief; user can race them, but default = single-best. Asset-bin gets them as first-class. |
| 4 | **Stack Decision** | Greenfield | linear (V2.5) → **RACE 5** (V2.7) | no | Opus | V2.5 linear, **V2.7 race** | 5 ideologies: Batteries-included / Edge-native / Enterprise / OSS-only / Serverless-minimal. ADR-style. V2.5 ships 1 default (Next.js+Postgres+Tailwind+shadcn) with `show-alternatives` link. |
| 5 | **Repo-Genesis** | Greenfield | linear | yes | Sonnet | **V2.5** | Transactional 5-provider provisioning as a **Saga**: GitHub-App (repo) + Railway (project + services + Postgres) + Cloudflare (DNS zone + Worker routes + R2 bucket) + Daytona (workspace template). Each step logs a compensating action; on partial failure, reverse-order rollback. **Losing scaffolds preserved as `losers/genesis-N` branches.** See `11-deployment-infra.md` §7 Repo-Genesis-Saga. |
| 6 | **Story-Implementation** | Both | **RACE 5** | yes | Opus/Haiku mix | shipping in V2.0 | Today's PatchParty. 5 personas race per story. Chat-iterate in winner sandbox. |
| 7 | **Quality-Pass** | Both | linear (specialist squads) | yes | Haiku scans, Sonnet fixes | V3.5 | a11y / perf / sec / type / coverage as **single-best-fix per concern**, not 5-race. |
| 8 | **Release** | Both | linear (V3.5) → race-option (V4.0) | yes | Sonnet | V2.5 MVP (`railway up` only), V3.0 Canary, V3.5 Blue-Green | Strategy + changelog drafted; user picks Canary / Blue-Green / Big-Bang. Deploy target is **Railway** (prod runtime) behind **Cloudflare** (DNS, WAF, Workers for canary-traffic-split). Big-Bang = direct `railway up -s {service} -d` (anti-pattern in prod, allowed only for Brownfield single-service). Canary = Railway blue/green + CF Worker with header-based 5% → 100% promotion at health-gates. Blue-Green = two Railway services + atomic DNS-swap via CF API. See `11-deployment-infra.md` for verbatim Worker code + region-pinning for GDPR. |
| 9 | **Asset Generation** (cross-cutting) | Both | linear or RACE depending on asset type | varies | Image-model + Seedance-2 + Sonnet-prompts | V3.0 (images), V3.5 (video) | Wireframes (image-model), Demo-videos (Seedance-2), Marketing-copy (Sonnet). Lives in Bin. Real assets, not placeholders. **Asset-pipeline is what makes Greenfield "ship-ready" not "code-ready".** |
| 10 | **Custom Agents** (cross-cutting) | Both | n/a — meta | n/a | n/a | V3.0 | User-defined personas / squads, Claude-Code-subagent-style. Stored per-Project. Race uses them in place of (or alongside) defaults. |

**Greenfield default path V2.5:** Stories(race) → Stack(linear) → Repo-Genesis → Story-Implementation(race) → existing PR-flow.
**Greenfield default path V3.5:** Brief → Stories(race) → [Wireframes opt-in] → Stack(race) → Repo-Genesis → Story-Implementation(race) → Quality → Release. Asset-Generation interleaves throughout.
**Brownfield default path:** 6 → existing PR-flow. (Quality + Release in V3.5.)

**Skip-with-cost:** every phase skippable. Next phase shows historical penalty ("Skipping Stack-Decision → +34% re-races during Implementation"). Didactic, not punitive.

## 5. Race-Mechanic Principles (8, hardened)

1. **Only race where alternatives are real.** Stories (slicing is opinion), Stack (ideology), Implementation (persona-flavor) — yes. Wireframes default no, Quality no, Release-script no. Better one good output than five mid ones.
2. **Loser-branches are first-class.** Code-phase losers persist as `losers/{phase}-{shortid}` git branches; non-code losers as JSON in `LoserBranch.artifact`. (a) "branch from any historical pick" UX, (b) RLHF dataset is the moat.
3. **Edit-then-decide is non-destructive.** User edits override the race output via an `EditOverlay`; the original race-result remains immutable. The (output, edit) delta is the highest-value signal we collect.
4. **Cost-tag on every pick + every re-race.** `~$0.23 · 47s · 3 agents` next to the button. Not buried in settings.
5. **Re-race takes priors.** A re-race after a pick consumes the prior pick + the user's note as additional context. It is _not_ a fresh roll of the dice.
6. **Diversity-Judge.** Before showing 5 candidates to the user, an AST-diff (code) or semantic-diff (text) score is computed pairwise. If max-similarity > threshold, the orchestrator silently re-rolls the offenders with diversified prompts. Defends against "5 candidates that all look the same" — the silent killer of the race-mechanic.
7. **Budget-Governor + Hard-Cap.** Every Project carries a budget. Soft-watermarks at 50/75/90% trigger UI warnings. Hard-cap at 100% halts new races until topped up; in-flight races complete and persist as losers. Autopilot-mode requires a budget; Director-mode does not but always shows running-cost.
8. **Deep-Iterate (post-triage: R1-only V3.0, Triadic V4.0-if-data-justifies).** Pick is not the end. After picking a candidate, the user can choose **Deep-Iterate** instead of "next phase".
   - **V3.0 MVP — R1 critique + per-flaw patch-suggestion.** 5 cross-model (Opus 4.7 + Sonnet 4.6 + Haiku 4.5, sampled for diversity) critics attack the picked artifact; each returns `{flaw, severity, evidence, proposed-patch-as-diff}`. User accepts/rejects patches individually. This is **not** "1 hardened candidate"; it is "the candidate you picked, with its flaws surfaced and patchable". Honest framing kills the marketing fiction from the original spec.
   - **V4.0 earning-back — R2 Green-Team variants + R3 Synthesis.** Requires: (a) OpenRouter or equivalent for genuine instrument-diversity (Red-Team proved same-family critics collapse), (b) ≥500 sessions of data showing per-variant user-selection-rate varies meaningfully, (c) cost-envelope for triadic pass ≤ $3 standard preset.
   - **Branch naming (V3.0):** `iterations/{phase}-{shortid}-r1` stores the critique-list + accepted-patches. No `-r2-a/b/c` / `-r3` branches until V4.0.
   - **Why this matters (honest version):** race-mechanic produces breadth (5 alternatives); Deep-Iterate V3.0 produces depth-as-critique (one alternative, flaws surfaced with actionable patches). Full triadic hardening defers to V4.0 with empirical justification. The Studio is competitive with senior-engineer-led design review _where engineering review is flaw-surfacing_; the "1 hardened candidate" claim is retracted until the R2/R3 data exists.
   - Deep-Iterate is exposed as a button next to Pick / Re-Race in the Inspector. Autopilot-Advisor V3.0 can suggest Deep-Iterate at advisor-flagged reversibility-cliffs; the advisor suggests, the human triggers.

## 6. Studio UX (single screen, three pillars + timeline + asset-bin)

```
┌─[nav]┬─────────────────────────────────────────────────────────────────────┐
│      │ Brief │ Stories │ [Stack] │ Repo │ Build │ Quality │ Release        │
│      ├─────────────────────────────────────────────────────────────────────┤
│ Bin  │ Stage (5 race-cards + big-preview + diff)         │ Inspector       │
│ 280  │ flexible                                          │ 320             │
│ ───  │                                                   │ ───             │
│ Brief│                                                   │ Rationale       │
│ Wires│                                                   │ AC checklist    │
│ Logo │                                                   │ Persona notes   │
│ Demo │                                                   │ Diff            │
│ Code │                                                   │ Chat (per-cand) │
│ Vids │                                                   │ Pick / Re-race  │
│      ├─────────────────────────────────────────────────────────────────────┤
│      │ Timeline (scrubbable, double-click = branch-from-here) · Budget bar │
└──────┴─────────────────────────────────────────────────────────────────────┘
```

- **Bin (left):** all assets — uploaded briefs, brand-guides, screenshots, recordings, generated wireframes, generated demo-videos. Pinned assets flow as standing context into every following race. **The Bin is the heart of the Studio** — it's what makes us a production-tool, not a code-tool.
- **Stage (center):** 5 race-candidates as cards; click = inspect; `1`–`5` = pick; `R` = re-race; `Space` = big-preview.
- **Inspector (right):** rationale, AC checklist, persona notes, diff, chat-tab per-candidate, pick/re-race buttons, cost-tag.
- **Timeline (bottom-pinned, always visible):** the metaphor only works if the scrubber never leaves the screen. Double-click any historical pick → "branch from here" dialog → second timeline track appears. **Budget-bar lives next to the timeline** — never out of sight.
- **Autopilot-mode UI overlay:** when project is in Autopilot, the Stage shows "Auto-picking in 14s — `[Take over]`". User can interrupt every race. Timeline marks autopilot-picks differently (badge `AP` next to commit-dot).
- **No primary chat.** Chat exists per-candidate inside the Inspector (a tab), never as the main interface. Artifact-first; competitors are chat-first.

## 7. Asset Pipeline (what makes us a Studio, not an IDE)

The Asset Pipeline is the user-visible proof that we're a production-tool. Every asset is real, version-controlled, and cite-able from any race.

| Asset type | Generator | Race? | Storage | Used by |
|---|---|---|---|---|
| Brief / problem-doc | User-uploaded or Brief-phase output | n/a | Bin (markdown + original) | Stories, Wireframes, Stack |
| User stories (text) | Stories-race | yes | Postgres (`Story` model) | Wireframes, Implementation |
| Wireframes (PNG/SVG) | Image-model from Story + Brief | opt-in | Bin + S3-equivalent | Implementation (as visual AC) |
| Logo / brand assets | User-uploaded | n/a | Bin | Wireframes, Marketing |
| Code | Implementation-race | yes | Git (sandbox) | PR |
| Demo video | Seedance-2 from Story + finished UI screenshots | linear | Bin + S3 | Marketing, customer-handoff |
| Marketing copy | Sonnet from Brief + Stories | optional race | Bin (markdown) | Customer-handoff, README |
| ADR / decision-log | Auto-generated from every pick | n/a | Bin (markdown) + Git | Audit, future-self, hand-off |

**Why this matters strategically:** the Asset Pipeline is the part competitors can't copy quickly. Bolt/Lovable have UI generation; Cursor has code; nobody has a single tool where Stories + Wireframes + Code + Demo-video + ADR all version together with shared Bin context. The Bin is the moat once Custom-Agents reference shared assets.

**Phasing:** V2.5 ships text-only assets (Stories + ADR + Brief). V3.0 adds image-based Wireframes. V3.5 adds Seedance-2 video.

## 8. Custom Agents (the platform play, V3.0)

Claude-Code's subagent system as a first-class feature. The user can:

- Define a persona inline ("Sven the German-Mittelstand-veteran reviewer — paranoid about data-residency, hates Tailwind, prefers Bootstrap, comments in German").
- Save it per-Project or global (`~/.patchparty/agents/`).
- Compose squads ("for any auth-related story, race uses `Sven` + `OWASP-bot` + 3 defaults").
- Share squads as plain markdown files (not a marketplace — explicit anti-feature; private sharing only).

**Why this matters:** it's the difference between "PatchParty is a tool" and "PatchParty is a platform". Power-users build their squad-libraries; agencies sell their squads to clients; the dataset of which-custom-squad-wins-what is the next-tier moat after loser-branches.

**Anti-patterns** explicitly rejected:
- No marketplace (moderation hell, prompt-injection vector).
- No "agent-as-a-service" subscription tier — agents are config files, not products we sell separately.
- No agent-evaluation leaderboards — race-results are the leaderboard.

## 9. Education Mission (load-bearing in product, NOT in B2B pitch)

Vibe-tools teach delegation. We teach direction. Through use, not tutorials. **This is sold as an OSS/community story; B2B sales pitch is "ship faster + observable + you own the dataset". Education is the residual benefit, not the wedge.**

| Skill | Mechanic that teaches it |
|---|---|
| Diff-reading | Race-cards show diffs, not full files. Picking forces reading. |
| Cost-budgeting | Every action has a price-tag visible at decision time. Budget-bar always visible. |
| Spec-driven thinking | Brief → Stories → AC → Code is the only path forward. Skipping shows historical penalty. |
| Versioning fluency | Each phase = branch, each pick = commit. The user reads `git log` after using us — and understands it. |
| Reversibility intuition | Every action gets a `REVERSIBLE` / `STICKY` badge. The user learns where they can be aggressive vs. careful. |
| Agent orchestration | "Why this squad?" hover explains the trade-off in one sentence. Custom-Agents teach by composition. |
| Observability as default | The PartyEvent stream is always visible, never behind a "Debug" toggle. |

**Mission statement (community-pitch):** _PatchParty teaches engineering as a reflex, not a subject. Four hours with the tool and you read diffs, budget tokens, and pick architectures without anyone having taught you._

## 10. Anti-Features (explicitly not built)

- **No `Pro Mode` toggle.** Progressive disclosure replaces it.
- **No tutorials, no `Next` onboarding flow.** First interaction = first real work. Demo-Mode pre-fills a brief; the user immediately watches the pipeline run.
- **No badges, points, streaks.** The reward is faster-better output.
- **No public marketplace.** Patterns/agents/templates private-by-default. **Post-triage (2026-04-18): also no managed cross-user Custom-Agent sharing in V3.0** — users share agent-YAML files like they share a tsconfig (email, git-checkin, manual). V4.0 earning-back requires ed25519-signing + revocation + per-agent content-hash-pinning.
- **No wireframe-race in default flow.** Opt-in linear in V3.0+.
- **No autonomous "ship-without-me" mode.** Autopilot exists, but human signs the final PR. Always.
- **No multi-tenant agent-as-a-service product.** Custom Agents are config files, not SaaS.
- **No "AI fixes it" framing in marketing.** We frame as "AI proposes; you direct".

## 11. What this leaves on the table (and to whom)

- **Time-to-first-app** → Bolt.new wins, by design.
- **Non-technical CRM-builders** → Base44 wins.
- **Senior-dev-replaces-IDE** → Cursor wins.
- **"Hire an AI engineer"** → Devin owns that marketing-territory. We refuse it; it is the most didactically-toxic promise in the market.

We will be the slowest-to-app, deepest-in-control, most-explainable, only-one-with-real-asset-pipeline tool in the category. That is the position.

## 12. Existential risks (acknowledged, not solved)

| Risk | Mitigation in our power | Residual |
|---|---|---|
| **Anthropic ships a first-party "Claude Studio" / Claude Projects v2** | Be the open-source reference implementation, fast. Own the dataset shape (PartyEvent format). Be the thing they study, not the thing they replace. Ship V2.5 before Q3 2026. | High. Cannot fully neutralize. |
| **EU AI Act liability (Aug 2026 enforcement)** | 5–10K€ lawyer review pre-V2.5; transparency-by-construction (PartyEvent log = audit trail) is our defense. Position log-completeness as compliance feature. | Moderate. Requires legal spend. |
| **Solo-dev burnout cascade ~Month 8** | Each release independently shippable; pre-defined "if I disappear for 4 weeks, everything still works" checkpoints. V2.5 timeline padded to 12 weeks. | Real. Discipline-dependent. |
| **Market wants less process, not more** | Brownfield mode keeps us viable for the existing market. Greenfield is the bet on the underserved B2B segment. Autopilot lowers the process-cost for users who want speed-with-control. | Moderate. Brownfield is our safety net. |
| **Asset-pipeline cost explodes (Seedance-2 video pricing)** | Video generation is opt-in V3.5, behind explicit budget gate. Image generation cached aggressively. Video model behind a provider-abstraction. | Moderate. Pricing-dependent on external providers. |
| **Custom-Agent prompt-injection vector** | Custom agents run sandboxed; cannot read other Projects; explicit `tools: []` allow-list in agent definition. Audited input. | Moderate. Standard SDK-agent risk. |
| **Infra-provider vendor concentration (Railway + Cloudflare + Daytona)** | BYOK-for-infra: user can bring own Railway token / CF API key / Daytona account (same AES-GCM flow as LLM-BYOK from V2.0). Managed-default (PatchParty-hosted) vs BYOK opt-in, per-project selectable. Region-pinning hard-enforced at project level (no silent cross-region replication). Provider-abstraction at the Saga layer so a future 4th target (Fly.io, AWS) is replaceable, not a rewrite. | Real. Three-provider dependence is the cost of the one-session-to-production claim; mitigation is explicit, not eliminated. |
| **Railway / Cloudflare / Daytona API outage blocks Repo-Genesis** | Saga pattern with compensating rollback — partial failure leaves no orphaned resources. User-visible retry with provider-status badge. Graceful degradation: if Daytona down, fall back to local-sandbox or defer Repo-Genesis to a resume-queue. | Moderate. Shared fate with three providers; failure-mode audited in `11-deployment-infra.md` §11. |
| **Cross-region data leak via misconfigured `railway link`** | Region-check guard runs before every `railway up`: project `region` field must match destination service region. Hard-block with actionable error if mismatch detected. GDPR audit trail via `deploy.*` PartyEvents. | Low. Engineering control, not dependent on third-party behavior. |

## 13. Three Non-Negotiables (must ship before Greenfield public launch)

1. **Budget-Governor with Hard-Cap.** A user must not be able to wake up to a $400 bill. Hard-cap halts spend; soft-watermarks warn early; Autopilot _requires_ a budget set.
2. **Demo-Mode Replay <90s.** Anyone landing on `/studio/demo` must see a complete Greenfield run play back from a recorded PartyEvent stream in under 90 seconds. This is the marketing surface; it must always work.
3. **GitHub-App, not OAuth-App.** Repo-Genesis must run under a proper GitHub-App with scoped permissions per-installation. OAuth-App `repo`-scope is a security and compliance dead-end for B2B.

## 14. Roadmap (sequenced, not concurrent)

| Release | Window | Scope | Sellable promise |
|---|---|---|---|
| **v2.0** (in flight, 6 wks) | now → +6 wks | Brownfield hardened. Telemetry pipeline + chat-iterate + BYOK + sandbox-lifecycle. | "5 takes per PR." |
| **v2.5 — Greenfield Foundation** (12 wks) | +6 → +18 wks | Phase 2 (Stories-RACE) + Phase 4 (Stack linear, 1 default template) + Phase 5 (Repo-Genesis Saga: GitHub-App + **Railway project** + **Cloudflare DNS-only** + Daytona race-sandbox, **managed-mode only; BYOK-for-Infra deferred V4.0**) + Phase 8 MVP (`railway up` deploy, no canary). `Project` stores region preference (best-effort; GDPR contractual work parked for V4.0). **Anthropic-only.** Budget-Governor v1 (soft+hard-cap with cancellation semantics per Red-Team 07-F3). Demo-Mode-Replay <90s. Legal-work blocker: DPA template for data-subject-right handling. | "Brief to best-effort-deployed PR in one sitting." |
| **v2.7 — Stack-RACE + Templates** (4 wks) | +18 → +22 wks | Phase 4 becomes RACE 5 with 3–5 stack-templates. | "Five architectures, you pick." |
| **v3.0 — Multimodal + Loser-UX + Custom Agents (reduced) + Image-Assets + Canary-Release + Preview-Envs + Autopilot Advisor** (10 wks) | +22 → +32 wks | Phase 1 (Brief-clarification with PDF/transcript/Loom) + Loser-branch UX (timeline scrubber, branch-from-here) + **Custom Agents reduced**: persona-DSL + 5-base-personas + Composition + `read_file` / `search_code` / `apply_codemod` (no `run_command`, no `fetch_url`, no cross-user sharing — all V4.0) + Wireframe-image generation + **Cloudflare Workers canary-split** (Phase 8) + **Daytona preview-envs per PR-branch** (CF-Access gated, 7d TTL) + **Autopilot Advisor** (Composite-Score shown advisory; FSM stops at Judging; Aggressive-auto-advance KILLED) + Deep-Iterate V3.0 (R1 critique + per-flaw patch-suggestion; no R2/R3). | "Bring any brief; compose your own persona-squad; preview every PR at a real URL." |
| **v3.5 — Quality + Blue-Green + Pro-Tier Video + Dev-Envs** (6 wks) | +32 → +38 wks | Phase 7 (Quality squads), Phase 8 Blue-Green (DNS-swap with explicit TTL-propagation-gate), opt-in Wireframe-race, **Seedance-2 video behind Pro-tier + per-project fleet-cap** (2 videos/month default), **Daytona VS-Code-in-browser dev-envs**. Pattern-mining starts (≥3k projects). Multi-region Railway option deferred to V4.0 (needs paid SRE to operate honestly). | "Ship-ready, with a demo-video, in a day." |
| **v4.0 — Autopilot FULL graduation + OpenRouter + BYOK-for-Infra + SOC-2 engagement + Deep-Iterate Triadic + Custom-Agent Sharing + CF Pages + Multi-Region** (TBD) | +38 wks → ... | Full Autopilot (hard-cap cancellation + append-only audit chain + zero-hole cliff catalogue + 90d calibrated Composite-Score); OpenRouter for genuine instrument-diversity on Deep-Iterate R2 critics; Deep-Iterate triadic R1+R2+R3 (only if per-variant selection-rate data justifies); Custom-Agent sharing with ed25519-signing + revocation; BYOK-for-Infra (Railway + CF + Daytona); Multi-region Railway with contractual data-residency; CF Pages for marketing/docs; SOC-2 Type-1 audit engagement begins (~€30K, funded by paid customers). | "Set the budget; check in after lunch." |

**Never on the roadmap:** standalone wireframe-tool, public marketplace, fully-autonomous-no-human ship mode, Pro/Newbie toggle, agent-as-a-service product.

## 15. Single-Message Marketing Strategy

V2.0 launches with **one message:** "Five Takes per PR. Pick the One You Ship." Greenfield does not exist publicly until V2.5 ships and the Demo-Mode-Replay is bulletproof. We do not pre-announce Greenfield; pre-announcement invites Anthropic / Vercel / a16z-funded startup to copy the pitch and ship faster.

V2.5 launches with **one message:** "From Brief to Repo, with Five Takes at Every Decision." Autopilot is an opt-in mode mentioned in the docs, not on the homepage. Autopilot homepage-pitch waits for V4.0 when it's a polished story.

V3.0 launches with **one message:** "Build your own squad." Custom-Agents are the wedge into the agent-orchestration discourse — reframed post-triage as a **persona DSL**, not an "agent platform" or "agent marketplace". Sharing is manual file-based; the product is composition, not distribution. Flagship-infrastructure-claims ("international-standard", "99.9% SLA", "SOC-2-ready", "HARD GDPR region-pinning") are **NOT** used in V3.0 marketing; they earn their way back in V4.0 only via shipped certificates + measured uptime + contracted tiers.

## 16. Open Questions (need answers before v2.5 plan)

1. **Brief-normalization across verticals.** A German Mittelstand brief vs. a US-SaaS brief are structurally different. What are the 5 axes of the Story-race, and do they generalize? Need a 50–100 brief eval-set before locking the schema.
2. ~~**Loser-branch GC under GDPR / customer compliance.**~~ **CLOSED by triage 2026-04-18 (see `12-triage-decisions.md` Q11):** tiered GC policy — Tier A (ADR-cited) pinned-forever, Tier B (uncited race-losers) 90d default user-configurable, Tier C (re-rolls/sandbox-ephemera) 7d. User DSR erasure deletes all tiers with ADR-text-redaction and hash-chain-continuity preserved via deletion-event-in-chain.
3. **Quality-pass conflict resolution.** When a11y-fix and sec-fix collide on the same file, sequential (deterministic, slow) or parallel-with-merge-race (fast, chaotic)? Default sequential.
4. **GitHub-App scope and naming.** Three permissions tiers (read-only / read+create-repo / full); naming is brand-load-bearing. Round 3 Squad C decides.
5. **Pricing model under Greenfield.** Per-Project flat (e.g. $19), pay-as-you-go BYOK, or hosted-with-platform-margin? Round 3 Squad C decides.
6. **Branding split.** "PatchParty" as umbrella with "Studio" as Greenfield product line, OR "PatchParty" everywhere and "Greenfield" / "Brownfield" as modes? Round 3 Squad C decides.
7. ~~**Asset-pipeline storage.**~~ **CLOSED by Squad G + triage Q10:** three-tier storage (POSTGRES_INLINE ≤64KB text / R2 for binary / GIT_TRACKED for ADRs + SVG opt-in with 1MB cap). **Cross-tenant content-addressed dedup DISABLED** (triage Q10) — accept 5-15% R2 cost penalty for GDPR Art. 17 compliance; per-tenant namespaces via HMAC-salt-prefix.
8. **Autopilot intervention-policy schema.** What's the user-defined config for "page me at"? YAML/JSON DSL or pre-baked templates ("Conservative / Balanced / Aggressive")? Round 3 Squad F decides.

## 17. Handoff (what the next session / next agent reads first)

Drop a fresh agent into this folder. They should read in order:

1. `00-vision.md` (this file) — strategic frame
2. `../v2.0-chat-iterate/README.md` — current foundation
3. `../v2.0-chat-iterate/01-telemetry-pipeline.md` — the event-schema everything else generalizes from
4. `01-data-model.md` — `Project`, `RaceRun`, `RaceCandidate`, `EditOverlay`, `LoserBranch`, `Asset`, `CustomAgent` Prisma additions + ADR-001…007
5. `03-studio-ux.md` — three-pillar layout, timeline scrubber, microcopy spec
6. `04-positioning.md` — branding, pricing, naming split decision
7. `05-custom-agents.md` — agent-definition DSL, sharing model, sandbox/permission model
8. `06-market-analysis.md` — competitive landscape April 2026
9. `07-autopilot-mode.md` — budget-governor, intervention-policy, AC-fit-score, Paperclip-AI failure modes audited (10-way), 31-entry reversibility-cliff catalogue, 9-state FSM, YAML Intervention-Policy DSL
10. `08-asset-pipeline.md` — 8-type asset catalogue, generator picks (GPT-image-1 / Recraft v3 / Seedance-2), Cloudflare R2, content-addressed keys, auto-ADR generation, wireframe prompt templates
11. `09-deep-iterate.md` — Triadic R1/R2/R3 pattern, verbatim EN+DE prompt skeletons, worked Stack-Pick example, three presets (Light/Standard/Intensive), Inspector "Harden" UX
12. `11-deployment-infra.md` — **THREE-LAYER INFRA**: Railway (prod) + Cloudflare (edge/DNS/CDN/WAF/Workers/R2/Access/Pages) + Daytona (sandbox/preview/dev). Release-race configs (Canary/Blue-Green/Big-Bang), Repo-Genesis Saga with compensating rollback, region-pinning for GDPR, BYOK-for-infra, ADR-008 three-layer decision, international-standard checklist (10 items). **Load-bearing — this is what makes Studio "one session to production-URL".**

**Status of this concept:** v3.0-draft. Survives Red-Team rounds 1 + 2. Round 3 squad deliverables (A–I, nine specs) on disk. Awaiting Round 3b Red-Team hardening on each squad output + consolidation into single Concept-v3.0 master.
