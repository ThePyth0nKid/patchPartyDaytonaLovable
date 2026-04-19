# 04 — Positioning, Naming, Pricing

**Squad C, Round 3. Concept v3.0-Studio. 2026-04-18.**

**Status:** Decision document. Opinionated. Resolves open questions Q4, Q5, Q6 from `00-vision.md §16`. Every recommendation is a single pick with rationale; fallbacks named only where the primary pick has a non-trivial failure mode.

**Scope of authority:** brand architecture, pricing model, launch messaging, homepage copy (V2.0 + V2.5), competitive map, naming of the 7 load-bearing product nouns, taglines with scores, risks forwarded to Round 4.

**Non-scope:** GitHub-App permission tier naming (that is Squad D, not us). Asset-storage format (Squad G). Autopilot intervention-policy DSL (Squad F).

---

## 1. Brand architecture decision

### The question, restated

V2.0 ships as "PatchParty" — a Brownfield developer tool with a playful name, a hackday lineage, and a one-line pitch ("Five Takes per PR"). V2.5+ introduces Greenfield: a full brief-to-repo production studio with three buyer segments, one of whom is an agency founder spending €40 of budget to build a B2B prototype. Two things are true at once:

1. "PatchParty" is already earned equity — the repo, the Factory Berlin hackday lineage, the domain, the landing page, the community. Throwing it away is expensive.
2. "PatchParty" is a _bad B2B name._ A CTO evaluating a €2,500/month production-studio subscription does not want to send "we build on PatchParty" to a procurement committee. The name sounds like a Slack-prank plugin.

### Three architectures considered

**Option A — Single-brand.** Everything is "PatchParty". Brownfield is PatchParty; Greenfield is PatchParty; the pricing page has two tiers. Pro: simple, zero migration cost, community equity intact. Con: the B2B sale stalls because the brand feels unserious at the exact moment the buyer is evaluating seriousness.

**Option B — Full rebrand to "Studio".** Ditch PatchParty entirely, relaunch as "Studio" or "Patchstudio" or "Production". Pro: clean B2B story. Con: throws away earned equity, re-bootstraps community, and "Studio" is a generic word already crowded (Android Studio, RStudio, GitHub Studio Lab, Suno Studio, Runway Studio, Pika Studio). We would spend a year explaining who we are.

**Option C — Umbrella + sub-brand.** `PatchParty` is the umbrella / organization. `PatchParty Studio` is the Greenfield product line. Brownfield stays as "PatchParty" (or becomes "PatchParty PR" as a retronym). The org is `PatchParty`; the product people pay for is `PatchParty Studio`. Community-facing GitHub org stays `patchparty`; B2B-facing SaaS surface is `studio.patchparty.dev` or `patchparty.studio`.

### Recommendation: Option C (Umbrella + Studio sub-brand)

**Pick: `PatchParty` umbrella, `PatchParty Studio` for the Greenfield product line.**

- Brownfield V2.0 stays "PatchParty" verbatim. No change. "5 Takes per PR" launches as-is.
- Greenfield V2.5+ is "PatchParty Studio" — always written out in full in pitch surfaces. Internal shorthand can be "Studio". The tagline-level mention is "PatchParty Studio" (two words); the product-name-in-sentence is "the Studio" (Final Cut Pro parallel — "open it in the Studio").
- The org on GitHub is `patchparty`. The Brownfield repo stays `patchPartyDaytonaLovable` (rename later, not now — stable URL > cute name). A new repo for Studio-specific code, if and when the split is warranted, is `patchparty/studio`.
- The Ultranova-hosted tier is "PatchParty Cloud" (or just "hosted on PatchParty") — not a third brand. Ultranova is the operating entity in the footer only.

**Rationale.** This preserves earned equity AND separates the pitch surface. A hackathon dev looking at the Brownfield V2.0 landing page sees "PatchParty — Five Takes per PR" and feels at home. A founder evaluating the Greenfield V2.5 Studio page sees "PatchParty Studio — Brief to Repo, Five Takes at Every Decision" and can forward the URL to their lead engineer without cringing. The shared root brand lets the Brownfield community carry the Studio launch (they trust us already). The sub-brand lets the Studio have its own pricing, its own procurement-friendly name, its own case-studies, without fragmenting the dev-tool identity.

**What this is NOT.** Not a silo. Same codebase. Same login. Same Prisma schema. `Project` (Greenfield root) and `Party` (Brownfield race) both live in the same database. The split is marketing-surface only.

### Domain availability — assessed

- `patchparty.dev` — **already owned by us.** This stays the primary. Brownfield lives at root. Studio lives at `/studio` for now.
- `patchparty.studio` — recommend registering **immediately** (not urgent, but $29/yr is a rounding error). Route to `patchparty.dev/studio` via 301. Reserve for the case where Studio outgrows the Brownfield homepage and deserves its own front door at V3.0.
- `studio.patchparty.dev` — available as a subdomain (we own the apex), zero cost. Use for V2.5 launch: the Greenfield pitch page lives here, the Brownfield page stays at apex.
- `patchparty.com` — check ownership. If available under $5K, buy it and redirect to `.dev`. If owned by a squatter or in-use for an unrelated project, do not pursue — "PatchParty.dev" is fine for a dev-tool and buyers accept `.dev` in 2026.
- `patchparty.io` — check. Nice-to-have, not must-have.
- `getpatchparty.com` / `trypatchparty.com` — not needed. We are not selling to people who bounce on `.dev`.

**Action for Round 4:** DNS / trademark / company-name check (see §10 risks).

### The Final Cut Pro parallel, checked

Nelson's load-bearing metaphor is "Final Cut Pro for software production." Apple's brand architecture is:

- "Apple" (umbrella)
- "Final Cut Pro" (product line)
- "Final Cut Camera" (companion product)
- "Motion" (adjacent product)
- "Compressor" (adjacent product)

This is exactly Option C. PatchParty = Apple. PatchParty Studio = Final Cut Pro. PatchParty PR (Brownfield) = Final Cut Camera companion. Future products (Custom Agents SDK, say) become siblings under the umbrella. The architecture scales for 5 years without a rebrand.

---

## 2. Target-segment pitch decks

Three buyers. Three pitches. One product. Each deck is one page — the thing a sales rep (us, for now) sends as a link or reads verbatim to land a conversation.

### Deck A — Brownfield-dev

**Who they are.** A senior or staff engineer at a product company, an agency dev billing by the hour, a hackathon winner with a day job. Ships one-to-ten PRs per week. Uses Cursor Composer or Claude Code for "five takes on one ticket" already — ad-hoc, in-terminal, without version-control of the alternatives. Budget: discretionary, $20–$80/month out of pocket, or expensed as dev-tooling.

**What they buy.** A faster, more structured version of what they already do. Five specialist agents race on one GitHub issue in parallel, deliver real diffs in sandboxes, and surface the trade-offs in a scrubbable Inspector. The PR is theirs; they pick, they edit, they ship.

**The pitch, verbatim.** _"You are already asking Claude for five versions of a bugfix. PatchParty makes that a first-class workflow. Pick a GitHub issue, five specialists race in parallel sandboxes, you pick the diff you would ship. ~50¢ per party, PR opens in under 30 minutes, every loser-branch is kept so you can come back to it. Bring your own Anthropic key or let us absorb the cost."_

**What they pay.** Free self-hosted (MIT, bring-your-own-keys). Hosted: $0 to start, usage-based pay-as-you-go at ~50¢ / party absorbed cost, or flat $19/month for up to 100 parties. No seat pricing; this is a single-player tool.

**What they do NOT buy from us.** IDE replacement. Inline autocomplete. Code review of existing PRs (they use CodeRabbit for that, or nothing). Anything multi-repo. Anything ticket-management. Brief-clarification.

**Anti-objections.** (a) "I already have Cursor." Answer: keep it — PatchParty is the pre-Cursor step (five alternatives), Cursor is the post-pick step (edit the winner). (b) "Opus is expensive." Answer: ~50¢ per party is cheaper than 15 minutes of your hourly rate. (c) "What if all five look the same?" Answer: Diversity-Judge re-rolls convergent candidates; personas are built adversarially by design.

### Deck B — Greenfield-Director (agency founder / solo builder with a brief)

**Who they are.** Founder-engineer at a pre-seed / seed B2B SaaS. Agency principal billing $150–$250/hr. Technical co-founder at a 2-person startup. They get briefs constantly — from customers, from investors, from their own Notion. They hate the first two weeks of a new project: the discovery thrash, the "do I use Next.js or Remix", the scaffolding ceremony, the "which auth library". They want to direct, not type.

**What they buy.** A full pipeline from brief to working repo, with 5 alternative-takes at every meaningful decision (Stories, Stack, Implementation), and the human picking the winner at each. They watch the Studio work. They intervene. They finish the day with a GitHub repo, a PR stream, an ADR log, and a Demo-Mode-replay of their own decision-making they can show a customer.

**The pitch, verbatim.** _"The next two weeks of a Greenfield project, compressed into one afternoon — with five takes at every decision, and you pick. Paste your brief. Five story-slicings race: MVP-lean, Feature-complete, Verticals, Journey-first, Risk-first. Pick one. Five stacks race. Pick one. A fresh GitHub repo appears, CI wired, first Stories implementing. Every loser-branch preserved. Every pick versioned. You are the director, not the typist. PatchParty Studio is the best agentic software-production studio that exists. Not the fastest. Not the easiest. The deepest."_

**What they pay.** Per-Project flat pricing: **$149 per Project (single Greenfield run, budget-capped, Anthropic cost absorbed)**, or BYOK at **$49/Project platform fee + their own Anthropic bill**. Pro tier for unlimited Projects + priority queue: **$299/month**. Agency tier with client-invite, branded handoff, and Custom Agents library sharing: **$1,490/month** (target: 5–10 agencies by V3.0).

**What they do NOT buy from us.** Ongoing hosting of their app (Railway/Vercel does that). Long-term code-ownership (they own the GitHub repo). CI/CD-as-a-service (GitHub Actions). Brief-writing (we structure, we don't author). Design system (we generate wireframes V3.0+, but we do not ship a Figma plugin). Customer support for their end-users.

**Anti-objections.** (a) "Lovable does this in 5 minutes." Answer: Lovable gives you one answer; we give you five at every decision, with the version history. You want Lovable for a Friday-night prototype; you want PatchParty Studio for a Monday-morning customer demo. (b) "$149 is a lot for one project." Answer: it's 45 minutes of your billable rate. Compare to two weeks of discovery. (c) "What if I don't like any of the five stacks?" Answer: re-race with your own constraints pinned; or define a Custom Stack-template (V2.7+) and that becomes the 6th.

### Deck C — Greenfield-Autopilot (founder / agency who wants budget-bounded build-and-intervene)

**Who they are.** Same demographic as Director, but with less time or more projects. They have a brief, they have €40, and they want to go to lunch. They want to be paged at reversibility-cliffs (DB migration, public API, deploy, security boundary) and not before. They want audit logs for compliance reasons (EU AI Act Aug 2026, SOC2 evidence). They want the human-in-the-loop story for their own customers.

**What they buy.** Director-mode with training wheels off. Set a budget, set an intervention-policy, hit Go. Studio races, picks via Diversity-Judge + AC-fit-score, commits. Pages at budget-watermark (50/75/90%) and at reversibility-cliffs. Never ships without human sign-off on the final PR.

**The pitch, verbatim (V2.5/V3.0 beta users only; public-facing wait for V4.0).** _"Set the budget. Define your page-me rules. Go to lunch. PatchParty Studio races, picks, commits. It pages you when it's about to migrate a database, ship a deploy, rotate a secret, or burn through 75% of your budget. You sign the final PR. Autopilot is Director-mode batched — direction is still the product, it's just asynchronous."_

**What they pay.** Autopilot is an **add-on mode**, not a separate SKU. Pricing identical to Greenfield-Director ($149/Project or $49+BYOK), plus Autopilot requires a budget set (€20 min, €200 default soft cap). No extra platform fee — the friction is the budget, not the invoice.

**What they do NOT buy from us.** Fully-autonomous ship-without-me. That is a product we refuse to build. See `00-vision.md §10 Anti-Features`.

**Anti-objections.** (a) "Isn't this just Devin?" Answer: Devin pretends to be an engineer; we pretend to be nothing — we are a budget-bounded race-engine with human sign-off at every reversibility-cliff. (b) "What if it burns my budget on bad races?" Answer: Hard-cap at 100%. In-flight races complete and persist as losers. No surprise bill. (c) "What if I disagree with a pick?" Answer: every Autopilot-pick is marked `AP` in the timeline; double-click any historical pick → branch-from-here. Every loser is preserved.

---

## 3. Pricing model matrix

### The four models evaluated

**Model 1 — Per-Project flat.** $149 per Greenfield Project. Includes absorbed Anthropic cost up to budget cap, Studio platform, repo-genesis via GitHub-App, 14-day replay-retention. **Pro:** simple, procurable, maps to how the buyer thinks ("I'm starting a project"). **Con:** one bad run (repeated re-races on a complex brief) eats our margin; we need a hard-cap inside the flat price to protect ourselves.

**Model 2 — Pay-as-you-go BYOK.** User brings their own Anthropic key; we charge a platform fee per Project ($49) and per agent-hour of sandbox ($0.10/min, capped). **Pro:** margin protected, aligns our incentive with efficient races, appeals to the technical buyer who already has enterprise Anthropic. **Con:** onboarding friction, key-management UX burden, and we lose the simplest pitch-line ("one price, one project").

**Model 3 — Hosted with platform margin.** Usage-based: $0.75 per Opus race call (we pay Anthropic ~$0.50, keep $0.25 margin), $0.05 per sandbox-minute. No flat fee. **Pro:** pure consumption, zero commitment. **Con:** every interaction has a price-tag visible to the user (good didactically) but anxiety-inducing at purchase time; procurement hates it; forecasting is hard for the buyer.

**Model 4 — Hybrid (recommended).** Subscription tier + metered overages + BYOK escape-hatch. See below.

### Anthropic cost-pass-through calc (typical Greenfield run, V2.5)

Budget assumption: Anthropic Opus 4.7 at $15 in / $75 out per 1M tokens; Haiku 4.5 at $1 in / $5 out; Sonnet 4.6 at $3 in / $15 out. Sandbox: Daytona at ~$0.008 / minute.

| Phase | Model | Calls | Avg tokens (in/out) | Cost per call | Phase cost |
|---|---|---|---|---|---|
| Brief Clarification (linear) | Sonnet | 2 | 4k / 2k | $0.04 | $0.08 |
| Stories (RACE 5) | Sonnet | 5 | 8k / 4k | $0.09 | **$0.45** |
| Stack (linear V2.5) | Opus | 1 | 6k / 3k | $0.32 | $0.32 |
| Repo-Genesis (linear) | Sonnet | 3 | 10k / 6k | $0.12 | $0.36 |
| Story-Implementation (RACE 5, ~3 stories) | Opus | 15 | 20k / 12k | $1.20 | **$18.00** |
| Diversity-Judge re-rolls (estimated 10% overhead) | Haiku + Opus | — | — | — | $1.80 |
| Sandbox (15 sandboxes × 4 min avg) | — | — | — | — | $0.48 |
| PartyEvent logging, Prisma I/O, etc. | — | — | — | — | ~$0.10 |
| **Typical Greenfield run total** | | | | | **~$21.60** |

**Range:** $14 (tiny MVP-lean, 2 stories) → $48 (complex Feature-complete, 5 stories, 2 Deep-Iterate rounds).

### Margin envelope under Model 4

For a $149/Project flat tier:

- Typical cost to us: $21.60
- Gross margin: **$127.40 (~85%)**
- Worst-case (hard-capped at $60 Anthropic + sandbox spend): **$89 (~60%)**
- Hard-cap halts at $60 of actual Anthropic spend per Project; user can top up explicitly or stop.

For the $49 + BYOK tier:

- Typical cost to us: **$0** (user pays Anthropic directly)
- Platform + sandbox + storage cost: ~$2
- Gross margin: **$47 (~96%)**

For the $299/month Pro tier (unlimited Projects, capped at 10/month fair-use):

- Typical usage: 3 Projects/month × $21.60 = $65
- Gross margin: **$234 (~78%)**
- Worst-case (fair-use ceiling 10 × $21.60): $216 → margin **$83 (~28%)**. Fair-use ceiling is our insurance.

### Recommendation: Model 4 (Hybrid) — tiered subscription + BYOK escape

**Primary pricing architecture for V2.5+:**

| Tier | Price | Who | Includes |
|---|---|---|---|
| **Free / self-host** | $0 | Hackers, OSS community, Brownfield users | Everything, MIT license, BYOK mandatory, no hosted features |
| **Brownfield Hosted** | $0 starter + $0.50/party absorbed OR $19/mo for 100 parties | Hackathon devs, single-player | Hosted race-engine, PR automation, Chat-Iterate, retained history |
| **Studio Per-Project** | $149 / Project | Greenfield-Director, one-off builders | Full Greenfield pipeline, hard-cap budget, 14-day replay-retention, GitHub-App repo-genesis |
| **Studio Per-Project BYOK** | $49 / Project + your Anthropic bill | Technical founders with their own Anthropic enterprise key | Same as above, you pay model cost directly |
| **Studio Pro** | $299 / month | Regulars, 2–5 Projects/month | Unlimited Projects (fair-use 10/mo), priority queue, 90-day retention, Custom Agents library |
| **Studio Agency** | $1,490 / month | Agencies, 3–5 seats, client-invite | Everything in Pro + seats, client-branded handoff, shared Custom Agents, SSO, SOC2 evidence, priority support |
| **Enterprise** | Contact | Eventually | On-prem / VPC, custom SSO, data-residency, contract SLA |

**Fallback if V2.5 launch pricing fails:** drop flat-price Per-Project from $149 → $79, and move the margin recovery to an overage surcharge when user exceeds $30 of Anthropic spend in a single Project. Communicated transparently via the always-visible Budget-Bar.

**Why this architecture wins:**

1. **Procurable.** A CTO can ask the finance team to approve $299/month without an RFP.
2. **Lowers barrier of first try.** $149 for a Project is a discretionary-budget decision ("one dinner, one prototype"), not a committee decision.
3. **Respects the BYOK crowd.** The technical buyer who already has an Anthropic enterprise contract can opt into BYOK and get a 67% discount on platform fees. That is the right behavior to incentivize — they save us cost, we save them money.
4. **Didactically honest.** Budget-Bar visible at every moment. Hard-cap defended. No surprise bills. Maps directly to `00-vision.md §5 Principle 7 (Budget-Governor)`.
5. **Matches the Final Cut Pro mental model.** Final Cut Pro is $299.99 one-time per Mac. Our $299/month is a rental analog; the Per-Project $149 is the "one-shot project" analog; the Agency tier is the seat-based shop-license analog.

**Pricing anchors vs. competition (assessed in §7 matrix):**

- **Lovable: $20/month starter, $50/month Pro.** We sit ABOVE this deliberately. We are not competing on "app per month"; we are selling production-studio time. Our "cheapest Greenfield" is still $49 + BYOK, which is 2.5× Lovable's starter. That is the price of doing it RIGHT, not fast.
- **Devin: $500/month.** We sit BELOW. Our $299/month Pro tier is ~60% of Devin's with a better story ("you direct, AI proposes" vs "AI engineer").
- **Cursor: $20/month Pro.** We sit ABOVE. Different category — Cursor is IDE, we are Studio. Comparison is not load-bearing.
- **Bolt/v0: $20/month.** Same as Lovable. Above us for time-to-first-app; we are above them for depth-of-control.

**Decision rule:** if a buyer ever compares our price directly to Lovable's $20, we have failed the pitch — they are buying the wrong category. The sales job is category-setting, not price-matching.

---

## 4. Single-Message Marketing Strategy (per release)

Per `00-vision.md §15`: one message per launch. Never pre-announce the next one publicly.

### V2.0 — launching now (in flight)

**Headline:** _"Five Takes per PR. Pick the One You Ship."_

**Sub-line:** _"Not one AI. Not one answer. Five specialists race on your GitHub issue in parallel sandboxes — you pick the diff you would ship."_

**Proof-points (three, on the homepage):**
1. _"~50¢ per party. Under 30 minutes end-to-end. Real diffs in real sandboxes, not chat."_
2. _"Open source under MIT. Self-host with your keys, or let us run it."_
3. _"Every loser-branch preserved. Come back to it. Branch from it. Never lost."_

**Where it lives:** `patchparty.dev` apex. Landing page as it exists today, with minor copy tightening (see §5).

### V2.5 — Greenfield launch (target: +18 weeks, summer 2026)

**Headline:** _"From Brief to Repo, with Five Takes at Every Decision."_

**Sub-line:** _"PatchParty Studio turns two weeks of discovery into an afternoon of directing. Paste your brief — five story-slicings race, five stacks race, five implementations per story race. You pick at every step. A fresh GitHub repo lands at the end."_

**Proof-points:**
1. _"Director of agents, not typist of prompts. You pick the angle; the studio produces the alternatives."_
2. _"Every decision versioned. Every loser-branch kept. Scrub the timeline, branch from any pick, ship the cut you chose."_
3. _"Budget-capped. Hard-capped. No surprise bills. See the price before every race."_

**Where it lives:** `studio.patchparty.dev` (new). Linked from `patchparty.dev` as a top-nav item "Studio →". Brownfield homepage stays the default root.

### V2.7 — Stack-RACE + Templates (target: +22 weeks)

**Headline:** _"Five Architectures. You Pick."_

**Sub-line:** _"Batteries-included, edge-native, enterprise, OSS-only, serverless-minimal — five architectural ideologies race on your brief. ADR-style. You pick the stack your future-self can defend."_

**Proof-points:**
1. _"Five stack-templates ship in V2.7, with ADR output for audit."_
2. _"Custom stack-templates in development — bring your own ideology."_
3. _"Every stack-pick versioned. Re-race with constraints at any time."_

### V3.0 — Custom Agents + Image-Assets + Brief-Multimodal (target: +32 weeks)

**Headline:** _"Build your own squad."_

**Sub-line:** _"Claude-Code-subagent-style personas, defined inline or shared as markdown. Compose squads per-Story-type. Your private squad library is the moat."_

**Proof-points:**
1. _"Define an agent in one paragraph. Save per-Project or globally. No marketplace, no middleman."_
2. _"Brief-clarification now accepts PDF, transcript, Loom, voice-memo. Multimodal in, structured Stories out."_
3. _"Wireframe-images generated from Stories. Real images, not ASCII. In your Bin, version-controlled."_

### V3.5 — Quality + Release + Video (target: +38 weeks)

**Headline:** _"Ship-Ready, With a Demo-Video, in a Day."_

**Sub-line:** _"Quality-pass squads for a11y, perf, sec, types. Release strategies (canary, blue-green, big-bang) you pick. Seedance-2 demo-video for customer-handoff. The full production-studio loop closes."_

**Proof-points:**
1. _"Specialist quality squads fix single-best, not race-five. Correct tool for correct phase."_
2. _"Release strategy picked by you, deployed by your repo's GitHub Actions."_
3. _"Seedance-2 demo-video in your Bin. Hand it to your customer with the PR."_

### V4.0 — Autopilot graduation + OpenRouter (target: TBD)

**Headline:** _"Set the budget. Check in after lunch."_

**Sub-line:** _"Autopilot graduates to the homepage. Budget-bounded. Paged at reversibility-cliffs. Human signs the final PR. Always."_

**Proof-points:**
1. _"Budget is the contract. Hard-cap is the insurance. No surprise bills, ever."_
2. _"Reversibility-cliff detection pages you before DB migration, deploy, secret-rotation, or public-API change."_
3. _"OpenRouter optional for multi-provider cost routing. Anthropic remains default for race-quality."_

---

## 5. Homepage copy draft — V2.0 launch (verbatim)

### Hero

> **Five patches. One click. Zero AI slop.**
>
> In 2026, 46% of code is AI-written — and those PRs carry 1.7× more bugs. The bottleneck isn't generation anymore. It's selection.
>
> PatchParty gives you five. Not five generalists — five specialists matched to your issue, in parallel, in sandboxes, in under three minutes. You pick the winner.

(Unchanged from current landing — it works.)

### Sub-hero trust-row

> Claude Opus 4.7 · Daytona Sandboxes · ~50¢ / party · Open source · MIT · Public & private repos

### Three-column value prop

**Column 1 — Alternatives, not answers.**
> _Every vibe-tool gives you one answer per prompt. You pick from a menu of one. PatchParty gives you five, and the five disagree on purpose. Diversity-Judge re-rolls the ones that look alike. You develop a comparison muscle you can't develop any other way._

**Column 2 — Sandboxes, not promises.**
> _Each agent runs in an ephemeral Daytona sandbox. Real diffs, real compile, real preview iframes. Nothing leaves until you pick a winner and click PR — then it's a normal GitHub pull request against a branch you can revert._

**Column 3 — Loser-branches, not regret.**
> _Every losing patch is kept. As a git branch if it's code, as JSON if it's not. Come back to it. Branch from it. Feed it to a re-race. The decisions you didn't pick are still yours._

### "How it works" — five steps

**Step 1 — Connect GitHub.**
> _Read access to issues. Push access only on branches we create. Nothing merges until you click._

**Step 2 — Pick an issue.**
> _From your backlog. Your existing repo. Your real work. No sandbox-demo issues unless you want them._

**Step 3 — Haiku classifies.**
> _Two seconds. Picks the right squad — Frontend, Backend, Security, Fullstack, Bug-Fix, Infrastructure, or Philosophy if it can't classify. Six squads of five specialists each._

**Step 4 — Five agents race.**
> _Parallel. In sandboxes. Claude Opus in the loop. Under three minutes for most parties. Live preview iframes. Cost-tag visible at every moment._

**Step 5 — You pick. We PR.**
> _Compare the five diffs. Scrub the live previews. Pick the winner. PatchParty opens the pull request on your GitHub, against a branch you control._

### FAQ (five questions)

**Q: How is this different from CodeRabbit?**
> _CodeRabbit reviews one PR that already exists. PatchParty generates five alternatives for you to choose from. One is a gate, the other is a menu. Different category._

**Q: What if all five agents write similar code?**
> _Every squad is built adversarially. The Frontend squad pits a Minimalist against a Motion designer; Security pits OWASP against Zero-Trust. Philosophy runs Hackfix against Defender. Diversity-Judge re-rolls any candidates that converge. Contradicting philosophies by design — the diffs diverge hard._

**Q: Does this scale cost-wise?**
> _Five Opus calls plus five sandbox-seconds lands around fifty cents per party. An order of magnitude cheaper than a senior engineer review — and the senior still picks._

**Q: Do I need to trust an AI with my repo?**
> _Each agent runs in an ephemeral Daytona sandbox, scoped to a shallow clone. Nothing leaves until you pick a winner and click PR — then it is a normal GitHub pull request against a branch you can revert._

**Q: Can I self-host this?**
> _Yes — the whole thing is MIT. Clone the repo, bring your own Anthropic and Daytona keys, deploy anywhere Next.js runs. Or skip the ops and use the hosted version we run — same code path, none of the wiring._

### CTA (closing)

> **Stop trusting one AI. Start choosing between five.**
>
> _Connect GitHub once. Pick an issue from your backlog. Watch five versions compile live, then pick the one you would ship._
>
> **[ Throw a party ]**

---

## 6. Homepage copy draft — V2.5 launch (verbatim)

**Note:** this page lives at `studio.patchparty.dev` OR at `patchparty.dev/studio` (deploy both; canonical via `<link rel="canonical">` to subdomain). Greenfield becomes public only when Demo-Mode-Replay is bulletproof per `00-vision.md §13.2`. Until then, this is a preview-only page behind an invite.

### Hero

> **From Brief to Repo.**
> **Five Takes at Every Decision.**
>
> _PatchParty Studio is a software-production studio in the spirit of Final Cut Pro. You direct. Squads of agents deliver alternative takes at every meaningful decision — story-slicing, stack, implementation. You pick, scrub, edit, branch, and ship an explainable PR._
>
> **[ Start a Project ]   [ Watch the 90-second Demo-Replay ]**

### Sub-hero trust-row

> Claude Opus 4.7 + Sonnet 4.6 · Anthropic-only · Daytona Sandboxes · GitHub-App · Budget-capped · Hard-capped · Audit-trail built-in · EU AI Act compliant-by-construction

### Three-column value prop

**Column 1 — Direction, not delegation.**
> _Vibe-tools teach you to delegate. You type a prompt; the AI "fixes it". PatchParty Studio teaches you to direct. Five story-slicings race — MVP-lean, Feature-complete, Verticals, Journey-first, Risk-first — you pick the angle. Five stacks race. Five implementations race. You direct; the studio produces._

**Column 2 — Every decision versioned.**
> _Each phase is a branch. Each pick is a commit. Loser-branches persist — `losers/genesis-3`, `losers/story-7-c`. Scrub the timeline. Double-click any historical pick to branch from there. No decision is thrown away. The `git log` after a run reads like a design document._

**Column 3 — Budget is the contract.**
> _Every race has a cost-tag before you commit. Soft-watermarks at 50/75/90% of your budget. Hard-cap halts new races at 100%. No surprise bills. No "credit-system" misdirection. Autopilot-mode requires a budget; Director-mode always shows the running cost._

### "How it works" — five steps

**Step 1 — Paste the brief.**
> _Text for V2.5. PDF, transcript, Loom, and voice-memo in V3.0. Sonnet normalizes it into a ProblemStatement. Clarifying-questions thread for the ambiguous parts. No lock-in until you approve the structure._

**Step 2 — Stories race (5 angles).**
> _Five slicing philosophies: MVP-lean, Feature-complete, Verticals, Journey-first, Risk-first. Each proposes 3–12 stories with acceptance criteria. You pick the angle. Losers persist as JSON — you can pull any individual story from a loser-branch into the winner._

**Step 3 — Stack + Repo-Genesis.**
> _V2.5: one default stack (Next.js + Postgres + Tailwind + shadcn), opinionated, with "show-alternatives" for the curious. V2.7: five stacks race — Batteries-included, Edge-native, Enterprise, OSS-only, Serverless-minimal. Repo-Genesis creates a fresh GitHub repo under our GitHub-App, pushes the scaffold, wires CI/CD._

**Step 4 — Story-Implementation (5 takes per Story).**
> _Five persona-specialists race on each Story. Real sandboxes. Real diffs. Chat-Iterate in the winner's sandbox. Optional Deep-Iterate: pick a candidate, then run Red Team / Green Team / Synthesis rounds on it. Breadth from race, depth from Deep-Iterate._

**Step 5 — Quality, Release, Demo-Video.**
> _V3.5: Quality-pass squads (a11y, perf, security, types) fix single-best. Release strategy picked by you (canary / blue-green / big-bang). Seedance-2 demo-video in your Bin. You hand the PR and the demo-video to your customer on the same day._

### FAQ (five questions)

**Q: How is PatchParty Studio different from Lovable / Bolt / v0?**
> _They optimize for time-to-first-app. We optimize for depth-of-decision. They give you one answer; we give you five at every juncture. Their output is a snapshot; ours is a version-controlled GitHub repo with ADR trail. They are Friday-night prototyping; we are Monday-morning customer demo._

**Q: Is this Devin?**
> _No. Devin pretends to be an engineer. We pretend to be nothing — we are a budget-bounded race-engine where YOU direct. Autopilot-mode exists, budget-capped, with human sign-off on the final PR always. We refuse the "hire an AI engineer" framing because it's didactically toxic._

**Q: What does a Project cost?**
> _$149 flat per Project on our hosted tier, including Anthropic cost up to a $60 hard-cap. $49 + BYOK if you bring your own Anthropic key. $299/month for unlimited Projects (fair-use 10/month). $1,490/month for agencies with client-branded handoff. All tiers include the full pipeline — no features gated by price._

**Q: What if I hate the picks?**
> _Re-race any phase with constraints pinned. Edit the winner non-destructively (EditOverlay keeps the original immutable). Scrub the timeline and branch from any historical pick. Skip any phase (with a visible historical penalty) to go faster. You are always the director._

**Q: Can I self-host the Studio?**
> _Yes — MIT license, same as Brownfield. You lose the hosted Demo-Mode-Replay surface and the managed GitHub-App; everything else runs. Bring your own Anthropic key, Daytona key, GitHub-App registration. On-prem / VPC is an Enterprise-tier conversation._

### CTA (closing)

> **Be the director, not the typist.**
>
> _The best agentic software-development studio that exists. Not the fastest. Not the easiest. The deepest._
>
> **[ Start a Project — $149 ]   [ $49 + BYOK ]   [ See Pro plans ]**

---

## 7. Competitive positioning — 2×2 matrices

Six competitors placed against us on four axes. `PP` = PatchParty (Brownfield V2.0). `PPS` = PatchParty Studio (Greenfield V2.5+).

### Matrix A — Speed vs. Control

```
                      HIGH CONTROL
                           ▲
                           │
          Cursor ●         │         ● PPS  (PatchParty Studio)
          Claude Code ●    │         ● PP   (PatchParty Brownfield)
                           │
                           │    ● Devin (claims control, delivers delegation)
         ──────────────────┼──────────────────►
                           │                 HIGH SPEED
                           │   ● v0
                           │   ● Bolt
                           │   ● Lovable
                           │   ● Base44
                           ▼
                      LOW CONTROL
```

**Placement rationale.** PP / PPS live in the top-right: high control AND decent speed (under 30 min Brownfield, one afternoon Greenfield). Cursor is high-control but low-speed (manual editing). Lovable / Bolt / v0 / Base44 are low-control high-speed. Devin positions as high-control but delivers low-control (the user can't reliably intervene mid-run).

### Matrix B — Agency vs. Individual

```
                         TEAM / AGENCY BUYER
                                ▲
                                │    ● PPS (V3.0+: agency tier, client-invite)
                                │    ● Devin (pitches to enterprise)
                                │
                                │    ● Cursor (team plans exist)
                                │    ● Claude Code (enterprise anthropic)
         ───────────────────────┼───────────────────────►
                                │                        INDIVIDUAL / SOLO
                                │    ● PP (Brownfield solo)
                                │    ● Lovable
                                │    ● Bolt
                                │    ● v0
                                │    ● Base44
                                ▼
                         HOBBYIST ONLY
```

**Placement rationale.** PPS is the clearest agency-tier play in the Greenfield race (Lovable/Bolt are solo-tools with no client-handoff story). Devin is the agency competitor — we beat them on price and on didactic-positioning. Brownfield PP lives in the solo-engineer quadrant with Lovable etc., but differentiates on the control axis.

### Matrix C — Greenfield vs. Brownfield

```
                        GREENFIELD STRENGTH
                                ▲
                                │
                                │          ● PPS
                                │    ● Lovable
                                │    ● Bolt
                                │    ● v0
                                │    ● Base44
                                │    ● Devin
         ───────────────────────┼───────────────────────►
                                │                        BROWNFIELD STRENGTH
                                │
                                │                    ● PP
                                │                    ● Cursor
                                │                    ● Claude Code
                                │                    ● CodeRabbit (pure review)
                                ▼
                       WEAK ON BOTH
```

**Placement rationale.** PatchParty (umbrella) is the only brand that is strong on BOTH axes simultaneously — PP for Brownfield, PPS for Greenfield, sharing a codebase and race-engine. This is why Option C brand architecture (umbrella + Studio sub-brand) wins — we occupy a position no competitor occupies.

### Matrix D — Price vs. Depth

```
                             HIGH DEPTH
                                ▲
                                │
                                │            ● PPS ($149/project, $299/mo)
                                │
                                │        ● PP ($19/mo or $0.50/party)
                                │
                                │                         ● Devin ($500/mo)
                                │
                                │    ● Cursor ($20/mo)
         ───────────────────────┼───────────────────────►
                                │                         HIGH PRICE
                                │    ● Lovable ($20/mo)
                                │    ● Bolt ($20/mo)
                                │    ● v0 ($20/mo)
                                │    ● Base44 ($29/mo)
                                │    ● Claude Code ($20/mo Pro)
                                ▼
                             LOW DEPTH
```

**Placement rationale.** Devin is the only competitor above us on price. Everyone else sits at the $20/mo anchor — they compete on low-price-low-depth. We sit in the high-depth corridor: Brownfield at mid-price, Studio at upper-mid-price. Nobody occupies "high-depth + low-price" because the economics don't work at Anthropic's rate-card.

---

## 8. Naming decisions (seven load-bearing nouns)

### 1. "Project" — keep, with qualifier

**Question:** is "Project" the right user-facing word for the Greenfield root entity? Or is "Production" better (per the Final Cut Pro metaphor)?

**Decision: keep "Project".** "Production" is theoretically purer but operationally weird — "Start a new Production" reads as a film-school exercise. "Project" is how every founder already talks about their work. The metaphor is carried by the Studio word ("Start a Project in the Studio"), not by the noun itself. Final Cut Pro also uses "Project" as the root object — the metaphor holds.

**Ruling:** `Project` in Prisma, "Project" in UI, "a Project" in copy. Uppercase as a product-noun.

### 2. "RaceRun" — RENAME to "Take" for user-facing; keep internally

**Question:** is "RaceRun" the right user-facing word?

**Decision: user-facing word is "Take".** "RaceRun" is an engineering noun — fine in Prisma, fine in PartyEvent logs, wrong on a button. "Take" is the Final Cut Pro word and it carries: "five takes on one Story", "Deep-Iterate this take", "scrub through the takes". Internal name stays `RaceRun` (don't migrate the schema). Public name is "Take".

**UI strings:**
- "Stage" (the 5-take display area) stays "Stage".
- Button: "Pick this Take" (not "Pick this Candidate").
- Tagline: "Five Takes per PR" (already the V2.0 message, validates the choice).

### 3. "Deep-Iterate" — RENAME to "Harden" for user-facing

**Question:** is "Deep-Iterate" the buyer-visible name for the multi-round adversarial mechanic in `00-vision.md §5 Principle 8`?

**Decision: user-facing word is "Harden".** "Deep-Iterate" is an engineering noun — it describes the mechanism, not the value. "Harden" describes what the user gets: a tougher, more-defended artifact. Internal name `DeepIterate` stays in code. Public name is "Harden this Take" / "Run a Harden pass" / "Hardened by Red Team".

**UI strings:**
- Button next to "Pick": "Harden".
- Round naming: "Red Team", "Green Team", "Synthesis" (already good in vision doc, keep).
- Microcopy: "Harden picks one Take and beats it up. Red Team attacks. Green Team defends. You get the survivor, version-stamped."

**Fallback name considered:** "Drill". Rejected — too martial. "Harden" is right.

### 4. "Autopilot" vs. "Director" mode naming

**Question:** are these the right names?

**Decision: keep both.** "Director" as the default-mode name is load-bearing (it carries the metaphor, it carries the vision's market claim). "Autopilot" is the industry-standard word for budget-bounded autonomous operation and every B2B buyer instantly understands it. Resist the urge to invent a cuter name ("Co-Pilot", "Cruise", "Conductor") — all of those collide with existing products.

**UI strings:**
- Mode selector: "Director" (default) / "Autopilot" (opt-in, requires budget).
- Timeline commit-dot marker: `AP` badge for Autopilot-picks, nothing (clean) for Director-picks.
- Pitch copy: "Director (default): you wait at every decision." / "Autopilot (opt-in): budget-bounded, pages you at reversibility-cliffs, you sign the final PR."

### 5. "Studio" — keep as sub-brand; do not call it "the Editor"

**Question:** is "Studio" the right sub-brand word? Or is "Editor" or "Workshop" better?

**Decision: "Studio" wins.** "Editor" suggests a text-editor (collides with Cursor, VSCode, Vim). "Workshop" suggests craft-hobby (collides with Steam Workshop). "Studio" carries the Final Cut Pro metaphor directly, is already how Apple / Google / Microsoft name their creator products (Android Studio, GitHub Studio Lab, Suno Studio), and clarifies that we are a production-tool, not an IDE.

**Risk:** "Studio" is crowded. Mitigation: we say "PatchParty Studio" in full on every B2B surface. Never just "Studio" in marketing (OK internally).

### 6. "Bin" — keep as UI name

**Question:** `00-vision.md §6` calls the left panel "Bin" — is that intelligible to buyers?

**Decision: keep "Bin".** This is the Final Cut Pro word. Video editors know it instantly. Developers will learn it on first exposure (the tooltip "Assets & context. Pin any asset to make it part of every race." is enough). Changing it to "Assets" is generic; "Library" conflicts with npm/pip; "Bin" is distinctive and metaphor-anchored.

### 7. "PartyEvent" — stays engineer-facing only

**Question:** `PartyEvent` is the load-bearing event-schema name. Does it surface to users?

**Decision: no.** `PartyEvent` is a developer-API and internal-log name. User-facing name for the event stream is "Timeline" (what they see at the bottom of the Studio) and "Audit Log" (what compliance people export). `PartyEvent` stays in the schema, stays in the docs, stays in OSS-community materials. Never appears on a marketing surface.

### 8. Brownfield / Greenfield — keep as mode-names in docs, NOT on landing

**Question:** do we use the words "Brownfield" and "Greenfield" publicly?

**Decision: docs yes, landing no.** A Brownfield dev does not think of themselves as "a Brownfield user" — they think of themselves as someone with a GitHub issue. A Greenfield founder does not think of themselves as "a Greenfield user" — they think of themselves as someone with a brief. On the landing page, we address the user directly ("Pick an issue from your backlog" for Brownfield, "Paste your brief" for Greenfield). In docs and internal planning, Brownfield / Greenfield are fine (they are engineering nouns that describe the data-entry surface).

**UI strings:**
- V2.0 landing: "Pick an issue from your backlog."
- V2.5 landing: "Paste your brief."
- V2.5+ app home (signed-in): two cards, "Start from a GitHub issue" / "Start from a brief" — no jargon.

---

## 9. Taglines — 10 candidates, scored

Scoring rubric (1–5 on each axis, 20 max):
- **Cost-awareness** — does it imply budget/control?
- **Direction** — does it convey "human picks, AI proposes"?
- **Depth** — does it convey "we are the deepest"?
- **Distinctive** — does it avoid the Lovable/Bolt sentence-shape?

| # | Tagline | Cost | Direction | Depth | Distinctive | Total |
|---|---|---|---|---|---|---|
| 1 | _"Five Takes per PR. Pick the One You Ship."_ (V2.0) | 2 | 5 | 3 | 4 | **14** |
| 2 | _"From Brief to Repo, with Five Takes at Every Decision."_ (V2.5) | 3 | 5 | 4 | 4 | **16** |
| 3 | _"The best agentic software-production studio that exists."_ | 2 | 3 | 5 | 3 | 13 |
| 4 | _"Direct the agents. Ship the PR."_ | 2 | 5 | 3 | 4 | 14 |
| 5 | _"Generation is cheap. Selection is the product."_ | 3 | 4 | 4 | 5 | **16** |
| 6 | _"Five alternatives. One PR. Zero regret."_ | 3 | 4 | 3 | 3 | 13 |
| 7 | _"Not faster. Not easier. Deepest."_ | 2 | 3 | 5 | 5 | **15** |
| 8 | _"You are the director. The studio produces the alternatives."_ | 2 | 5 | 4 | 4 | **15** |
| 9 | _"Budget the race. Pick the winner. Ship the PR."_ | 5 | 5 | 3 | 4 | **17** |
| 10 | _"Final Cut Pro for software production."_ | 3 | 3 | 4 | 5 | **15** |

### Primary + fallbacks

**Primary (V2.5+ Studio):** _"Budget the race. Pick the winner. Ship the PR."_ (17/20)

Three verbs, three steps, cost/direction/shipping all present. Reads as an instruction, which is the right mood for B2B — "here's how to use it" is more durable than "here's why it's cool." Works as a subhead, a button cluster, a deck-title, a T-shirt.

**Fallback 1 (Greenfield-heavy pitch):** _"From Brief to Repo, with Five Takes at Every Decision."_ (16/20)

Use on the Studio homepage hero (§6). Explicit about the pipeline, explicit about the race-mechanic, respectful of the buyer's brief. Slightly long but declarative.

**Fallback 2 (cost-anxiety audiences):** _"Generation is cheap. Selection is the product."_ (16/20)

Use in skeptic-forums, Hacker News posts, conference talks. Names the market-truth we differentiate on. Not a homepage tagline; a positioning statement.

**Do NOT use:**
- _"The best agentic software-production studio that exists."_ — stays in `00-vision.md §vision`, but as a tagline it's overclaim-without-proof. Works in a pitch-deck when paired with demos; dies on a homepage where the visitor can't verify.
- _"Final Cut Pro for software production."_ — Apple will eventually send a letter. Use as a metaphor in copy, not as a tagline.

**V2.0 Brownfield tagline:** _"Five Takes per PR. Pick the One You Ship."_ — keep. It's the earned line, it works, don't change it just because we scored something higher on the Greenfield axis.

---

## 10. Risks and open questions for Round 4

### R1 — Brand-conflict check on "PatchParty"

**Risk.** The name "PatchParty" may already exist in our space. A quick mental audit raises three candidates:

1. **Open-source JS/game project.** "patch-party" / "patchparty" as npm package, GitHub org, or game-modding tool. Likelihood: moderate. Impact if collision: low-to-medium — namespace-crowded, not trademark-blocking.
2. **Video-game patch-party event (community gaming term).** "Patch party" is a slang term in some game communities for a group that gathers at patch-release. Impact: low — unrelated category, not trademark-blocking.
3. **Any prior trademark in software-development-tools class (USPTO class 9 or 42).** Likelihood: unknown. Impact if exists: HIGH — could force rename at V3.0 enterprise-expansion.

**Action for Round 4:**
- `gh search repos patchparty`, `npm view patchparty`, `pypi search patchparty` — quick collision check.
- USPTO TESS search for "PatchParty" in classes 9, 35, 42 — paralegal or $500 trademark-attorney review.
- EUIPO search for EU coverage.
- Domain whois for `patchparty.com`, `patchparty.io`, `patchparty.studio`.
- If trademark conflict found in a high-impact class: initiate rebrand discussion in Round 5 with 90-day lead-time before V2.5 public launch.

### R2 — Pricing anchor risk vs. Lovable's $20/mo and Devin's $500/mo

**Risk.** The $20/mo anchor is sticky. Buyers comparing our $149/Project to Lovable's $20/mo will category-confuse and bounce. Buyers comparing our $299/mo Pro to Devin's $500/mo will understand us as "cheap Devin" — which is the wrong frame (we are not an AI-engineer, we are a race-engine).

**Mitigation already built into the pitch:**
- Deck B explicitly names Lovable as a different category ("Friday-night prototyping").
- Deck C explicitly refuses the Devin framing ("we pretend to be nothing").
- Pricing copy on homepage names what's included at $149 (hard-cap, replay, GitHub-App, ADR trail) so the comparison has to be apples-to-apples.

**Residual risk.** HN/Reddit/Twitter commenters will still make the Lovable/Devin comparison in our first week. The fix is not pricing; the fix is a clean Demo-Mode-Replay that shows the 5-take depth in 90 seconds. Per `00-vision.md §13.2`, Demo-Mode-Replay is a non-negotiable — Round 4 must confirm this ships before V2.5 public launch.

**Action for Round 4:**
- Round 4 to confirm Demo-Mode-Replay is on the V2.5 critical path (not slip-to-V3.0).
- Round 4 to produce a one-paragraph "how to answer the Lovable-comparison question" for our own comms (ship in `docs/faq-for-skeptics.md`).

### R3 — Sub-brand dilution

**Risk.** "PatchParty Studio" may never achieve escape-velocity as a distinct brand if the community always calls it "PatchParty". We end up with Brownfield's positioning smothering Greenfield's.

**Mitigation:**
- From V2.5 day-one, the Studio pitch page lives at `studio.patchparty.dev` or `patchparty.studio`, not at the apex. Buyers navigate to a separate page.
- Case-studies and customer-logos (when we have them) always use "PatchParty Studio" in full.
- Brownfield pricing-page and Studio pricing-page are separate pages, not a single "plans" page — reduces category-collision.

**Residual risk.** Moderate. The Apple-parallel helps: "Final Cut Pro" and "iMovie" live under one Apple umbrella for 20+ years without dilution because each has a distinct pitch surface.

**Action for Round 4:** commit to the two-page marketing architecture (Brownfield homepage, Studio homepage) before any Studio-facing asset is produced.

### R4 — "Studio" word is crowded

**Risk.** Android Studio, GitHub Codespaces, RStudio, Runway Studio, Pika Studio, Suno Studio. A Google search for "Studio" returns 20 dev-tools. Our "Studio" may get lost.

**Mitigation:**
- Always prefixed by "PatchParty Studio" in marketing — never free-standing.
- SEO play: own "agentic software-production studio" as a phrase.
- Back-pocket alternative: "PatchParty Production" — test in one campaign V2.5 if Studio signal is weak, measure CTR, decide.

**Action for Round 4:** no action before V2.5 ships. Measure post-launch. Revisit at V3.0 if signal weak.

### R5 — Pricing-tier credibility gap

**Risk.** We have zero customers at V2.5 launch. A $1,490/month Agency tier with no logos looks presumptuous.

**Mitigation:**
- Hide the Agency tier from the public pricing page until we have 2+ paying agencies. Keep it as "Contact Sales" instead.
- Studio Pro at $299/mo is the top visible tier at launch.
- Per-Project pricing at $149 is the headline because it's the lowest-friction entry and generates repeat-purchase loops.

**Action for Round 4:** confirm Pricing-page visibility order for V2.5 launch: Per-Project $149 → BYOK $49 → Pro $299. Hide Agency tier until post-launch validation.

### R6 — Taglines that refer to "FCP" or "Final Cut Pro" are trademark-risky

**Risk.** Using "Final Cut Pro for software production" as a tagline (not just a metaphor) exposes us to Apple's IP counsel. We can use it as comparative reference ("in the spirit of Final Cut Pro") but not as a slogan.

**Mitigation:** tagline #10 is explicitly in the DO-NOT-USE list above. Metaphor lives in copy, not in headlines.

**Action for Round 4:** legal review of §6 and §10 copy before public V2.5 launch — confirm no headline uses a third-party trademark verbatim.

### R7 — Ultranova attribution and the cloud-tier brand

**Risk.** Current Brownfield landing credits Ultranova.io as operator of the hosted tier. If Studio launches with a different brand for the cloud-tier, buyers get confused about who they're paying.

**Mitigation:**
- Cloud-tier is called "PatchParty Cloud" or just "PatchParty hosted". Ultranova attribution stays in the footer only.
- Invoice and legal entity is Ultranova — this is a legal-backend fact, not a brand-facing fact.
- Terms of service and privacy policy reference Ultranova.

**Action for Round 4:** legal review of the Ultranova / PatchParty entity split before V2.5 billing goes live.

### R8 — The "best agentic software-development studio that exists" market-claim

**Risk.** This claim (from `00-vision.md §vision`) is a superlative. In EU advertising law, superlatives require substantiation or disclaimer. In US FTC guidance, same. We use it in the vision doc internally but MUST NOT use it verbatim in any public marketing surface without proof.

**Mitigation:**
- Public tagline is "Budget the race. Pick the winner. Ship the PR." — not the market-claim.
- The superlative lives in long-form copy ("The best agentic software-development studio that exists. Not the fastest. Not the easiest. The deepest.") where the disclaimers ("Not the fastest. Not the easiest.") de-fang it — we are declaring WHICH axis we lead, which is defensible.
- Never put "the best" alone in a headline.

**Action for Round 4:** legal review of the "best ... that exists" phrase in context, especially for EU market.

### Open questions forwarded to Round 4+

| # | Question | Destination |
|---|---|---|
| Q4.1 | USPTO + EUIPO trademark sweep for "PatchParty" and "PatchParty Studio" | Legal review, Round 4 |
| Q4.2 | Domain purchase order and DNS config (`patchparty.studio`, `studio.patchparty.dev`) | Ops, Round 4 |
| Q4.3 | Anthropic enterprise contract negotiation — can we get volume discount on Opus to improve $149-tier margin? | Biz-dev, Round 4 |
| Q4.4 | Stripe / billing integration design for Per-Project vs. Subscription vs. BYOK flows | Squad B (architecture), Round 4 |
| Q4.5 | Ultranova legal entity vs. PatchParty brand — is a DBA needed, or a new LLC? | Legal, Round 4 |
| Q4.6 | Demo-Mode-Replay confirmation on V2.5 critical path (non-negotiable per vision §13.2) | Squad A (planner), Round 4 |
| Q4.7 | When is "Harden" button (Deep-Iterate user-facing name) first exposed in UI? V2.5 or V2.7? | Squad A (UX), Round 4 |
| Q4.8 | Agency tier pricing validation — interview 3–5 agency principals before V3.0 Agency-tier launch | User research, Round 4 |

---

## Appendix A — Summary of decisions, one-line each

1. **Brand:** `PatchParty` umbrella + `PatchParty Studio` sub-brand (Option C). Brownfield = PatchParty. Greenfield = PatchParty Studio.
2. **Domain:** `patchparty.dev` apex for Brownfield; `studio.patchparty.dev` for Studio; register `patchparty.studio` as 301 redirect.
3. **Pricing primary:** Hybrid tiered subscription + BYOK (Model 4). Per-Project $149, BYOK $49, Pro $299/mo, Agency $1,490/mo, Enterprise contact.
4. **Pricing fallback:** drop Per-Project to $79 + $30 overage-budget if $149 tier signal weak.
5. **V2.0 message:** "Five Takes per PR. Pick the One You Ship." — unchanged from current landing.
6. **V2.5 message:** "From Brief to Repo, with Five Takes at Every Decision."
7. **V3.0 message:** "Build your own squad."
8. **V3.5 message:** "Ship-Ready, With a Demo-Video, in a Day."
9. **V4.0 message:** "Set the budget. Check in after lunch."
10. **User-facing noun renames:** RaceRun → **Take** (user-facing), Deep-Iterate → **Harden** (user-facing). Internal code names unchanged.
11. **User-facing nouns kept:** Project, Bin, Director, Autopilot, Studio.
12. **User-facing nouns hidden:** PartyEvent, Brownfield, Greenfield (docs-only, never on landing).
13. **Primary tagline:** "Budget the race. Pick the winner. Ship the PR." (17/20).
14. **Fallback tagline 1:** "From Brief to Repo, with Five Takes at Every Decision." (16/20).
15. **Fallback tagline 2:** "Generation is cheap. Selection is the product." (16/20, for skeptic audiences).
16. **Cloud-tier brand:** "PatchParty Cloud" or "hosted on PatchParty". Ultranova in footer only.
17. **Market-claim:** "Best ... studio that exists" lives in long-form copy with qualifying "Not the fastest. Not the easiest. The deepest." disclaimer. Never alone in a headline.

---

**End of 04-positioning.md. Handed off to Round 4 for legal review, domain ops, and V2.5 marketing-asset production.**
