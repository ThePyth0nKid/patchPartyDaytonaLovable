# PatchParty — Pitch Source (single file for NotebookLM)

> **One-liner:** Five Claude agents implement your GitHub issue in parallel — in isolated sandboxes, with five different engineering philosophies. You pick the winner. One click to PR.
>
> **Tagline:** *Choose your patch. Skip the vibe.*

This is the canonical source document for the PatchParty hackathon pitch. Upload this single file into NotebookLM, then prompt it for pitch content, slide outlines, speaker notes, or Q&A preparation. Everything NotebookLM needs is below.

---

# ✦ Style Guide — How every generated artifact should look and sound

NotebookLM, when generating slides, decks, scripts, or any derivative content from this document, you **must** match the brand below. This section is authoritative — deviations break the pitch.

## Visual identity

**Aesthetic reference points:** Linear, Vercel, v0, Anthropic's own marketing. Editorial-minimal, dark-mode-first, high-contrast, tight typography. **Not** cheerful SaaS, **not** playful startup, **not** AI-stock imagery.

### Color system

| Role | Token | Hex | Usage |
|---|---|---|---|
| Background | `slate-950` | `#08090A` | Primary surface — near-black, warm, Linear-dark |
| Surface | `slate-900` | `#121414` | Elevated cards |
| Border | `slate-800` | `#1A1B1D` | Subtle 1px dividers |
| Muted text | `slate-400` | `#62666D` | Secondary copy |
| Body text | `slate-200` | `#D0D1D3` | Primary copy |
| Headline | `slate-50` | `#F7F8F8` | Display type |
| **Gradient accent** | fuchsia → violet → sky | `#E879F9 → #A78BFA → #60A5FA` | The hero gradient — reserve for headlines, CTAs, and the logomark |

### Persona accents (use exactly, never substitute)

| Persona | Color | Hex |
|---|---|---|
| 🔨 Hackfix | Heat Orange | `#FF6B35` |
| 🧱 Craftsman | Teal | `#14B8A6` |
| 🎨 UX-King | Fuchsia | `#E879F9` |
| 🛡 Defender | Sky Blue | `#60A5FA` |
| 💡 Innovator | Violet | `#A78BFA` |

### Typography

- **Display + body:** Inter (variable). Tight tracking on headlines: `-0.02em` at 4xl, `-0.04em` at 6xl+. Font-weight 600 for display, 500 for body.
- **Mono:** JetBrains Mono. Used for *eyebrows* — small uppercase labels above section titles — always tracked out (`letter-spacing: 0.18em – 0.2em`) and sized 11–12px.
- **No serif. No script. No decorative fonts.**

### Layout

- **Dark only.** Aurora gradient (fuchsia / violet / blue / teal radial blooms) behind everything. Subtle film grain (3.5% opacity) on top.
- **Editorial spacing.** Generous vertical rhythm (sections 96–128px tall). Max content width 1152px (6xl container).
- **Geometry.** Border-radius is `7px` universally — slightly sharper than Tailwind's `rounded-md`, softer than square. Do not use pill buttons except for persona badges.
- **Hairlines.** 1px dividers at ~40% opacity (`border-slate-800/60`). Never thicker than 1px.
- **Glow.** Headlines carry a subtle glow (`text-shadow: 0 0 40px rgba(167,139,250,0.25)`). Persona icons glow in their accent color on hover.

### Iconography

- **Library:** lucide-react only. No Material, no FontAwesome, no emoji-as-icon except the five persona faces (🔨 🧱 🎨 🛡 💡) and four role personas (⚙️ 🌐 🔌).
- **Stroke:** 1.5px. Size: 14–16px inline, 20px for primary.
- **Status dots:** 6–8px with a soft outer glow in the accent color.

### What to avoid at all costs

- Screenshots with white backgrounds (will be rejected on principle — everything is dark).
- Clip-art, stock-illustrations, cartoony "AI robot" imagery.
- Gradients outside the fuchsia→violet→blue family for primary accents.
- Rounded corners larger than `10px`.
- More than one accent color on a single slide unless showing all five personas together.

## Voice & tone

**Read like:** The Stripe homepage × Linear changelog × a caffeinated staff engineer.

- **Declarative.** Short sentences. Periods as beats. Fragments land harder than full clauses.
- **Confident, not hype.** Numbers before adjectives. "46% of code is AI-written" beats "tons of code is AI-written."
- **Opinionated.** We take positions. "Generation is cheap. Selection is the new job." Not "We think maybe selection is important."
- **Technical without apology.** The audience is engineers and people who respect engineers. Say "SSE," not "live updates." Say "Octokit," not "the GitHub library."
- **Second-person for value, first-person plural for choices.** *"You paste an issue. We run five agents."*
- **Specific over generic.** "Claude Opus 4.7 in a Daytona sandbox" beats "an AI in a cloud environment."
- **German speakers presenting in English:** favor shorter, Anglo-Saxon words over Latinate ones. *Ship* over *deploy*. *Pick* over *select*. *Fix* over *remediate*. The Latinate versions are for documentation, not stage.

### Signature phrases — reuse verbatim

- *Choose your patch. Skip the vibe.*
- *Five patches. One click. Zero AI slop.*
- *Generation is cheap. Selection is the new job.*
- *Adversarial by design.*
- *Stop trusting one AI. Start choosing between five.*
- *A decision interface for the agent era.*

### Anti-patterns in the voice

- No "unleash," "supercharge," "revolutionize," "empower," "seamless," "cutting-edge," "next-gen."
- No em-dashes where a period would do. (One or two per page, max.)
- No three-word taglines padded with adjectives ("Blazing-fast AI-powered reviews"). The product is the adjective.
- No "Hi everyone 👋" conversational openers in generated decks. Open with a stat or a claim.

---

# ✦ Elevator pitch

## Five-second version

**Paste a GitHub issue. Five Claude agents, five philosophies, five live previews. You pick. One click to PR.**

## Thirty-second version

In 2026, 46% of production code is AI-generated, and those pull requests carry 1.7× more bugs than human-written code. Every Claude gives the same answer to the same prompt. That is a monoculture problem. PatchParty fixes it by running five adversarial personas in parallel — Hackfix ships the minimum diff, Craftsman writes tests and types, UX-King obsesses over accessibility, Defender validates every input, Innovator ships the feature plus two cherry-pickable bonuses. You stop trusting one AI. You start choosing between five.

## Ninety-second pitch (exact words)

**0–12s · Hook.**
> "In 2026, 46% of production code is AI-written. Those pull requests carry 1.7× more bugs. In March, Anthropic shipped their own code-review tool — because Claude Code produced so many PRs that enterprise teams were drowning. The bottleneck is no longer generation. It is **selection**."

**12–25s · Solution.**
> "PatchParty gives you five. One GitHub issue in, five parallel Claude agents in isolated Daytona sandboxes, five radically different pull requests to choose from."

**25–70s · Live demo.** Paste issue URL, click "Let's Party," watch the five panels fill, compare two, pick one, PR URL appears.

**70–90s · Close.**
> "This is not a code-review tool. It is a decision interface for the agent era. Instead of trusting one AI, you choose between five. Live at patchparty.xyz. Open source. Thank you."

## Event context

Built in **one hackday at AI Builders Berlin** (Factory Berlin Mitte, April 2026). Solo builder. Single Next.js app. Deployed on Railway. Live today.

- Live: https://patchparty.dev
- Source: https://github.com/ThePyth0nKid/patchPartyDaytonaLovable
- Domain option: `patchparty.xyz`

---

# ✦ The problem — Generation is cheap. Selection is the new job.

## The market shift

- **46%** of production code is AI-written in 2026.
- AI-generated PRs carry **1.7× more bugs** than human-written code.
- Anthropic launched its own code-review tool in **March 2026** because Claude Code produced so many PRs that enterprise teams were drowning in review load.

The bottleneck moved. It is no longer "write the code." It is "which of the many plausible answers should I actually merge."

## The monoculture

Every engineer on a team asking the same Claude the same question gets the same answer. That is not collaboration — that is a single opinion, scaled. When every PR in your repo was nudged by one model, you lose the built-in disagreement that made code review valuable in the first place.

AI copilots optimized for **one correct answer**. Real engineering is full of trade-offs with **no single correct answer**:

- Should this endpoint rate-limit?
- Does this form need a honeypot?
- Do we ship fast or ship tested?
- Accessibility first, or performance first?

A single-agent workflow forces an implicit answer to every one of those. The human never sees the fork.

## The "AI slop" tax

Three symptoms show up in every team we have talked to:

1. **Review fatigue.** Engineers spend more time reviewing AI PRs than writing code.
2. **Uniform blandness.** Features ship without opinionated choices — no trade-offs weighed out loud.
3. **Hidden defects.** Bugs that pattern-match to "this looks right" slip through because reviewers assume the model already considered edge cases.

Result: **AI slop.** Code that compiles, passes tests, fails in production in the ways you did not ask about.

## Why existing tools do not solve this

- **Code-review assistants** (CodeRabbit, Greptile) inspect one PR at a time. They do not offer alternatives.
- **IDE copilots** (Cursor, Copilot) autocomplete inside a single mental model. Disagreement is out of scope.
- **Agentic frameworks** (Devin, SWE-agent) try to produce *the* answer, not *choices*.

All of them assume "one AI's opinion, polished harder" is the goal. The goal is different: **give the human back the act of choosing**.

## The bet

The next wave of developer tools is not "a better copilot." It is **decision interfaces** — surfaces that help humans pick between plausible AI outputs quickly and confidently.

**Generation is cheap. Selection is the job.**

---

# ✦ The solution — Five patches, one click

## The core idea

Give the developer **five pull requests to choose from**, not one to accept or reject.

PatchParty runs five Claude Opus 4.7 agents in parallel, each with a **distinct engineering philosophy** baked into its system prompt. Each agent works in its own isolated Daytona sandbox — clones the target repo, reads code for context, implements the issue, installs dependencies, boots a live dev server, and pushes a git branch.

The user sees five live previews side by side. Picking one opens a pull request against the source repository in a single click.

## What the user experiences

1. **Paste a GitHub issue URL** on the landing page.
2. **Five cards appear**, one per persona, streaming live status over SSE — *spinning up sandbox → cloning → reading codebase → thinking → writing → installing → live*.
3. **Each card becomes an iframe** with a real, running dev server — the user clicks through the rendered feature as it would exist after the merge.
4. **Compare two side by side** — diff view, per-file tree, two live previews in motion at once.
5. **Click "Pick this one."** PatchParty opens the PR against the source repo. Branch, commit, title, body — all generated.

From paste to PR: **about three minutes.**

## Why this beats "one smarter AI"

- **You compare. You do not guess.** Seeing Hackfix's 8-line diff next to Defender's 60-line fortified implementation tells you instantly what trade-off you are accepting.
- **Adversarial by design.** Hackfix would never add rate-limiting; Defender would never ship without validation. The diffs diverge hard. That *is* the product.
- **The model writes. The human chooses.** No more pretending the model is also the architect.

## Why this beats "a better review tool"

Code review is a **gate**. It says yes or no to one artifact that already exists. PatchParty is a **menu**. It shows several artifacts before any one is final. Different category, different moment in the workflow, different job.

## Why this is possible now (and was not in 2024)

Three preconditions aligned in 2026:

1. **Models good enough to implement a small-to-medium issue end-to-end** — Claude Opus 4.7.
2. **Per-agent sandboxing that provisions in seconds** — Daytona ephemeral dev-containers.
3. **Live-preview iframes that survive CORS, HMR, and auth** — our stateless proxy.

Without all three, parallel-agents-with-previews was a research demo. In 2026 it is a weekend project.

## The emotional shift

- Using a single AI feels like **trust-falling**. You hope the answer is good.
- Using PatchParty feels like **choosing**. You see what you are choosing between.

That shift — **from trust to taste** — is what makes AI-assisted engineering feel like engineering again.

---

# ✦ The five personas — Adversarial by design

The personas are the soul of PatchParty. Each is a distinct **engineering philosophy**, not just a prompt variation. Source of truth: `src/lib/personas/index.ts`.

## 🔨 Hackfix — "Ship it."

**Philosophy:** Write the absolute minimum code to solve the issue. Speed over craft.

**System-prompt constraints:**
- Smallest possible diff.
- Skip tests unless the issue explicitly asks for them.
- No refactoring adjacent code. No comments unless cryptic.
- Prefer existing patterns over "better" ones.

**Typical output:** An 8-line change that makes the green checkmark appear.
**When to pick:** Deadline pressure. Obviously throwaway features. Prototypes.

## 🧱 Craftsman — "Make it proud."

**Philosophy:** Code you would be proud to show in a job interview. Strict typing, full test coverage, documentation, no magic numbers.

**System-prompt constraints:**
- Type annotations everywhere.
- Unit tests minimum, integration tests where applicable.
- JSDoc on public functions.
- Edge cases handled explicitly with clear error messages.
- Magic numbers extracted to named constants.

**Typical output:** The PR your staff engineer merges without asking questions.
**When to pick:** Core product surface. Billing, auth, data integrity.

## 🎨 UX-King — "Users first."

**Philosophy:** Prioritize how a human experiences this feature. Loading, error, empty states. Keyboard-accessible on day one.

**System-prompt constraints:**
- Loading, error, and empty states on every UI surface.
- Keyboard navigation + WCAG 2.2 AA.
- First-time-user experience is a first-class concern.
- Meaningful animations where they aid comprehension — subtle, not flashy.

**Typical output:** A polished feature with proper focus management and an empty state that explains itself.
**When to pick:** Customer-facing UI. Marketing pages. Onboarding.

## 🛡 Defender — "What if attacked?"

**Philosophy:** Assume every input is hostile. Validate. Rate-limit. Audit-log.

**System-prompt constraints:**
- Validate all inputs: type, range, sanitization.
- Parameterized queries only — never SQL concatenation.
- Rate-limiting hooks where appropriate.
- Log security-relevant events. Auth at every entry point.
- Assume the database could be dumped — no plaintext secrets.
- Include a `# Security Considerations` section in the PR description.

**Typical output:** The same feature the others built, plus three defenses you did not think to ask for.
**When to pick:** Anything accepting user input. Money. Personal data.

## 💡 Innovator — "What if we went further?"

**Philosophy:** Ship the requested feature properly. Then hand the reviewer one or two cherry-pickable bonus commits.

**System-prompt constraints:**
- Core feature works standalone — baseline PR is independent.
- Bonus features are cleanly separated, non-breaking, opt-in.
- Max two bonuses. No scope explosion.
- Each bonus has a "why" attached.

**Typical output:** `base` + `bonus_features[]` — the first always merges, the bonuses are gifts the reviewer can accept one at a time.
**When to pick:** You want to see the adjacent possibilities. You trust your ability to reject a bonus.

## The four role personas (orchestrator-selected)

When the issue is clearly frontend, backend, fullstack, or API-shaped, a Claude Haiku 4.5 classifier swaps in a matching specialist.

| Persona | Tagline | When picked |
|---|---|---|
| 🎨 **Frontend Specialist** | Pixel-perfect. | UI / CSS / responsive layout |
| ⚙️ **Backend Specialist** | Data done right. | Handlers, queries, data shapes |
| 🌐 **Fullstack Engineer** | End to end. | Both API contract and UI change |
| 🔌 **API Designer** | Contracts matter. | New public interface or endpoint shape |

## Why contradictory philosophies are the feature

If every persona agreed, PatchParty would be five copies of the same answer — pointless. They are **deliberately contradictory**:

- Hackfix would never add auth checks. Defender would never skip validation.
- UX-King spends time on focus states. Hackfix does not.
- Craftsman adds tests. Hackfix refuses.
- Innovator proposes scope expansion. Hackfix aggressively rejects it.

The user's *real* decision is not "which code is correct" — all are plausible. It is **which trade-off do I accept**. PatchParty surfaces that decision instead of hiding it.

---

# ✦ How one "party" works — From issue URL to PR

## The flow

```
┌─────────┐     paste issue     ┌────────────────┐
│  user   │ ──────────────────▶ │  /api/party/   │
└─────────┘                     │     start      │
      ▲                         └────────┬───────┘
      │ SSE (live status)                │
      │                                  │  fires 5 runAgent() in parallel
      │                                  ▼
┌─────┴─────┐  ┌───────────────────────────────────┐
│ /party/id │  │  Per persona:                     │
│  (React)  │  │  ┌──────────────────────────────┐ │
└───────────┘  │  │  Daytona sandbox (new)       │ │
      │        │  │  ├─ git clone repo           │ │
      │ click  │  │  ├─ read code for context    │ │
      │        │  │  ├─ Claude Opus 4.7 w/persona│ │
      │        │  │  ├─ write files              │ │
      │        │  │  ├─ npm install + `dev`      │ │
      │        │  │  ├─ getPreviewLink(3000)     │ │
      │        │  │  └─ git push branch          │ │
      ▼        │  └──────────────────────────────┘ │
┌────────────┴──────────────────────────────────────┐
│ Compare modal — iframe → /api/preview proxy       │
│   └─ strips Daytona warning, rewrites paths,      │
│      stubs Vite HMR → no-flicker live preview     │
└───────────────────────────────────────────────────┘
      │
      │ "Pick this one"
      ▼
┌────────────┐
│ /api/party/│   octokit.pulls.create({ head: branch })
│   /pr      │ ─────────────────────────────────────▶  PR on target repo
└────────────┘
```

## Step by step

1. **Classify the issue.** Claude Haiku 4.5 reads title + body, returns `{ type, concerns, complexity, reason }`. Haiku because it is a cheap routing decision.
2. **Select the 5-person team.** Pure deterministic function picks from the nine-persona pool. Security concerns → Defender is mandatory. Frontend type → Frontend Specialist + UX-King. Complexity tunes Hackfix vs. Innovator.
3. **Fan out to 5 sandboxes in parallel.** Each `runAgent(party, persona)` call creates a public Daytona sandbox with `autoStopInterval: 15`, shallow-clones, reads up to 12 source files for context, calls Claude Opus 4.7 with the persona system prompt, writes files, `npm install`, starts `npm run dev` detached, requests a preview URL, commits + pushes branch `patchparty/<persona>/<partyId>`, generates a Haiku summary.
4. **Stream status live.** Every status change fans out to the browser over Server-Sent Events at `/api/party/[id]/stream`. SSE was chosen over WebSockets — simpler, proxy-friendly, no reconnect dance.
5. **Show five previews in iframes.** The iframe src is a route on *our* domain: `/api/preview/<base64-encoded-sandbox-info>/...`. That preview proxy is where most of the interesting engineering lives.
6. **Compare side by side.** Clicking a card opens a compare modal — diff view, file tree, live preview iframe. A second click adds a side-by-side panel.
7. **Pick and open a PR.** `/api/party/[id]/pr` calls Octokit to open a pull request on the target repo. Branch from the agent, title from the issue, body from the Haiku summary. Losing sandboxes auto-stop.
8. **Cleanup on tab close.** `navigator.sendBeacon` to `/api/sandbox/cleanup`. Belt-and-suspenders with Daytona's `autoStopInterval`.

## Why the flow is this shape

- **Parallel fan-out**, not sequential — the value prop collapses if users wait for agent 5 while 1 has been done for two minutes.
- **Sandbox per agent**, not shared — conflicting file writes cannot interfere, each dev server gets its own port 3000.
- **SSE for status**, not polling — feels live, costs nothing, survives proxies.
- **In-memory store**, no database — parties are ephemeral. v0 is fine; Redis later.

---

# ✦ Architecture — One Next.js app, five sandboxes, a stateless proxy

## Tech stack

| Layer | Technology | Notes |
|---|---|---|
| Framework | **Next.js 15** | App Router, Route Handlers, SSE |
| UI | **React 19 RC** + **Tailwind CSS** | `legacy-peer-deps=true` for `@monaco-editor/react` |
| Code generation | **Claude Opus 4.7** | One call per persona |
| Classification + summaries | **Claude Haiku 4.5** | Cheap calls for routing and per-PR summaries |
| Sandboxes | **Daytona SDK 0.20.2** | Public sandboxes, `autoStopInterval: 15` |
| GitHub | **Octokit** | Issue fetch + PR creation |
| Hosting | **Railway** | Single service |
| Domain | **Cloudflare** (`patchparty.xyz`, optional) | — |

## Repository layout

```
src/
├── app/
│   ├── page.tsx                          # Home (paste URL)
│   ├── party/[id]/page.tsx               # Live party view + compare modal
│   └── api/
│       ├── party/
│       │   ├── start/route.ts            # classify, select team, spawn 5 agents
│       │   ├── [id]/stream/route.ts      # SSE status updates
│       │   └── [id]/pr/route.ts          # create PR via Octokit
│       ├── preview/[target]/[[...path]]/ # stateless proxy to Daytona sandboxes
│       └── sandbox/cleanup/route.ts      # deletes sandboxes on tab close
└── lib/
    ├── personas/index.ts                 # THE CORE — 5 philosophies + 4 roles
    ├── orchestrator.ts                   # classify + selectPersonas
    ├── agent.ts                          # Daytona + Claude orchestration
    ├── store.ts                          # in-memory party state + pub/sub
    ├── types.ts                          # shared types
    └── github/index.ts                   # Octokit helpers
```

## Key design decisions

- **No database.** In-memory store, ephemeral parties. Redis is v1.
- **SSE, not WebSocket.** Simpler, proxy-friendly, works on Railway out of the box.
- **One Next.js app.** Single Railway deploy, no CORS, no service-mesh.
- **GitHub PAT, not OAuth.** Saved ~45 minutes. Swap to a GitHub App for v1.
- **Stateless preview proxy.** The iframe URL encodes `{sandboxUrl, token}` in base64url — no server-side lookup, survives container restarts.

## The preview-proxy quirk (the most interesting 30 minutes of this build)

Daytona gives each sandbox a URL like `https://3000-<sandboxId>.daytonaproxy01.net`. Embedding that directly in an iframe **breaks in five distinct ways**. The route at `src/app/api/preview/[target]/[[...path]]/route.ts` fixes each:

1. **Interstitial warning.** Daytona shows "you are about to visit an untrusted site" by default. Proxy sets `x-daytona-skip-preview-warning: true`. Gone.
2. **Iframes cannot set custom headers.** Client encodes the preview token into the proxy path (base64url); server attaches `x-daytona-preview-token` upstream.
3. **Absolute path resolution.** Vite's `<script src="/@vite/client">` resolves to *our* domain inside the iframe. Proxy rewrites every `"/foo"`, `'/foo'`, `` `/foo` `` in HTML, JS, and CSS to `/api/preview/<target>/foo`.
4. **Wrong content-types.** Daytona returns `text/html` for `.svg`, `/@vite/client`, etc. Proxy fixes by file extension *and* body-sniffs (`import …` prefix → `application/javascript`) because Vite serves CSS as JS modules.
5. **HMR reload loop.** Vite's client opens a WebSocket to `window.location.origin` = our Railway URL with no WS endpoint. It gives up, polls, thinks the server came back, calls `location.reload()`. Iframe flickers forever. Proxy short-circuits `/@vite/client` with a stub module that exports every symbol `react-refresh` and CSS modules import — all no-ops.

If you are ever embedding a Daytona sandbox in an iframe on your own domain, start from that route file.

## Cost envelope

- 5× Claude Opus 4.7 calls (one per persona)
- 5× Claude Haiku 4.5 summary calls
- 1× Haiku classifier call
- 5× Daytona sandbox-minutes

**≈ 50¢ per party** at retail pricing. Cheaper than a senior engineer review by an order of magnitude.

---

# ✦ Demo script — The 90-second pitch, rehearsed

## Pre-flight checklist (before going on stage)

- [ ] Laptop plugged into the projector.
- [ ] Browser on the home page — URL bar visible.
- [ ] Demo issue URL already in the clipboard, `Cmd+V`-ready.
- [ ] Backup screen-recording video in a second tab (hidden).
- [ ] Phone on mobile data as a tethering backup.
- [ ] Cursor closed, full-screen mode ready.
- [ ] Breathe. Smile.

## Demo issue recommendations

All issues live on `ThePyth0nKid/soloPortfolio`.

| Use it as | Issue | Why |
|---|---|---|
| **Opener** | #4 — Copy-email-to-clipboard button | ~60s per agent. Personas diverge in animation and toast styling. |
| **Proof moment** | #6 — Skills with progress bars, or #10 — Career timeline with filters | Philosophies show their teeth. Hackfix = static list, UX-King = stagger animation, Craftsman = types + tests. |
| **Finale** | #11 — Case-study template at `/projects/:slug` | Five different portfolios in one minute. Maximum divergence, maximum wow. |

**Tip:** pre-cache a party on #11 before you start, then start fresh on #4 live. Fast wow live + big wow on standby.

## Q&A — Prepared answers

**"How is this different from CodeRabbit?"**
> CodeRabbit reviews one PR that already exists. We generate five alternatives before a PR exists. Different category — one is a gate, the other is a menu.

**"Does this actually scale cost-wise?"**
> Five Opus calls plus five sandbox-seconds — around 50 cents per party. An order of magnitude cheaper than a senior engineer review. And the senior still picks.

**"What if all five agents write similar code?"**
> The personas are adversarial by design. Hackfix would never add auth checks. Defender would never skip validation. In our runs the diffs diverge hard. That *is* the product.

**"Do I need to trust an AI with my repo?"**
> Each agent runs in an ephemeral Daytona sandbox scoped to a shallow clone. Nothing leaves until you pick a winner and click PR. Then it is a normal GitHub pull request against a branch you can revert in one click.

**"How do you handle provenance / plagiarism concerns at the hackathon?"**
> Project scaffolding was generated with `create-next-app` live at the event. Every feature was written today. The commit history speaks for itself.

## Emergency playbook

- **Daytona down** → fall back to E2B or mock sandboxes. Lose the Daytona bonus, keep the demo.
- **Claude rate-limited** → switch model from `claude-opus-4-7` to `claude-sonnet-4-6` in `agent.ts`.
- **Nothing works by 2pm** → scope-emergency: one persona only. Reframe as "proof of concept." Pivot pitch to vision.
- **Venue WiFi dies** → play the backup video. "Our live demo would take 45 seconds. Since the WiFi is down, here is the recording." Smile, keep moving.

## The one sentence to memorize

> **"PatchParty is a decision interface for the agent era — five patches, one click, zero AI slop."**

If you forget everything else, say that.

---

# ✦ Traction, known gaps, roadmap

## What works today

- Classifier → team selection → parallel fan-out → live previews → PR creation, end to end.
- Nine personas (5 philosophy + 4 role) with orchestrator-driven team composition.
- SSE-streamed status rendered live in the party UI.
- Stateless preview proxy successfully iframes Daytona sandboxes with Vite dev servers.
- PR creation via GitHub PAT + Octokit.

## Known gaps — owned, not hidden

- **TS strict checks disabled in production build.** `next.config.js`. Reason: Daytona SDK 0.20 → 0.167 is 147 minor versions of API drift. Runtime works; types do not.
- **Daytona SDK pinned to 0.20.2.** Upgrading unlocks signed preview URLs and eliminates most of the proxy — but breaks the agent in ways we did not want to debug under a pitch deadline.
- **"Create PR" uses sandbox-side `git push`.** Works for public target repos with a PAT that has push access. No conflict resolution yet.
- **No semantic code context.** Agents see the first 12 files, not the ones most relevant to the issue. Post-hackathon: embeddings + RAG.
- **In-memory party store.** Survives within one Railway container. Restart → orphaned sandboxes (they auto-stop after 15 min).
- **Only tested against Vite/React repos.** Preview-proxy rewriting assumes Vite conventions. Next.js / Astro / SvelteKit need tweaks.

## Roadmap

**Weeks 1–2 · Harden v0**
- Redis-backed party store.
- Daytona SDK upgrade → signed preview URLs → delete most of the proxy.
- Merge-conflict handling (fork + PR-from-fork).

**Weeks 3–4 · Smarter context**
- Embeddings for the target repo on first party.
- Top-K file retrieval based on the issue body.
- Per-agent scratchpad — mid-task file lookups.

**Weeks 5–6 · Multi-party features**
- **Merge winners** — combine two picks into a hybrid PR ("UX-King's polish on top of Defender's validation").
- **Persona voting** — the five agents review each other's PRs; user sees the disagreement.
- **Replay** — rerun a past party with a different team.

**Weeks 7+ · Audience expansion**
- Slack / Linear / Jira integrations — start a party from where the issue already lives.
- GitHub App, not PAT — one-click install, OAuth, multi-user.
- Team dashboards — which personas does your org pick most?
- Paid tier — BYOK free forever, usage-priced team plans.

## What we need

- **Design partners** — teams on Claude Code / Cursor today. We run PatchParty on their real issues for two weeks, free, tune personas against their codebases.
- **A second engineer** — infrastructure-flavored, to build the multi-user + team-dashboard layer.
- **A GitHub App listing** — fastest path from "a tool I run" to "a tool my team runs."

---

# ✦ FAQ — Product, technical, business

## Product

**How is this different from CodeRabbit or Greptile?**
Those tools *review* one PR that already exists. PatchParty *generates five alternatives* before any PR exists. Different category — a gate vs. a menu.

**How is this different from Devin or SWE-agent?**
Those agents try to produce *the* answer. PatchParty exposes the disagreement between multiple answers. The product is not "AI that solves your issue" — it is "AI that shows you the trade-offs you are choosing between."

**What if all five agents write similar code?**
Personas are contradictory by system prompt. In practice the diffs diverge. That *is* the product.

**Can I add my own persona?**
Yes. Every persona is ~30 lines in `src/lib/personas/index.ts`. Forking to add a "house style" persona is a 20-minute job. Proper UI for this is on the roadmap.

**What about private repos?**
v0 is public-repo only (PAT with `repo` scope on public repos). Private requires a GitHub App + OAuth — ~1 week of work.

## Technical

**Why Daytona and not Docker / Fly Machines / Modal / E2B?**
Daytona was at the event as a sponsor. Real technical reason: SDK handles sandbox lifecycle + port-forward + public preview URLs out of the box — ~80% of what we need. E2B would be a viable swap.

**Why SSE, not WebSocket?**
SSE is a one-way stream of small events. Exactly our shape. No sticky sessions, no reconnection dance, no pong frames.

**What if Claude returns malformed JSON?**
Two fallbacks: strip triple-backticks, then regex-extract the first JSON-looking substring. If both fail, that agent emits `error`; the other four keep running.

**What if `npm install` fails inside a sandbox?**
Logged and continued. Preview iframe will not render but the diff is still useful and the branch is still pushed. Graceful degradation.

**Why the base64url preview-proxy trick?**
The URL encodes `{sandboxUrl, token}`. Any server instance can serve any preview without shared state. Survives container restarts, load-balancer reshuffles, multi-region.

**How is the GitHub token handled?**
Server-side only. Never reaches the browser. Lives in Railway env vars, injected into the `git push` URL inside the sandbox, sandbox destroyed shortly after.

## Business

**~50¢ per party — can you scale that?**
Yes. At retail API pricing. Volume discounts + Daytona's enterprise tier drop the marginal cost further. 50¢ vs. a senior engineer's review hour is a 100×+ improvement. The margin exists.

**Who pays?**
v0: free with BYOK. v1: BYOK free forever + team plan with managed keys + dashboards + usage-based pricing (~$1/party, $50/month minimum).

**Isn't this just a solo-dev tool?**
Hook is solo, unit of value is a team. When five engineers on a team prompt Claude Code the same way, the codebase homogenizes. PatchParty forces variation back in — across the team.

**What is the moat?**
Three layers: (1) Persona design — contradictory philosophies that *actually* diverge is prompt-craft we iterated on. (2) Selection UX — compare-modal, live previews, diff-aware, per-file. (3) Future data flywheel — which persona wins for which issue type on which codebase tunes the orchestrator.

**Why now, not two years ago?**
Three preconditions had to align: Claude Opus 4.7 good enough to implement end-to-end, Daytona-class sandboxes in seconds, preview-proxy patterns for live dev servers in iframes. Any earlier, any one of those would have been blocking.

**Single biggest risk?**
Model-quality regression. If Opus 4.8 is worse than 4.7, the base layer gets noisier. Mitigation: persona system is model-agnostic — GPT-5, Gemini, open-weight models all swappable.

**What would kill this?**
Anthropic shipping "Claude Code, five at a time" as a native feature. Non-zero probability. But they are ahead on code-review (a gate) and behind on the selection UX (a menu). Different shape of product, same shape of customer — we compete or we get acquired.

---

# ✦ Ready-made 12-slide outline

Each slide: title, visual, spoken line. Match the style guide exactly. Dark background, Inter typography, 7px radius, fuchsia→violet→blue gradient for hero accents, mono uppercase eyebrows, persona colors where persona content appears.

## Slide 1 · Title
- **Eyebrow:** `LIVE AT FACTORY BERLIN · AI HACKDAY 2026`
- **Headline:** PatchParty
- **Subhead:** *Five patches. One click. Zero AI slop.*
- **Visual:** Logomark + 5 persona icons (🔨 🧱 🎨 🛡 💡) with accent-color glow.
- **Spoken:** "PatchParty. Choose your patch. Skip the vibe."

## Slide 2 · The problem, in three numbers
- **Eyebrow:** `01 · WHY NOW`
- **Headline:** Generation is cheap. Selection is the new job.
- **Visual:** Three big stats in a row — **46%** / **1.7×** / **1**. Each with a mono label.
- **Spoken:** "In 2026, nearly half the code shipped is AI-written. Those PRs have 1.7× the bug rate. And every Claude gives the same answer. That is a monoculture."

## Slide 3 · The AI-slop tax
- **Eyebrow:** `02 · THE BOTTLENECK MOVED`
- **Headline:** Review fatigue. Uniform PRs. Hidden defects.
- **Visual:** Three-column card with the three symptoms. Hairline dividers. No icons — type only.
- **Spoken:** "Engineers now spend more time reviewing AI PRs than writing code. Review does not fix the real problem — there was never a choice."

## Slide 4 · Our bet
- **Headline:** *Stop trusting one AI. Start choosing between five.*
- **Visual:** Single gradient quote block, fuchsia→violet→blue clip-text.
- **Spoken:** "The next wave of developer tools is not a better copilot. It is a decision interface."

## Slide 5 · Meet the five
- **Eyebrow:** `03 · THE CAST · ADVERSARIAL BY DESIGN`
- **Headline:** Five philosophies. Five pull requests.
- **Visual:** 5-column grid, one per persona, each with its accent color. Icon, name, tagline, 1-sentence philosophy.
- **Spoken:** "Hackfix ships the minimum. Craftsman writes tests. UX-King cares about the loading state. Defender assumes every input is hostile. Innovator gives you the feature plus two cherry-pickable bonuses."

## Slide 6 · How one party works
- **Eyebrow:** `04 · THE FLOW`
- **Headline:** Paste → parallelize → pick.
- **Visual:** The ASCII-style flow diagram in mono, white-on-near-black.
- **Spoken:** "Paste a GitHub issue. Five Daytona sandboxes in parallel. Each clones the repo, generates with Claude Opus 4.7, boots a real dev server. You see five live previews. You pick. It opens the PR."

## Slide 7 · Live demo
- **Visual:** Full-screen the browser. No slide chrome.
- **Spoken:** "Let me show you." → run the demo.

## Slide 8 · Tech stack
- **Eyebrow:** `05 · BUILT WITH`
- **Headline:** One app. Five sandboxes. A stateless proxy.
- **Visual:** Row of logos or text pills — Next.js 15, React 19, Claude Opus 4.7, Claude Haiku 4.5, Daytona, Octokit, Tailwind, Railway.
- **Spoken:** "One Next.js app on Railway. Opus for code, Haiku for classification and summaries. Daytona for sandboxes. GitHub via Octokit."

## Slide 9 · The hardest 30 minutes
- **Eyebrow:** `06 · THE INTERESTING PART`
- **Headline:** Embedding a Daytona sandbox in an iframe breaks in five ways. We fixed each one.
- **Visual:** Five-item numbered list, mono numbers, short description per line.
- **Spoken:** "If you are ever doing this, start from our route file."

## Slide 10 · Economics
- **Eyebrow:** `07 · UNIT ECONOMICS`
- **Headline:** ~50¢ per party.
- **Visual:** Math block — 5 Opus calls + 6 Haiku calls + 5 sandbox-minutes = ~$0.50.
- **Spoken:** "An order of magnitude cheaper than a senior engineer review. And the senior still picks."

## Slide 11 · Roadmap
- **Eyebrow:** `08 · WHAT IS NEXT`
- **Headline:** v0 ships today. v1 is six weeks away.
- **Visual:** Three-column timeline — Weeks 1–2 / 3–4 / 5–6.
- **Spoken:** "What we built in a day proves the primitive. Six weeks from here: Redis, better context retrieval, merged winners, persona voting."

## Slide 12 · Close
- **Headline:** *Stop trusting one AI. Start choosing between five.*
- **Visual:** Gradient clip-text. `patchparty.xyz` in mono below. Five persona icons pulsing.
- **Spoken:** "A decision interface for the agent era. Live today. Open source. Thank you."

---

# ✦ Instructions for NotebookLM

When you generate derivative content from this document:

1. **Voice:** declarative, short, opinionated. Use the signature phrases verbatim. No "unleash," "supercharge," "seamless," or AI-marketing filler.
2. **Visuals:** dark background, near-black (#08090A), Inter typography, 7px border-radius, mono uppercase eyebrows in JetBrains Mono. Fuchsia→violet→blue gradient for hero accents. Persona accent colors exactly as specified — never substitute.
3. **Structure:** eyebrow → headline → subhead → body. Generous whitespace. One accent color per slide unless showing all five personas.
4. **Numbers before adjectives.** "46%" beats "tons." "50¢" beats "cheap."
5. **Technical specifics over generic descriptions.** "Claude Opus 4.7 in a Daytona sandbox" beats "an AI in the cloud."
6. **When generating a deck:** use the 12-slide outline above as the canonical structure. Do not add an agenda slide. Do not add a "Thank you" slide — slide 12 is the close.
7. **When generating speaker notes:** 2–3 sentences per slide, matching the voice guide. Write the line as it would be *spoken*, not as it would be written.
8. **When generating an audio overview:** lean into the adversarial-personas angle. The "five philosophies that disagree on purpose" framing is the product.

Everything else — pacing, emphasis, where to pause — is the presenter's call.

**PatchParty. Five patches. One click. Zero AI slop.**
