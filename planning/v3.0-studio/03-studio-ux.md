# 03 — Studio UX (Squad B, Round 3)

**Status:** v1 — 2026-04-18. Scope: V2.5 three-pillar Studio UI + Autopilot overlay + Greenfield onboarding (`/studio/new`) + V3.0 previews (Custom-Agents, asset-race). Input spec: `00-vision.md` §6, §7, §8, §13, §15. Design language inherited from V2.0 Brownfield: shadcn/ui, Tailwind, Lucide icons, JetBrains Mono + Inter, `rounded-[7px]` radius, `slate-950` base, persona-accents `#FF6B35 / #14B8A6 / #E879F9 / #60A5FA / #A78BFA`.

**Guiding constraint hierarchy (when in conflict, higher wins):**

1. Timeline never leaves the screen.
2. Budget-bar never leaves the screen.
3. Bin (assets) is first-class, not a dropdown.
4. Chat is per-candidate inside Inspector, never primary.
5. Pick/re-race reachable in ≤2 keystrokes.
6. No modals for race selection — all race-state lives on the Stage.
7. Progressive disclosure, no `Pro Mode` toggle.
8. Demo-Mode-Replay <90s, recorded event-stream, no live LLM calls on landing.

---

## 1. Information Architecture

### Sitemap

```
/                                  Landing (marketing, V2.0 — unchanged)
/studio/demo                       Demo-Mode-Replay (recorded stream, no auth required)
/studio/new                        Greenfield onboarding — brief entry
/studio/new/brief                  Brief-clarification (V3.0, redirects to /new in V2.5)
/studio/p/[projectId]              Main Studio screen — three-pillar layout
/studio/p/[projectId]/phase/[name] Deep-link to a specific phase (brief|stories|stack|genesis|build|quality|release)
/studio/p/[projectId]/pick/[raceId] Deep-link to a specific race-run (timeline scrub target)
/studio/p/[projectId]/branch/[branchId] Branch-from-here view (second timeline track)
/studio/p/[projectId]/settings     Per-project settings (budget, autopilot policy, custom agents)
/studio/p/[projectId]/bin          Full-screen Bin (drill-down when 280px column is too narrow)
/studio/p/[projectId]/bin/[assetId] Asset detail (preview, citations, replace, delete)
/studio/agents                     Global custom-agents library (V3.0)
/studio/agents/new                 Create agent form (V3.0)
/studio/agents/[agentId]           Edit agent + "which races used me" telemetry
/studio/squads                     Squad composer (V3.0)
/studio/squads/[squadId]           Edit squad

/app/* (Brownfield, unchanged from V2.0)
/party/[id] (Brownfield, unchanged from V2.0)
```

**Routing notes:**
- Studio is a sibling of `/app`, not a child, to keep Brownfield URLs stable and preserve the "one repo, two pitches" branding flexibility (Squad C decides final copy).
- `/studio/demo` is public-unauthenticated; all other `/studio/*` require auth.
- `/studio/agents/*` is global (per-user) — agent definitions are portable across projects. Per-project squad *overrides* live at `/studio/p/[projectId]/settings#squads`.

### Persistent chrome across all `/studio/p/[projectId]/*`

- Top nav: brand, project title, phase-tabs (`Brief · Stories · Stack · Repo · Build · Quality · Release`), mode-toggle (`Director | Autopilot`), budget-pill.
- Bottom dock: timeline + budget-bar (always visible, 88px tall).
- Left rail: Bin (280px, collapsible to 56px icon-rail).
- Right rail: Inspector (320px, collapsible to 0 when Stage is running full-width preview).

---

## 2. Greenfield Onboarding Flow (`/studio/new`)

### 2.1 Entry wireframe (step 1 — landing in onboarding)

```
┌───────────────────────────────────────────────────────────────────────────┐
│ [PP] PatchParty Studio              Director | Autopilot    Sign out      │ 56px
├───────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│     STEP 1 / 3 — BRIEF                                                    │  (stepper 24px)
│     ──                                                                    │
│                                                                           │
│     What are we building?                                      36px       │  H1
│     ────────────────────────────                                          │
│     One paragraph, one PDF, one Loom link, or one voice note.             │
│     You can edit it later. You can pin more context from the Bin.         │
│                                                                           │
│   ┌─────────────────────────────────────────────────────────────────┐     │
│   │                                                                 │     │
│   │  Paste a brief, or drop a file…                                 │     │
│   │                                                                 │     │ 240px
│   │  ┌─────┐ ┌─────┐ ┌─────────┐ ┌──────┐                           │     │
│   │  │ PDF │ │ MD  │ │ Loom URL│ │ Voice│   (drop-targets, 48px)    │     │
│   │  └─────┘ └─────┘ └─────────┘ └──────┘                           │     │
│   │                                                                 │     │
│   └─────────────────────────────────────────────────────────────────┘     │
│                                                                           │
│     Tone             [ Business · Technical · Mixed (auto) ▾ ]            │
│     Primary language [ English · Deutsch · Auto-detect     ▾ ]            │
│                                                                           │
│   ┌───────────────────────────────────┐   ┌─────────────────────────┐     │
│   │  Try an example brief             │   │  Continue to Stories →  │     │  48px
│   └───────────────────────────────────┘   └─────────────────────────┘     │
│                                                                           │
│     EN: Don't have one? Try a sample brief. No account needed.            │  helper
│     DE: Kein Brief zur Hand? Probier ein Beispiel. Kein Account nötig.    │  12px
│                                                                           │
│     Est. cost to generate 5 story-sets: ~$0.18 · ~45s                     │  cost-tag
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘
```

**Measurements:** H1 36px / 40px line-height. Textarea 240px tall, full-width up to 720px max-width. Drop-targets 48px square tile with 1px `slate-700` border, `rounded-[7px]`.

**Microcopy (EN / DE):**

| Slot | EN | DE |
|---|---|---|
| Stepper | `STEP 1 / 3 — BRIEF` | `SCHRITT 1 / 3 — BRIEFING` |
| H1 | `What are we building?` | `Was bauen wir?` |
| Sub | `One paragraph, one PDF, one Loom link, or one voice note. You can edit it later. You can pin more context from the Bin.` | `Ein Absatz, ein PDF, ein Loom-Link oder eine Sprachnotiz. Du kannst später editieren. Mehr Kontext pinnst du aus dem Bin.` |
| Textarea placeholder | `Paste a brief, or drop a file…` | `Briefing einfügen oder Datei hineinziehen…` |
| Primary CTA | `Continue to Stories →` | `Weiter zu den Stories →` |
| Secondary CTA | `Try an example brief` | `Beispiel-Briefing testen` |
| Cost-tag | `Est. cost to generate 5 story-sets: ~$0.18 · ~45s` | `Geschätzte Kosten für 5 Story-Sets: ~$0.18 · ~45s` |
| Empty-state under textarea (before paste) | `Nothing pasted yet. Even a two-sentence "what this is and who it's for" works.` | `Noch nichts eingefügt. Schon zwei Sätze "was das ist und für wen" reichen.` |
| Error: file too large (>10MB) | `That file is ${size}MB — we cap at 10MB. Trim it or link to it in the brief.` | `Diese Datei ist ${size}MB — Limit ist 10MB. Kürze sie oder verlinke sie im Briefing.` |
| Error: unsupported MIME | `We only read PDF, MD, TXT, and Loom URLs right now. Other formats land in V3.0.` | `Aktuell lesen wir nur PDF, MD, TXT und Loom-URLs. Weitere Formate ab V3.0.` |
| Error: network on upload | `Upload stalled. Try again — your text is still in the box.` | `Upload hängt. Nochmal probieren — dein Text ist noch da.` |

### 2.2 Step 2 — budget + autopilot gate

```
┌───────────────────────────────────────────────────────────────────────────┐
│     STEP 2 / 3 — BUDGET & AUTONOMY                                        │
│     ──                                                                    │
│                                                                           │
│     How much room do we get?                                              │
│                                                                           │
│   ┌─────────────────────────────────────────────────────────────────┐     │
│   │   Project budget                                                │     │
│   │   ┌───────────────────────────────────────────────────────┐     │     │
│   │   │  $20    [──●──────────────]   $200                    │     │     │ 72px
│   │   └───────────────────────────────────────────────────────┘     │     │
│   │   $40  — typical greenfield run (Stories + Stack + Genesis +    │     │
│   │          ~4 Story-Implementation races, Anthropic-only).        │     │
│   │                                                                 │     │
│   │   Soft-warn at 50% · 75% · 90% · Hard-cap at 100%               │     │
│   └─────────────────────────────────────────────────────────────────┘     │
│                                                                           │
│     Who drives?                                                           │
│                                                                           │
│   ┌──────────────────────────────┐    ┌──────────────────────────────┐    │
│   │  ● Director (you pick)       │    │  ○ Autopilot (studio picks,  │    │
│   │    Waits at every race.      │    │    pages you at reversibility│    │ 132px
│   │    Default. Most learning.   │    │    cliffs). Requires budget. │    │
│   │    Est. ~10–15 decisions.    │    │    Est. ~3–5 decisions.      │    │
│   └──────────────────────────────┘    └──────────────────────────────┘    │
│                                                                           │
│   ┌──────────────────────────────────────────────────────────────────┐    │
│   │  Intervention policy  (Autopilot only)                           │    │
│   │    ○ Conservative — page me at every DB migration, deploy, and   │    │
│   │      AC failure.                                                 │    │
│   │    ● Balanced     — page me at reversibility cliffs + budget     │    │
│   │      watermarks. Recommended.                                    │    │ 160px
│   │    ○ Aggressive   — page me only at hard-cap and final PR.       │    │
│   │    ○ Custom       — YAML editor (advanced).                      │    │
│   └──────────────────────────────────────────────────────────────────┘    │
│                                                                           │
│   [ ← Back ]                                  [ Continue to Stories → ]   │
└───────────────────────────────────────────────────────────────────────────┘
```

**Microcopy:**

| Slot | EN | DE |
|---|---|---|
| H1 | `How much room do we get?` | `Wieviel Spielraum haben wir?` |
| Slider label | `Project budget` | `Projekt-Budget` |
| Default-hint | `$40 — typical greenfield run (Stories + Stack + Genesis + ~4 Story-Implementation races, Anthropic-only).` | `$40 — typischer Greenfield-Lauf (Stories + Stack + Genesis + ~4 Story-Implementation-Races, nur Anthropic).` |
| Watermark spec | `Soft-warn at 50% · 75% · 90% · Hard-cap at 100%` | `Sanfte Warnung bei 50% · 75% · 90% · Harte Grenze bei 100%` |
| Director card | `Director (you pick) — Waits at every race. Default. Most learning. Est. ~10–15 decisions.` | `Director (du entscheidest) — Wartet bei jedem Race. Standard. Meiste Lernrendite. ca. ~10–15 Entscheidungen.` |
| Autopilot card | `Autopilot (studio picks, pages you at reversibility cliffs). Requires budget. Est. ~3–5 decisions.` | `Autopilot (Studio entscheidet, meldet sich an Kipp-Punkten). Budget erforderlich. ca. ~3–5 Entscheidungen.` |
| Policy: Balanced | `Balanced — page me at reversibility cliffs + budget watermarks. Recommended.` | `Ausgewogen — melden bei Kipp-Punkten und Budget-Marken. Empfohlen.` |
| CTA | `Continue to Stories →` | `Weiter zu den Stories →` |

### 2.3 Step 3 — Stories race kickoff (bridges into main Studio)

```
┌───────────────────────────────────────────────────────────────────────────┐
│     STEP 3 / 3 — STORIES RACE                                             │
│     ──                                                                    │
│                                                                           │
│     Five slicing philosophies will race on your brief.                    │
│     You pick one. Losers persist as losers/stories-*.                     │
│                                                                           │
│   ┌──────────┬──────────┬──────────┬──────────┬──────────┐                │
│   │  MVP-    │ Feature- │Verticals │ Journey- │  Risk-   │                │
│   │  lean    │ complete │          │  first   │  first   │                │  144px
│   │  🧃       │   🧱     │   🪜      │   🗺️     │   🛡️     │                │
│   │ Smallest │Everything│Slice by  │ Follow a │ Cover    │                │
│   │ shippable│ in first │ user-kind│ real user│ scariest │                │
│   │ surface  │ release  │ first    │ all the  │ path     │                │
│   │          │          │          │ way in   │ first    │                │
│   └──────────┴──────────┴──────────┴──────────┴──────────┘                │
│                                                                           │
│   ┌─────────────────────────────────────────────────────────────────┐     │
│   │  Pinned to this race (from Bin):                                │     │
│   │  • brief.md (8.2KB)        [Unpin]                              │     │
│   │  • Nothing else pinned. Drag assets here to add context.        │     │
│   └─────────────────────────────────────────────────────────────────┘     │
│                                                                           │
│   Est. $0.18 · 45s · 5 agents (Sonnet)                                    │
│                                                                           │
│   [ ← Back ]                                  [ Start race ▶ ]            │
└───────────────────────────────────────────────────────────────────────────┘
```

On `Start race` → navigate to `/studio/p/[projectId]` with `?phase=stories&status=running`. Main Studio screen takes over.

**Microcopy:**

| Slot | EN | DE |
|---|---|---|
| H1 | `Five slicing philosophies will race on your brief.` | `Fünf Slicing-Philosophien rennen gegen dein Briefing.` |
| Sub | `You pick one. Losers persist as losers/stories-*.` | `Du pickst eine. Verlierer bleiben als losers/stories-* erhalten.` |
| Pin empty | `Nothing else pinned. Drag assets here to add context.` | `Nichts weiter gepinnt. Ziehe Assets hierher für Kontext.` |
| CTA | `Start race ▶` | `Race starten ▶` |
| Cost-tag | `Est. $0.18 · 45s · 5 agents (Sonnet)` | `Geschätzt $0.18 · 45s · 5 Agenten (Sonnet)` |

---

## 3. Studio Main Screen — Three-Pillar Layout

### 3.1 Full-screen wireframe with measurements (running state)

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│ [PP] acme/customer-portal     Brief │ Stories │ Stack │ Repo │ Build │ Q │ R   ●DIR  │ 56px
├──────┬────────────────────────────────────────────────────────────────┬──────────────┤
│      │                                                                │              │
│ BIN  │                        STAGE                                   │  INSPECTOR   │
│ 280  │                        flex (min 720)                          │  320         │
│      │                                                                │              │
│ ┌──┐ │  STORIES · RACE RUN #1 · Running 0:23 / ~0:45 · Sonnet · $0.11 │ ┌──────────┐ │
│ │📄│ │  ──                                                            │ │Rationale │ │
│ │br│ │ ┌────────┬────────┬────────┬────────┬────────┐                 │ │AC        │ │
│ │ie│ │ │   1    │   2    │   3    │   4    │   5    │                 │ │Persona   │ │
│ │f │ │ │MVP-lean│Feature │Verticls│Journey │Risk-   │                 │ │Diff      │ │
│ └──┘ │ │  🧃    │  🧱    │  🪜    │  🗺️    │  🛡️    │   (cards 176h)  │ │●Chat     │ │
│ pin  │ │Running │Running │Running │Running │Running │                 │ └──────────┘ │
│      │ │ ~~     │  ~     │   ~~~  │   ~    │  ~~    │                 │              │
│ ┌──┐ │ │ 6 st…  │ 12 st… │ 4 vrt… │ 3 jrn… │ 5 rsk… │                 │ [content    ]│
│ │🖼│ │ │ $0.02  │ $0.03  │ $0.02  │ $0.02  │ $0.02  │                 │              │
│ │lg│ │ └────────┴────────┴────────┴────────┴────────┘                 │              │
│ │o │ │ ───── big-preview lane (of focused/hovered card) ───           │              │
│ └──┘ │ ┌──────────────────────────────────────────────────────────┐   │              │
│      │ │  (empty until a card is focused or Space is pressed)     │   │              │
│ ┌──┐ │ │                                                          │   │              │
│ │🎨│ │ │  Focus a card or press Space to expand.                  │   │              │
│ │wi│ │ └──────────────────────────────────────────────────────────┘   │              │
│ │re│ │                                                                │              │
│ └──┘ │ [ Re-race  (R) ]    [ Diversity: 0.74 ✓ ]    [ Budget: $0.11 ]│              │
│      │                                                                │              │
│ +Add │                                                                │              │
├──────┴────────────────────────────────────────────────────────────────┴──────────────┤
│ TIMELINE                                                                              │ 88px
│ ●──●──●──●──○──◌                                 BUDGET  ████▒▒▒▒▒▒ 22% · $8.78/$40  │
│ Brief Stor Sta Rep Build Release                                                      │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

**Column measurements:** Bin 280px fixed, Stage flex (≥720px), Inspector 320px fixed, total min-width 1320px. Below 1320 → Inspector collapses to 56px edge-rail (icon-only tabs); below 1100 → Bin collapses too; below 900 → mobile fallback says "Studio is desktop-only for now. Open on a laptop, or continue in read-only mode." (V2.5 does not ship a mobile build; this is explicit in §13).

**Heights:** Top nav 56px. Bottom dock 88px (timeline 44px + budget-bar 44px stacked). Race-card 176px (8px gap, 5 cards fit in 720px Stage at `(720 - 4*8)/5 = 137px` wide → too narrow; we set Stage min-width to 920px so each card is ~176px × 176px square). Big-preview lane 320px.

### 3.2 States

#### Empty state (brand-new project, no phase run yet)

```
┌──────┬────────────────────────────────────────────────────┬──────────────┐
│ BIN  │                                                    │  INSPECTOR   │
│ ┌──┐ │      Nothing has raced yet.                        │  (empty —    │
│ │📄│ │                                                    │  pick a      │
│ │br│ │      Start the Stories race to see 5 takes on      │  candidate   │
│ │ie│ │      your brief. It takes ~45s and ~$0.18.         │  to see      │
│ │f │ │                                                    │  Rationale,  │
│ └──┘ │      [ Start Stories race ▶ ]                      │  AC, Chat.)  │
│      │                                                    │              │
│ +Add │      (Already have a brief picked? Edit it in      │              │
│      │      the Bin on the left.)                         │              │
├──────┴────────────────────────────────────────────────────┴──────────────┤
│ ○──○──○──○──○──○   Brief  Stories  Stack  Repo  Build  Release          │
│                                       BUDGET  ▒▒▒▒▒▒▒▒▒▒ 0% · $0/$40    │
└──────────────────────────────────────────────────────────────────────────┘
```

#### Running state (cards animate, progress bars fill, per-card cost-tags climb)

Race-cards use same skeleton as V2.0 `AgentCard` with an additional `~~` wave at the bottom that fills with generated-story-count as they stream. Per-card cost updates every 500ms. Diversity-judge score appears in Stage footer only after all 5 are `done`.

#### Picked state (one card is selected, others dim to 40% opacity)

```
│ ┌────────┬────────┬════════┬────────┬────────┐                          │
│ │ 1 ░░░  │ 2 ░░░  │║ 3 ✦  ║│ 4 ░░░  │ 5 ░░░  │                          │
│ │ dimmed │ dimmed │║PICKED║│ dimmed │ dimmed │                          │
│ │        │        │║ 4    ║│        │        │                          │
│ │        │        │║verts ║│        │        │                          │
│ └────────┴────────┴════════┴────────┴────────┘                          │
│   Loser    Loser    WINNER   Loser    Loser                              │
│                                                                          │
│ [ Advance to Stack → ]  [ Re-race with note (R) ]  [ Branch from pick ]  │
```

Winner card has 2px border glow (`persona-accent` of Verticals philosophy, e.g. `#A78BFA`), `LOSER` pill on others. Inspector auto-switches to the winner's Rationale tab. Timeline dot at Stories position goes from hollow `◌` to filled `●`.

#### Branched state (second timeline track appears)

```
│ TIMELINE                                                                 │
│  main  ●──●──●──●──○──◌    (Brief Stor-v2 Stack Repo …)                 │
│        │   │                                                             │
│        │   └──branch from pick                                           │
│        │                                                                 │
│  b1    └──●──●──○          (Brief Stor-v1-alt Stack-alt …)              │
│                                                                          │
│          [ Switch to branch b1 ] [ Merge branch b1 into main ]          │
```

Second-track height 44px, indented 24px, distinct hue (`#E879F9` hairline). Only one track active at a time — clicking an inactive track swaps the Stage/Inspector to that branch's current phase.

### 3.3 Phase-tab bar (detail)

```
│  Brief ● │ Stories ● │ Stack ● │ Repo ● │ Build ◉ │ Quality ◌ │ Release ◌│
│  done    │ done      │ picked  │ done   │ running │ pending   │ pending  │
│  ✓       │ ✓         │ ✓       │ ✓      │ ~~~~    │           │          │
```

- `●` = phase complete.
- `◉` = phase running (animated pulse).
- `◌` = phase pending/locked.
- Skip-with-cost shown on hover: hovering a pending phase with a skippable predecessor shows `"Skipping Stack → +34% re-races in Build (historical avg)"` — didactic, not blocking.

---

## 4. Stage Card Spec (per phase type)

Every race uses a 5-card row, but the card's body differs by phase. All cards share chrome: top hairline accent, persona icon top-left, candidate-number pill top-right, status strip, cost-tag bottom-left, "Inspect →" bottom-right. Card size 176×176px (running/pending), auto-height up to 320px (done, with body content).

### 4.1 Story-card (Phase 2: Story Generation)

```
┌────────────────────────┐
│ ━━━━ (accent hairline) │
│ 🧃 [candidate 1/5]     │
│ MVP-lean                │
│ ──                     │
│ ● 6 stories            │   status strip: count of stories
│                        │
│ 1. User can sign up    │   top-3 story titles, truncated
│ 2. User sees dashboard │
│ 3. User creates item   │
│ ⋯ +3 more              │
│                        │
│ $0.02 · 38s · Sonnet   │
│                 Inspect→│
└────────────────────────┘
```

**Inspector tabs when Story-card is focused:** Rationale (1 paragraph why this slicing), AC (each story's acceptance criteria), Persona (which philosophy drove this, 1 sentence), Diff (n/a for stories — hidden), Chat (per-candidate chat to refine *this* story-set before picking).

### 4.2 Stack-card (Phase 4: Stack Decision — V2.7 race, V2.5 is linear with `show-alternatives`)

```
┌────────────────────────┐
│ ━━━━                   │
│ 🏭 [candidate 2/5]     │
│ Batteries-included     │
│ ──                     │
│ Next.js + Postgres     │   top-3 stack components
│ + Tailwind + shadcn    │
│ + Prisma               │
│                        │
│ ⚖ trade-off            │   one-line trade-off
│ "Fast to ship, hard    │
│ to move off Vercel."   │
│                        │
│ $0.04 · 52s · Opus     │
│                 Inspect→│
└────────────────────────┘
```

In V2.5, Stack is linear — the Stage shows *one* card (centered, 440px wide) labeled `Default: Batteries-included` with a secondary link `Show 2 alternatives →` that expands a horizontal scroller of placeholder-cards (templates not yet built, but the UI shape is there so V2.7 is a data-change, not a UI-change).

**Inspector tabs:** Rationale (ADR-style: context / decision / consequences), AC (none — hidden), Persona (ideology), Diff (would show scaffold-diff if re-running, else n/a), Chat (ask this stack "what happens if I add Stripe later").

### 4.3 Implementation-card (Phase 6: Story-Implementation — today's V2.0 card, mostly unchanged)

```
┌────────────────────────┐
│ ━━━━                   │
│ 🔨 [candidate 3/5]     │
│ UX-King                │
│ the design-lover       │
│ ──                     │
│ ● 4 files · +128/-12   │
│                        │
│ Summary:               │
│ Added signup form with │
│ shadcn inputs + Zod…   │
│                        │
│ ▶ Live preview         │   (daytona live pill, existing V2.0 behavior)
│                        │
│ $0.18 · 2m10s · Opus   │
│                 Inspect→│
└────────────────────────┘
```

Inherits all V2.0 `AgentCard` behavior. Inspector's Preview tab shows iframe; Diff tab shows files; Chat tab is the existing `ChatPane`. New vs V2.0: the Chat tab is **inside the Inspector**, not a modal overlay.

### 4.4 Wireframe-card (Phase 3: Wireframes — V3.0 opt-in, V3.5 if raced)

```
┌────────────────────────┐
│ ━━━━                   │
│ 🎨 [candidate 2/5]     │
│ Dashboard-first        │
│ ──                     │
│ ┌──────────────────┐   │
│ │  ░░░░ ▒▒▒▒ ░░░  │   │   thumbnail of generated PNG
│ │  ▓▓▓▓ ████ ▓▓▓  │   │   (160×96, actual image)
│ │  ░▒▓░ ▓▒░▓ ░▒▓  │   │
│ └──────────────────┘   │
│ 3 screens · 1 flow     │
│                        │
│ $0.08 · 28s · Image-m. │
│                 Inspect→│
└────────────────────────┘
```

Inspector's Diff tab shows wireframe-diff (pixelmatch overlay of current vs prior); Preview tab shows full-size wireframe; AC tab shows which Stories this wireframe covers (cite by Story ID).

### 4.5 Card interactions (all types)

- **Click** → focus card; Inspector swaps to this candidate.
- **Focus + Space** → big-preview lane expands the focused card (live iframe for Implementation, full-size wireframe for Wireframe-card, markdown render for Story/Stack).
- **1–5** (number keys) → pick candidate *n* directly (works from anywhere on the page when not in a text input).
- **R** → re-race with note (opens inline note-field above the cards; prior pick auto-attached per principle #5).
- **Cmd+K** → command palette.

---

## 5. Inspector Tabs Spec

The Inspector is always 320px wide, right-pinned, with a 5-tab header. Tab visibility depends on phase:

| Tab | Stories | Stack | Wireframe | Implementation | Quality | Release |
|---|---|---|---|---|---|---|
| Rationale | ✓ | ✓ ADR-style | ✓ | ✓ | ✓ | ✓ |
| AC | ✓ per-story | — | ✓ covers | ✓ runs AC | ✓ fix-AC | ✓ release AC |
| Persona | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| Diff | — | — | ✓ pixel-diff | ✓ code-diff | ✓ code-diff | — |
| Chat | ✓ per-cand | ✓ per-cand | ✓ per-cand | ✓ per-cand | ✓ per-cand | — |

### 5.1 Rationale tab — wireframe

```
┌──────────────────────────────────┐
│ Rationale · AC · Persona · Diff  │
│ ●Chat                             │
├──────────────────────────────────┤
│                                  │
│ Why MVP-lean here                │
│ ──                                │
│                                  │
│ Your brief flags "customer demo  │
│ in 6 weeks" and no monetisation. │
│ MVP-lean picks 6 stories that    │
│ get you to "signup → first       │
│ value" and defers billing.       │
│                                  │
│ Trade-offs:                      │
│ • Billing arrives late —         │
│   re-race risk in Build.         │
│ • No audit log → redo for        │
│   enterprise buyers.             │
│                                  │
│ Cites:                           │
│ • brief.md §2 "customer demo"    │
│ • brief.md §4 "solo founder"     │
│                                  │
│ Generated in 38s with Sonnet     │
│ · $0.02 · [View trace]           │
└──────────────────────────────────┘
```

### 5.2 AC tab — acceptance criteria per story

```
┌──────────────────────────────────┐
│ Rationale · ●AC · Persona · Diff │
├──────────────────────────────────┤
│ Story 1 · User can sign up       │
│ ──                                │
│ [ ] Form has email + password    │
│ [ ] Password is ≥8 chars         │
│ [ ] Confirmation email sent      │
│ [ ] Rate-limit: 5/hour/IP        │
│     · flagged by Risk-first      │
│                                  │
│ Story 2 · User sees dashboard    │
│ [ ] …                            │
│                                  │
│ [ Edit AC ]   [ Add a criterion ]│
└──────────────────────────────────┘
```

**Edit AC** opens an EditOverlay (per principle #3: non-destructive — original race-output preserved).

### 5.3 Persona tab — "why this squad"

```
┌──────────────────────────────────┐
│ Rationale · AC · ●Persona · Diff │
├──────────────────────────────────┤
│ 🧃 MVP-lean                      │
│ ──                                │
│ "Smallest shippable surface.     │
│ If you can't demo it in 5min,    │
│ it's not in."                    │
│                                  │
│ Good for:                        │
│ • Pre-PMF validation             │
│ • Solo founders on a deadline    │
│                                  │
│ Bad for:                         │
│ • Enterprise sales (needs SSO    │
│   + audit on day 1)              │
│ • Regulated domains              │
│                                  │
│ [ Swap philosophy → ] opens      │
│ a squad-override dialog.         │
└──────────────────────────────────┘
```

### 5.4 Diff tab — code-diff (Implementation) / pixel-diff (Wireframe)

```
┌──────────────────────────────────┐
│ Ration. · AC · Persona · ●Diff   │
├──────────────────────────────────┤
│ 4 files changed                  │
│ ──                                │
│ ▾ app/signup/page.tsx  +82/-0    │
│   @@ 1,0 +1,82 @@                │
│   + import { z } from 'zod'      │
│   + …                            │
│ ▸ app/signup/form.tsx  +46/-12   │
│ ▸ lib/auth.ts          +0/-0     │
│ ▸ prisma/schema.prisma +4/-0     │
└──────────────────────────────────┘
```

Same component as V2.0's per-file view in `ComparePanel`, lifted into a tab.

### 5.5 Chat tab — per-candidate iterate

```
┌──────────────────────────────────┐
│ Ration. · AC · Persona · Diff    │
│ ●Chat                             │
├──────────────────────────────────┤
│ Iterate with 🧃 MVP-lean         │
│ 3/20 turns · $0.04 spent         │
│ ──                                │
│ [user] make story 2 smaller      │
│                                  │
│ [asst] Split story 2 into 2a     │
│        (list) + 2b (detail).     │
│        Applied. +12/-4 in        │
│        stories.md.               │
│        ✓ Applied · $0.008        │
│                                  │
│ [ Ask this take to refine… ]     │
│ [send ↑]                         │
└──────────────────────────────────┘
```

Reuses V2.0 `ChatPane` component wholesale; prop changes: it now accepts `raceId + candidateId` instead of `partyId + personaId`, but the SSE protocol, turn-cap (20/party), and bubble rendering are unchanged. **This is the key anti-pattern defense:** chat is a *tab inside a candidate inspection*, never a fullscreen view, never a sidebar that persists across phases.

---

## 6. Timeline Interaction Spec

### 6.1 Anatomy

```
│ TIMELINE  (height 44px)                                                   │
│  main  ●──●──●──●──○──◌                  ↑autopilot·3  ↓scrub    [1x ▾]  │
│        Brf  Stor Stk Rep Bld Rel                                         │
│         ^click=open phase                                                 │
│         ^dbl-click=branch-from-here                                       │
│                                                                           │
│  b1    └──●──●──○   (inactive, 40% opacity unless hovered)               │
```

- **Commit-dot** = one picked race-result. Hollow `◌` = not run yet. Filled `●` = picked.
- **AP-badge** = small `[AP]` pill above dot for autopilot-picks (satisfies v2.0 §6 spec).
- **Hover a dot** → tooltip with: phase name, philosophy picked, cost, timestamp, link `[Open] [Branch from here]`.
- **Double-click a dot** → Branch-from-here dialog (§6.3).
- **Scrub handle** → drag along the spine to preview historical state; Stage + Inspector follow (read-only). Release re-pins to latest, unless you `[ Pin this view ]` which creates a branch-candidate.

### 6.2 Playback controls

`[1x ▾]` speed dropdown (0.5x / 1x / 2x / 4x) for Demo-Mode-Replay only — in live sessions it's hidden.

### 6.3 Branch-from-here dialog

```
┌────────────────────────────────────────────────────┐
│  Branch from Stories pick #1                       │
│  ──                                                 │
│                                                    │
│  You picked MVP-lean. Branching restarts the race  │
│  from this point with a new note. Everything after │
│  this pick lives on a new timeline track.          │
│                                                    │
│  Note to diversify:                                │
│  ┌──────────────────────────────────────────┐      │
│  │ What if we go enterprise-first instead?  │      │
│  └──────────────────────────────────────────┘      │
│                                                    │
│  Est. $0.18 · 45s                                  │
│                                                    │
│  [ Cancel ]          [ Start branched race ▶ ]     │
└────────────────────────────────────────────────────┘
```

This is the only modal in the Studio. It is modal because branching is reversibility-expensive (creates a whole new track) — the user deserves the pause.

**Microcopy:**

| Slot | EN | DE |
|---|---|---|
| Title | `Branch from ${phase} pick #${n}` | `Verzweigen ab ${phase}-Pick #${n}` |
| Body | `You picked ${philosophy}. Branching restarts the race from this point with a new note. Everything after this pick lives on a new timeline track.` | `Du hast ${philosophy} gewählt. Verzweigen startet das Race mit einer neuen Notiz neu. Alles nach diesem Pick lebt auf einem neuen Zeitstrahl.` |
| Note placeholder | `What if we go enterprise-first instead?` | `Was, wenn wir stattdessen Enterprise-first gehen?` |
| CTA | `Start branched race ▶` | `Verzweigtes Race starten ▶` |

### 6.4 Autopilot pick-badges

```
│ main  ●──●AP──●AP──●──○──◌                                                │
│       Brf  Stor  Stk  Rep  Bld  Rel                                       │
│              ^auto-picked   ^auto-picked  ^director-picked                │
```

Hover AP-dot → tooltip `Auto-picked at t+0:23 — Diversity-Judge + AC-fit-score. [View decision trace]`. The decision-trace is a read-only Inspector-view showing the judge's scores for each candidate.

---

## 7. Budget-Bar Spec

### 7.1 Anatomy

```
│ BUDGET  ████████▒▒▒▒▒▒▒▒▒▒ 47% · $18.92/$40 · 6 races left @ $3.50 avg  │ 44px
│         ^filled    ^remain                     ^projection               │
```

- **Fill color** by zone: 0–50% `#14B8A6`, 50–75% `#E879F9`, 75–90% `#FF6B35` (orange), 90–100% `#ef4444` (red).
- **Click** → drawer slides up from dock showing per-phase, per-candidate, per-model spend breakdown.

### 7.2 Soft-watermark UI (50% / 75% / 90%)

Toast at bottom-right, 320px wide, 4s auto-dismiss:

```
┌──────────────────────────────────────┐
│ ⚠ Budget at 75% — $30 of $40 spent   │
│                                      │
│ Remaining budget supports ~3 more    │
│ races at current avg cost.           │
│                                      │
│ [ Top up ]   [ See breakdown ]       │
└──────────────────────────────────────┘
```

**Microcopy per watermark:**

| % | EN | DE |
|---|---|---|
| 50% | `Budget at 50% — halfway. You're on pace.` | `Budget zu 50% — Halbzeit. Alles im Zeitplan.` |
| 75% | `Budget at 75% — $30 of $40 spent. Remaining budget supports ~3 more races.` | `Budget zu 75% — $30 von $40 verbraucht. Reicht für ca. 3 weitere Races.` |
| 90% | `Budget at 90% — top up before the next race, or finalise what you have.` | `Budget zu 90% — aufstocken vor dem nächsten Race, oder mit dem Jetzigen abschließen.` |

### 7.3 Hard-cap halt UI (100%)

```
┌──────────────────────────────────────────────────────────────────┐
│  ⛔ Hard-cap reached — no new races will start                    │
│  ──                                                               │
│                                                                  │
│  In-flight races (2) will complete and persist as losers.        │
│  Your picks so far are safe.                                     │
│                                                                  │
│  [ Top up $20 → $60 ]  [ Top up $40 → $80 ]  [ Custom ]          │
│  [ Finalise here and open PR of current picks ]                  │
│                                                                  │
│  (Autopilot has been paused. Director mode can still pick from   │
│  existing candidates.)                                           │
└──────────────────────────────────────────────────────────────────┘
```

This is a *banner*, not a modal — it docks at the top of the Stage and pushes the cards down 96px. Rationale: it's non-blocking for reading/picking; only new races are blocked.

### 7.4 Top-up flow

Click `Top up` → slide-over from right (480px wide):

```
│  Top up                                         [×]  │
│  ──                                                   │
│                                                       │
│  Current budget:  $40                                │
│  Spent so far:    $40   (100%)                       │
│                                                       │
│  Add:  [ $20 ] [ $40 ]  [ $100 ]  [ Custom ]         │
│                                                       │
│  ● Pay with card on file (…4242)                     │
│  ○ Use BYOK credit ($12.80 available)                │
│                                                       │
│  [ Confirm $40 top-up ]                              │
│                                                       │
│  "You'll see $80 as the new project budget.          │
│   Autopilot will resume automatically."              │
```

---

## 8. Autopilot Mode UI

### 8.1 Mode toggle (top nav)

```
│ …project-title         Director | ●Autopilot        ●pause   │
```

Click `Autopilot` → confirm dialog `Switching to Autopilot — the studio will pick and continue until the next intervention point (reversibility cliff / budget watermark / AC failure). Confirm?`. On confirm, the mode-pill pulses `#A78BFA`.

### 8.2 Stage overlay during Autopilot race

The Stage still shows 5 cards racing, but *a countdown overlay* appears on the Stage-footer:

```
│ ┌────────┬────────┬────────┬────────┬────────┐                           │
│ │  1     │  2     │  3     │  4     │  5     │                           │
│ │  ●     │  ●     │  ●     │  ●     │  ●     │   (all done)              │
│ │ done   │ done   │ done   │ done   │ done   │                           │
│ └────────┴────────┴────────┴────────┴────────┘                           │
│                                                                          │
│ ╔══════════════════════════════════════════════════════════════════╗    │
│ ║  Autopilot will pick candidate 3 (Verticals)  ·  Auto-pick in 14s║    │
│ ║  Diversity: 0.81 ✓   ·   AC-fit: 0.92 ✓   ·   Cost-fit: 0.87 ✓  ║    │
│ ║                                                                  ║    │
│ ║  [ Take over — I'll pick ]       [ Accept now — skip countdown ]║    │
│ ╚══════════════════════════════════════════════════════════════════╝    │
```

**Measurements:** overlay 96px tall, 4px accent border, pulsing at 1Hz. Countdown 15s by default (configurable in policy: Conservative 30s / Balanced 15s / Aggressive 5s).

**Microcopy:**

| Slot | EN | DE |
|---|---|---|
| Main | `Autopilot will pick candidate ${n} (${philosophy})` | `Autopilot wählt Kandidat ${n} (${philosophy})` |
| Countdown | `Auto-pick in ${s}s` | `Auto-Pick in ${s}s` |
| Primary CTA | `Take over — I'll pick` | `Übernehmen — ich wähle` |
| Secondary CTA | `Accept now — skip countdown` | `Jetzt annehmen — Countdown überspringen` |
| Judge scores | `Diversity: ${d} ✓   AC-fit: ${a} ✓   Cost-fit: ${c} ✓` | `Diversität: ${d} ✓   AC-Fit: ${a} ✓   Kosten-Fit: ${c} ✓` |

### 8.3 Intervention-prompt (reversibility cliff)

Modal (this is one of the two modals allowed, alongside branch-from-here):

```
┌──────────────────────────────────────────────────────────────────┐
│  ⚠ Reversibility cliff — Autopilot needs you                      │
│  ──                                                               │
│                                                                  │
│  The next step creates a real GitHub repo under                  │
│  acme/customer-portal via the PatchParty GitHub App.             │
│                                                                  │
│  This is sticky: we cannot undo the repo creation.               │
│                                                                  │
│  Stack picked: Batteries-included (Next + Postgres + shadcn)     │
│  Cost to proceed: ~$0.08                                         │
│                                                                  │
│  [ Pause — I'll review ]   [ Proceed with Genesis ▶ ]            │
│                                                                  │
│  (Autopilot will resume after this step unless you pause.)       │
└──────────────────────────────────────────────────────────────────┘
```

**Triggers** (all from v2.0 §3):
- DB schema migration about to apply.
- GitHub repo creation (Genesis).
- Secret write (env vars, Vault).
- Deploy/release to production.
- AC failure during Implementation.
- Budget watermark 90%.
- Quality-gate failure.

### 8.4 "Take over" handoff

Clicking `Take over — I'll pick` during the countdown:
1. Countdown freezes.
2. Overlay dissolves (200ms).
3. Mode-pill in top nav switches to `Director` with a small `(paused Autopilot)` suffix.
4. Inspector auto-switches to the Autopilot-recommended candidate with a banner at the top:
   ```
   │ ▸ Autopilot would have picked this one. Here's why:  [v]  │
   │   Diversity 0.81, AC-fit 0.92, cost-fit 0.87.             │
   │   [ Resume Autopilot ]                                    │
   ```
5. User can pick a different candidate (`1`–`5`) or accept this one; either way Autopilot resumes on next race unless explicitly paused.

---

## 9. Bin Spec

### 9.1 Anatomy

```
┌──────┐
│ BIN  │ 280px wide (collapsible to 56px)
│ ──   │
│      │
│ PIN  │  ← Pinned section (assets flow into every race's context)
│ ┌──┐ │
│ │📄│ │ 88×88 thumb + 14px label below
│ │br│ │ hover: show size, last-updated, citation-count
│ └──┘ │ right-click: Pin / Unpin / Replace / Delete / Cite in current race
│ brief│
│ 8.2KB│
│      │
│ ━━━━━│
│      │
│ ALL  │
│ ┌──┐ │
│ │🖼│ │ wireframe-01.png
│ │wi│ │
│ └──┘ │
│      │
│ ┌──┐ │
│ │🎥│ │ demo-v1.mp4  (Seedance-2, V3.5)
│ │dm│ │
│ └──┘ │
│      │
│ ┌──┐ │
│ │📝│ │ ADR-003
│ │ad│ │
│ └──┘ │
│      │
│ [+Add]│  drag-drop or click-to-upload
└──────┘
```

### 9.2 Asset types & icons (Lucide)

| Type | Icon | Origin | Max size |
|---|---|---|---|
| Brief (md/txt/pdf) | `FileText` | User upload or Brief-phase output | 10MB |
| Wireframe (png/svg) | `Image` | Wireframe-phase generator or upload | 4MB |
| Logo / brand asset | `Palette` | Upload | 4MB |
| Seedance-2 video preview | `Video` | Seedance-2 generator | 50MB |
| ADR / decision-log | `ScrollText` | Auto-generated per pick | n/a |
| Code snapshot | `Code2` | Git branch alias | n/a |
| Marketing copy | `PenLine` | Sonnet from Brief | n/a |
| Story-set | `ListChecks` | Stories-race pick | n/a |

### 9.3 Pinning model

- An asset in the **PIN** section is included as standing context in every subsequent race of this project (up to a token budget shown in the Bin footer).
- Max 10 pinned assets. Exceeding prompts: `You've pinned 10 assets. Unpin one to pin this. Pinned assets flow into every race — too many dilutes the signal.` (DE: `Du hast 10 Assets gepinnt. Entferne eines, um dieses zu pinnen. Zu viele verwässern das Signal.`)
- Unpinned assets are still citable per-race (drag into Stage → "pin to this race only").

### 9.4 Citation in race output

When a race-candidate references a pinned asset, the Inspector's Rationale tab surfaces it inline:

```
│ Cites:                                │
│ • brief.md §2 "customer demo"   [📄]  │  ← click opens Bin asset detail
│ • wireframe-01.png               [🖼]  │
```

Cite-tags also appear as hover-annotations on the race-card itself (bottom border, 12px text).

### 9.5 Seedance-2 upload/preview (V3.5)

```
┌──────────────────────────────────────────────────────────┐
│  Generate demo video with Seedance-2                     │
│  ──                                                       │
│                                                          │
│  Source screenshots: 8 auto-captured from latest preview │
│  Voiceover script:                                       │
│  ┌──────────────────────────────────────────────────┐    │
│  │ "Meet Acme Portal — signup, first project,       │    │
│  │ done in 30 seconds." (generated from Stories)    │    │
│  └──────────────────────────────────────────────────┘    │
│                                                          │
│  Length:    ●30s  ○60s  ○90s                             │
│  Voice:     [ EN-neutral ▾ ]                             │
│  Est. cost: $2.40 · ~3min generation                     │
│                                                          │
│  [ Generate ]    [ Cancel ]                              │
└──────────────────────────────────────────────────────────┘
```

Progress during generation appears as a new `◉` asset-tile in the Bin with a percentage counter. On done, tile swaps to a video thumbnail with play-button.

### 9.6 Bin empty state

```
│ BIN                  │
│ ──                   │
│                      │
│  Nothing here yet.   │
│                      │
│  [+ Add asset]       │
│                      │
│  Tip: paste a brief, │
│  drop a PDF, or pin  │
│  something a race    │
│  generated.          │
```

---

## 10. Custom-Agents UI (V3.0 preview)

### 10.1 Agent-create form (`/studio/agents/new`)

```
┌──────────────────────────────────────────────────────────────────┐
│  New custom agent                                                 │
│  ──                                                               │
│                                                                  │
│  Name:         [ Sven                                        ]   │
│  Tagline:      [ The German-Mittelstand veteran reviewer    ]   │
│  Icon:         [ 🛡  pick from Lucide ▾ ]                        │
│  Accent:       [ ● #6B7280 (gray)  pick ▾ ]                      │
│                                                                  │
│  Persona prompt:                                                 │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ You review any design or code change for:                │    │
│  │  - Data-residency (must stay in EU).                     │    │
│  │  - Accessibility (DIN EN 301 549).                       │    │
│  │  - Boring tech preference: Postgres > MongoDB,           │    │
│  │    Bootstrap > Tailwind, Java > Go.                      │    │
│  │ Reply in German. Be pedantic.                            │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                  │
│  Tool allow-list:                                                │
│  [x] Read files    [x] Grep    [ ] Edit    [ ] Bash              │
│  [ ] Web search    [ ] Fetch   (sandboxed by default)            │
│                                                                  │
│  Scope:   ● This project only   ○ Global (all my projects)       │
│                                                                  │
│  [ Cancel ]                                [ Save agent ]        │
└──────────────────────────────────────────────────────────────────┘
```

### 10.2 Squad composer (drag-drop)

```
┌──────────────────────────────────────────────────────────────────┐
│  Compose a squad                                                  │
│  Used for: [ Auth-related stories ▾ ]                             │
│  ──                                                               │
│                                                                  │
│  Available agents (drag →):              Squad slots (5 max):    │
│  ┌────────────┐ ┌────────────┐           ┌────┬────┬────┬────┬┐  │
│  │ 🔨 Hackfix │ │ 🛡 Sven    │           │ 🛡 │ 🛠 │ 🧃 │ +  ││  │
│  └────────────┘ └────────────┘           │Sven│OWASP│MVP │    ││  │
│  ┌────────────┐ ┌────────────┐           └────┴────┴────┴────┴┘  │
│  │ 🧃 MVP-lean│ │ 🛠 OWASP-bo│                                    │
│  └────────────┘ └────────────┘           Diversity score: 0.73 ✓ │
│  ┌────────────┐                          (>0.5 = acceptable)     │
│  │ + New agent│                                                  │
│  └────────────┘                                                  │
│                                                                  │
│  Share: [ Export as .md ]  [ Copy shareable text block ]         │
│  (No marketplace — explicit anti-feature. Share via file.)       │
│                                                                  │
│  [ Cancel ]                      [ Save as default for Auth ]    │
└──────────────────────────────────────────────────────────────────┘
```

**Microcopy for share warning:**

`Shared squads run with the same permissions they had on your machine. Review tool allow-list before using a squad a colleague sent you.` (DE: `Geteilte Squads laufen mit denselben Berechtigungen wie bei dir. Prüfe die Tool-Liste, bevor du eine Kollegen-Squad nutzt.`)

### 10.3 "Which races used me" per-agent telemetry

Each agent's detail page shows a sparkline + table:

```
│  🛡 Sven                                                          │
│  Used in 14 races · won 3 · picked 2 · cost $0.42               │
│                                                                  │
│  ●●●●●●●●●●●●●● (last 14)                                        │
│                                                                  │
│  | Date      | Project     | Phase      | Result       | Cost  | │
│  | 2026-04-17| acme/portal | Stories    | Lost (div 1) | $0.02 | │
│  | 2026-04-17| acme/portal | Impl-auth  | Won, picked  | $0.18 | │
│  | …                                                            | │
```

---

## 11. Demo-Mode-Replay Storyboard

Target duration: **87 seconds.** Recorded PartyEvent stream from a reference "acme/customer-portal" run. No live LLM calls. Accessible at `/studio/demo` with `[Replay] [Pause] [1x ▾]` controls.

| t | Visible | Audio/narrator | Microcopy on-screen |
|---|---|---|---|
| 0:00 | Black fade-in → studio empty state with brief.md already in Bin | _(none — tool is silent)_ | — |
| 0:03 | Brief appears in Bin (slide-in), brief.md opens briefly in center, then slides to pin | — | Bin toast: `brief.md pinned` |
| 0:08 | Phase-tabs highlight "Stories", 5 cards materialise as `Running` | — | `STORIES · RACE · Sonnet · 5 agents` |
| 0:12 | Cards fill top-down: each shows story-count ticking up. Cost-tags climb. | — | Per-card: `2 st…`, `4 st…`, `6 st…` |
| 0:32 | All 5 cards `done`. Diversity-judge green: 0.74. | — | Stage footer: `Diversity: 0.74 ✓` |
| 0:35 | User-ghost hovers card 3 (Verticals), Inspector auto-populates Rationale | — | Inspector: Rationale tab content |
| 0:40 | User-ghost presses `3` → card 3 picks, others dim, Timeline dot fills | _click sound_ | `Picked: Verticals` |
| 0:43 | Phase-tab jumps to "Stack", one card appears (V2.5 linear), 1.2s later `picked` | — | `Default: Batteries-included` |
| 0:48 | Phase-tab jumps to "Repo", spinner, 2s later Bin gets `repo-url.md` asset, Timeline dot fills | _subtle chime_ | `Repo created: acme/customer-portal` |
| 0:55 | Phase-tab "Build" — 5 implementation cards race, progress bars fill in parallel | — | `BUILD · RACE · Opus · 5 personas` |
| 1:15 | All 5 done, Craftsman card has `LIVE` pill. User-ghost clicks it, big-preview iframe mounts | — | `Live in Daytona sandbox` |
| 1:20 | User-ghost clicks `Pick Craftsman — open PR` | _click sound_ | `Pull request opened` |
| 1:25 | PR URL appears, confetti-free (per §10 anti-features: no badges), timeline fully filled | — | `github.com/acme/customer-portal/pull/1` |
| 1:27 | Bottom-bar text overlay: `Brief → Repo → PR · 87s · $2.18 of $40 budget` | — | `Brief → Repo → PR · 87s · $2.18 of $40` |

Replay loops to 0:00 automatically with a 2s pause.

### Frame-by-frame fallback path (if a frame's asset fails to load)

Each frame has a static PNG fallback in `/public/demo/frames/NN.png`. A broken frame shows the fallback + text `[Replay stuck — this is the recorded end-frame of step ${n}]` — keeps the 90s promise even under degraded network.

---

## 12. Microcopy Library (consolidated)

### 12.1 Buttons (EN / DE)

| ID | EN | DE |
|---|---|---|
| `studio.primary.start_race` | `Start race ▶` | `Race starten ▶` |
| `studio.primary.pick_n` | `Pick ${name} — open PR` | `${name} wählen — PR öffnen` |
| `studio.primary.re_race` | `Re-race (R)` | `Neu starten (R)` |
| `studio.primary.continue` | `Continue → ${next}` | `Weiter → ${next}` |
| `studio.primary.advance` | `Advance to ${next} →` | `Weiter zu ${next} →` |
| `studio.secondary.take_over` | `Take over — I'll pick` | `Übernehmen — ich wähle` |
| `studio.secondary.accept_now` | `Accept now — skip countdown` | `Jetzt annehmen — Countdown überspringen` |
| `studio.secondary.branch` | `Branch from here` | `Hier verzweigen` |
| `studio.secondary.top_up` | `Top up` | `Aufstocken` |
| `studio.secondary.finalise_here` | `Finalise here and open PR of current picks` | `Hier abschließen und PR aus aktuellen Picks öffnen` |
| `studio.danger.pause_autopilot` | `Pause Autopilot` | `Autopilot pausieren` |
| `studio.neutral.cancel` | `Cancel` | `Abbrechen` |

### 12.2 Empty states

| Context | EN | DE |
|---|---|---|
| Bin empty | `Nothing here yet. Add a brief, drop a PDF, or pin something a race generated.` | `Noch nichts hier. Briefing hinzufügen, PDF ablegen oder Race-Output pinnen.` |
| Stage pre-first-race | `Nothing has raced yet. Start the Stories race to see 5 takes on your brief.` | `Noch kein Race gelaufen. Starte das Stories-Race für 5 Takes auf dein Briefing.` |
| Inspector no-selection | `Click a card or press 1–5 to inspect.` | `Karte klicken oder 1–5 drücken, um zu inspizieren.` |
| Chat tab, 0 messages | `The pick is in. Ask ${name} to refine — every turn commits and updates the preview.` | `Der Pick steht. Frag ${name} nach Anpassungen — jede Runde committed und aktualisiert die Preview.` |
| Timeline, 0 picks | `Your picks will land here. One dot per phase.` | `Deine Picks landen hier. Ein Punkt pro Phase.` |
| Agents library, 0 agents | `You haven't defined any agents yet. Start with a prompt and a tool allow-list.` | `Noch keine Agenten definiert. Starte mit einem Prompt und einer Tool-Freigabe.` |

### 12.3 Errors

| Case | EN | DE |
|---|---|---|
| Race failed (all 5 agents errored) | `All 5 agents failed — likely a provider outage. Cost refunded. [ Retry ]` | `Alle 5 Agenten fehlgeschlagen — vermutlich Provider-Ausfall. Kosten erstattet. [ Neu versuchen ]` |
| Diversity re-roll triggered | `Candidates were too similar (sim ${n}>${threshold}). Re-rolling ${k} of 5. +${s}s.` | `Kandidaten zu ähnlich (sim ${n}>${threshold}). ${k} von 5 werden neu gewürfelt. +${s}s.` |
| Hard-cap blocks new race | `You're at 100% of $${cap}. Top up or finalise — in-flight races will finish.` | `Du bist bei 100% von $${cap}. Aufstocken oder abschließen — laufende Races beenden sich.` |
| GitHub App not installed | `We need the PatchParty GitHub App installed on ${owner} to create the repo. [ Install ]` | `Wir brauchen die PatchParty GitHub-App bei ${owner} für die Repo-Erstellung. [ Installieren ]` |
| Sandbox terminated mid-chat | `Sandbox terminated. Start a new party to keep iterating.` | `Sandbox beendet. Neue Party starten, um weiter zu iterieren.` |
| BYOK key missing | `No Anthropic key on file. Add one in Settings, or use hosted credit.` | `Kein Anthropic-Key hinterlegt. In den Einstellungen ergänzen oder gehosteten Credit nutzen.` |
| Network flake during SSE stream | `Lost the live stream — reconnecting. Your picks are safe.` | `Live-Stream verloren — verbinde erneut. Deine Picks sind sicher.` |
| EU AI Act transparency notice (always visible in settings, not modal) | `PatchParty logs every decision the studio makes. You can export this log as an audit trail at any time. [ Export audit log ]` | `PatchParty protokolliert jede Studio-Entscheidung. Du kannst das Log jederzeit als Audit-Trail exportieren. [ Audit-Log exportieren ]` |

### 12.4 Cost-tag format (verbatim)

- Race-card running: `$${cost} · ${elapsed}s · ${model}`
- Race-card done: `$${cost} · ${duration}s · ${model}`
- Button pre-commit: `Est. $${cost} · ~${eta}s · ${n} agents (${model})`
- Pick button: `Pick ${name} — open PR ($${cost} spent on this take)`

---

## 13. Keyboard Shortcuts Table

| Key | Action | Context |
|---|---|---|
| `1` – `5` | Pick candidate N | Stage has a running or done race |
| `R` | Re-race (with note field) | A race is `done` or `picked` |
| `Space` | Toggle big-preview of focused card | Stage has focus |
| `←` `→` | Move focus between cards | Stage has focus |
| `↑` `↓` | Move focus between Inspector tabs | Inspector has focus |
| `Enter` | Pick focused card | Stage has focus, card is `done` |
| `Esc` | Close modal / exit big-preview / blur Inspector chat | Any context |
| `Cmd+K` / `Ctrl+K` | Command palette | Any context |
| `Cmd+/` / `Ctrl+/` | Shortcut cheat-sheet overlay | Any context |
| `Cmd+B` | Toggle Bin collapse | Any context |
| `Cmd+I` | Toggle Inspector collapse | Any context |
| `Cmd+T` | Focus timeline (scrub with ←/→) | Any context |
| `Cmd+Shift+A` | Toggle Autopilot mode | Any context (confirm dialog) |
| `Cmd+Shift+B` | Branch from currently-focused timeline dot | Timeline focus |
| `Cmd+Enter` | Send chat message | Inspector Chat tab |
| `G then S` | Go to Settings (vim-style) | Any context |
| `G then B` | Go to Bin full-screen | Any context |
| `/` | Focus textarea in wherever the primary text-input is (brief, chat, note) | Any context (if no input focused) |
| `?` | Open shortcut cheat-sheet | Any context |

### 13.1 Command palette (`Cmd+K`)

```
┌──────────────────────────────────────────────────────────────────┐
│  > start stories_                                                 │
│  ──                                                               │
│  Start Stories race               (phase action)                  │
│  Start Stack race                 (phase action, V2.7)            │
│  Start Build race                 (phase action)                  │
│  Branch from latest pick          (timeline)                      │
│  Switch to Autopilot              (mode)                          │
│  Pin brief.md                     (bin)                           │
│  Export audit log                 (settings)                      │
└──────────────────────────────────────────────────────────────────┘
```

Fuzzy-matched over: phase-actions, bin-actions, mode-toggles, nav-routes, recent picks ("Go to Stories pick #1"). Escape closes; Enter executes.

---

## 14. Open UX Questions for Round 4

1. **Should the Bin be collapsible to 0px on very wide screens, or always pinned at minimum 56px icon-rail?** Trade-off: Stage gets more room if Bin can fully hide, but assets become invisible-until-needed, undermining "Bin is the heart". Proposal: **minimum 56px always** — icon-rail, never hidden.

2. **Big-preview lane height: 320px fixed or variable?** Variable looks sleek but shifts layout on focus-change. Proposal: **fixed 320px** with internal scrolling for taller content. Revisit if users complain about the iframe being cramped.

3. **Autopilot countdown default: 15s (Balanced) — is that enough for a human to skim + take over?** Usability-test before V2.5 launch. Fallback: make it 20s if any user-test subject fails to intervene in time.

4. **Branch-from-here: should it offer a pre-filled "diversify how?" suggestion from the LLM, or leave the note field empty?** Pre-fill risks anchoring the user; empty risks low-quality branches. Proposal: empty by default, with a `Suggest a prompt` ghost-link that calls Haiku for a 1-line suggestion (~$0.001).

5. **Mode-toggle placement: top-nav pill (current) or always-visible sidebar switch?** Top-nav is discoverable, but non-obvious during a race. Proposal: **top-nav + keyboard shortcut (Cmd+Shift+A)**, which is the current plan. Revisit after Round 4 user-tests.

6. **Timeline: show model (Sonnet/Opus/Haiku) on each commit-dot as a tiny badge?** Didactic argument for yes (teaches cost-tier awareness); clutter argument for no. Proposal: **yes, but only on hover/focus** — dots stay clean by default.

7. **Custom-Agents per-project vs global scope: is the picker too nuanced for V3.0 launch?** Proposal: ship V3.0 with **per-project only**; add global scope in V3.5 when use-cases are clearer.

8. **Demo-Mode-Replay: should the user be able to pause and interact (pick a different card than the recording did), or strict-playback only?** Interactive forks are powerful but increase surface area. Proposal: **strict-playback for V2.5; interactive fork as V3.0 feature** called "Demo Sandbox".

9. **Dual-language (EN/DE) toggle placement: settings only or header pill?** Settings only keeps chrome clean; header pill signals multilingual-first. Proposal: **settings only**, with the system defaulting to browser-Accept-Language. Reassess if DE users complain they can't find it.

10. **Inspector "Chat" tab disabled after PR is opened?** Yes — the branch is frozen, further chat has nowhere to land. Show tab in disabled state with tooltip `PR is open — chat is read-only. Reopen in V3.0's "follow-up" mode.`

11. **Bin pinning limit 10 — is that the right number?** Needs token-budget math. Pinned = standing context on every race. 10 assets × ~2k tokens avg = 20k tokens just on context. Proposal: **5 pinned max for V2.5**, raise to 10 in V3.0 once context-caching lands.

12. **What happens to `losers/*` branches when the user deletes their project?** GDPR-relevant. Proposal: **hard-delete all losers-branches + race-runs + events + bin assets on project-delete**, with a 7-day soft-delete grace period for accidental deletion. Document in Privacy Policy.

13. **Color accessibility: cost-tag orange (`#FF6B35`) on `slate-950` at 75% watermark — does it hit WCAG AA?** Contrast ratio is ~5.8:1, passes AA for body text, fails AAA. Proposal: **keep the color, bump the font-weight to semibold at 75%** to compensate.

14. **Does the Stack-card V2.5-linear state (one card centered) create a visual rhythm mismatch when users later hit V2.7 and suddenly see 5 stack-cards?** Yes, probably. Proposal: in V2.5, render the single stack-card at *the same size and position* as the "first of 5" would occupy (left-aligned with 4 ghost-placeholders labeled `V2.7: 4 more architectures will race here`). Preps the eye for the change.

15. **Autopilot intervention-prompt modal — is it blocking the entire Studio, or only the Stage?** If a user has a second project running in another tab under Director mode, blocking modals across tabs would be frustrating. Proposal: **per-project-scoped modal**, rendered inside the project's Stage container, not over the whole viewport.

---

## Appendix A — Design tokens inherited from V2.0 (for implementer reference)

- **Radius:** `rounded-[7px]` everywhere except pill-badges (`rounded-full`) and hairlines (`0px`).
- **Surfaces:** `bg-slate-950` (root), `bg-slate-900/70 backdrop-blur` (cards), `bg-slate-800/60` (input), `bg-slate-950/60` (code-blocks).
- **Borders:** `border-slate-800/60` (subtle), `border-slate-700` (visible), `border-slate-600` (hover), accent-color (focus/picked).
- **Text:** `text-slate-50` (primary), `text-slate-300` (secondary), `text-slate-500` (meta), `text-slate-400` (placeholder).
- **Persona accents** (from `PERSONA_ACCENTS` in `src/app/party/[id]/page.tsx`):
  - Hackfix `#FF6B35`
  - Craftsman `#14B8A6`
  - UX-King `#E879F9`
  - Defender `#60A5FA`
  - Innovator `#A78BFA`
- **New philosophy-accents for Stories-race:**
  - MVP-lean `#14B8A6` (teal — minimal)
  - Feature-complete `#A78BFA` (violet — expansive)
  - Verticals `#E879F9` (magenta — cross-cutting)
  - Journey-first `#60A5FA` (blue — flow)
  - Risk-first `#FF6B35` (orange — warning)
- **Fonts:** `font-sans` = Inter (body), `font-mono` = JetBrains Mono (all uppercase labels, cost-tags, status strips, code).
- **Motion:** `transition-colors` for hover, `transition-all duration-200 ease-linear` for card lift/border-change, `animate-pulse` for running states, `animate-pulse-slow` for ambient brand glow.
- **Shadows:** `shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]` for card inner highlight; accent glow on selection `0 0 48px -8px ${accent}`.

## Appendix B — Component reuse plan

| V2.0 component | V2.5 usage |
|---|---|
| `PartyPage` | Becomes `/studio/p/[projectId]/page.tsx` (fork, not import — the layout is radically different). |
| `AgentCard` | Lifts to `StageCard` with a polymorphic `variant` prop (`story` / `stack` / `impl` / `wireframe`). |
| `ComparePanel` (modal) | **Removed.** Its content moves into the Inspector (three tabs: preview in big-preview-lane, code in Inspector Diff tab, chat in Inspector Chat tab). No modals for race selection per vision §6. |
| `ChatPane` | **Reused unchanged** — props extended with `raceId + candidateId`. Mounts inside Inspector Chat tab. |
| `BrandMark` | Unchanged. |
| `Spinner` | Unchanged. |
| `PreviewFrame` | Unchanged. Used in big-preview lane + Inspector big-preview. |
| `AppShell` (`/app/*`) | **Not** used in `/studio/*` — Studio has its own shell due to the three-pillar layout. Shared: auth session, sign-out button, brand-mark. |

## Appendix C — Non-functional budget

- **First paint:** ≤800ms on 3G — the Studio shell is SSR'd, race-state hydrates via SSE after.
- **Time-to-interactive:** ≤1.5s — cards render optimistic-empty while first race-events stream in.
- **SSE reconnection:** auto-retry 3× with exponential backoff; on failure show the `Lost the live stream` banner.
- **Bin asset upload:** streamed, progress bar ≤400ms-to-first-byte.
- **Timeline scrub:** 60fps during drag — all state pre-computed on race-pick, not on scrub.

— End of 03-studio-ux.md —
