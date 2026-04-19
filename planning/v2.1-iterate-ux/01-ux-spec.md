# UX Spec — Iterate Flow

Consolidated from Architect + Green-Team swarm review (2026-04-19). Concrete, commit-ready. No vague prose.

## 1. Screen layout (post-pick, desktop)

Replace the current inline `section` under the agent grid in `src/app/party/[id]/page.tsx` (lines ~443-478) with a dedicated `IteratePage` component.

**Desktop (`lg: 1024px+`):** CSS Grid `55% / 45%` inside `max-w-7xl`, `min-h-[calc(100vh-56px)]`.

- **Left (55%)** — `PreviewPane`, `sticky top-16`, `h-[calc(100vh-72px)]`
  - Top bar: `ViewportToggle` (segmented) + refresh button + truncated preview URL pill
  - Body: iframe wrapper centered inside pane
  - Bottom: `SandboxStatusStrip` (state dot: ACTIVE/IDLE_WARN/PAUSED, last commit SHA 7-char, latency)
- **Right (45%)** — `TurnColumn`, `flex flex-col`
  - Top (sticky): `IterateHeader` — persona chip + turn counter (`3/20`) + `ShipBar` button
  - Middle (scrollable): `TurnList` — array of `TurnCard` components, `space-y-3 py-4 px-5`
  - Bottom (sticky): `InputDock` — `ChipRow` + textarea + send button, `bg-slate-950/95 backdrop-blur border-t`
- **Overlay:** `DiffDrawer` — slides in from right when user clicks a file pill, `max-h-[40vh]` inside the card or floating drawer (implementer's call)
- **Overlay:** `ShipSheet` — bottom sheet (mobile) / centered modal (desktop), contains ship-PR confirm form

**Breakpoints:**

- `md` (768-1023): single column. `PreviewPane` becomes `<details>` at top (`h-[360px]` when open). `TurnColumn` below takes remaining viewport.
- `sm` (<768): `PreviewPane` becomes swipeable sheet triggered by a floating "Show preview" FAB. Viewport toggle moves into sheet header.

**Sticky vs. fixed:** use `position: sticky` inside the grid column for `PreviewPane` and `InputDock`. Avoid `position: fixed` — it breaks horizontal scroll and document flow.

## 2. Component hierarchy

```
IteratePage                              // src/app/party/[id]/iterate-page.tsx
├── IterateHeader                        // persona chip, turn counter, cost meter
├── SandboxBanner                        // replaces ResumeCard for IDLE_WARN/PAUSED/TERMINATED
├── IterateSplit                         // grid, lg:grid-cols-[minmax(0,1fr)_480px]
│   ├── PreviewPane
│   │   ├── ViewportToggle               // Desktop | Mobile segmented
│   │   ├── PreviewFrame                 // iframe with dynamic width wrapper
│   │   └── PreviewStatusStrip           // last commit, reload
│   └── TurnColumn
│       ├── TurnList                     // virtualise when turns > 10
│       │   └── TurnCard[]
│       │       ├── UserBubble           // small grey "you, 2m ago"
│       │       ├── StatusRow            // pending/applied/failed spinner/check
│       │       ├── AssistantSummary     // 1-2 line line-clamp
│       │       ├── DiffPills            // clickable, one per file in ChatTurn.diffStats
│       │       ├── CommitPill           // sha-7 + commit message
│       │       ├── CostLatencyChip      // right-aligned, tiny
│       │       └── UndoAction           // hover-visible, only on latest applied non-reverted turn
│       └── TurnListFooter               // cap notice, cumulative cost
├── DiffDrawer                           // opened by TurnCard file pill click
├── InputDock
│   ├── ChipRow                          // 5 chips
│   ├── Textarea
│   └── SendButton
└── ShipBar                              // sticky footer, full width
    ├── ShipSummary                      // "3 turns · 5 files · +78/-15 · $0.12"
    └── ShipButton                       // opens ShipSheet
```

## 3. TurnCard — the critical primitive

Every field's source must be explicit. If a source doesn't exist today, see `02-data-model-changes.md`.

```
┌── TurnCard (one per ChatTurn row) ─────────────────┐
│ [you · 2m ago]  "make the header sticky"           │  <- ChatTurn.userMessage
│                                                    │
│ [✓ Applied · 4.2s · $0.0032]                       │  <- ChatTurn.status + latencyMs + costUsd
│                                                    │
│ Made Header.tsx sticky via `position: sticky`.     │  <- ChatTurn.assistantResponse, line-clamp-2
│                                                    │
│ [Header.tsx +4 -1] [globals.css +2 -0]             │  <- ChatTurn.diffStats (new field)
│                                                    │
│ [git] 3a8f2c1  chat: make the header sticky        │  <- ChatTurn.commitSha (new field) + userMessage slice
│                                                    │
│                                   ↩ Undo           │  <- only if latest applied non-reverted
└────────────────────────────────────────────────────┘
```

**Pending state** (turn streaming): replace `StatusRow` with animated `Working…` + show each incoming `text_delta` and `tool_call` event inline. After `turn_done`, collapse tool calls into summarized file pills.

**Failed state**: red border, error message from `ChatTurn.error`, "Retry" button that re-sends the same `userMessage`.

**Reverted state** (after an Undo): strikethrough on assistant summary, grey "reverted by turn N+1" chip, pills unchanged but greyed.

## 4. DiffDrawer — expandable inline diff

**Trigger:** click a file pill on a `TurnCard`.

**Fetch:** `GET /api/party/[id]/turns/[turnIndex]/diff?path=<encoded>`. Endpoint strategy:

1. **Primary (sandbox alive):** resolve turn → `commitSha`; run `git show ${sha} -- ${safePath}` + `git show ${sha}^:${safePath}` in sandbox; build unified diff server-side; return `{ unifiedDiff, sha }`.
2. **Fallback (sandbox PAUSED/TERMINATED):** GitHub REST `/repos/{o}/{r}/commits/{sha}` using user's OAuth token; filter to the requested path.

**Render:** use `prism-react-renderer` (element-based, no `dangerouslySetInnerHTML`). Target max 400 lines of diff; scroll if longer. Show added (green) / removed (red) with line numbers.

**Cache:** one fetch per `(turnIndex, path)` tuple, keep in React state for the session. Invalidate on Undo of that turn.

## 5. Control chips (final 5)

Above the textarea, `ChipRow`. Click inserts template text into textarea (does **not** auto-send — user tweaks then hits Enter). Exception: `Undo last` triggers the undo flow directly, no textarea pass-through.

| Chip | Behavior | Inserted template |
|------|----------|-------------------|
| `Shorter` | insert template | `Make the most recent change more concise — aim for half the lines without losing behavior.` |
| `Add tests` | insert template | `Add unit tests for the files you just changed. Use the existing test runner and conventions in this repo.` |
| `Run build` | insert template | `Run \`npm run build\` and fix any errors you find.` |
| `Mobile-first` | insert template | `Review the latest change on a mobile viewport (390px). Fix any layout issues.` |
| `Undo last` | **direct action** | Calls `POST /chat/undo`; no text in textarea |

Templates are hard-coded client-side constants. **No** merge fields, **no** interpolation of filenames/branch names from the repo (security — avoids prompt injection via filename).

Styling: `py-1 px-2.5 rounded-[5px] border border-slate-700 text-[11px] font-mono uppercase tracking-[0.14em]`, hover `border-slate-500`.

## 6. ViewportToggle

Segmented control (not two buttons — segmented = mutually exclusive; matches existing ComparePanel pattern).

```tsx
type Viewport = 'desktop' | 'mobile'
// desktop: 1280×800, no wrapper constraint (w-full)
// mobile:  390×844, centered, device frame
```

**CSS:**

```tsx
// desktop
<iframe className="w-full h-[600px]" src={previewUrl} />

// mobile
<div className="mx-auto w-[390px] h-[844px] rounded-[24px] border-[6px] border-slate-700 overflow-hidden">
  <iframe className="w-full h-full" src={previewUrl} />
</div>
```

**Do not** change the `src` attribute when toggling — that remounts the iframe and kills HMR state.

**Persist:** store choice in `localStorage('patchparty:viewport')` so next party opens in the user's last choice.

**Honest limitation disclosure:** show a subtle `?` tooltip on the Mobile toggle:

> "Mobile preview approximates layout via pane width. Cross-origin iframes may not re-run all responsive logic exactly — ship and verify on a real device."

## 7. Ship PR flow

Three states via `ShipSheet` component (bottom sheet mobile, centered modal desktop).

**State A — before-ship** (`ShipBar` in `IterateHeader` + sticky footer):
- Primary button `Ship PR`
- Disabled when `turnCountUsed === 0`, `shippingPr === true`, or `prUrl !== null`
- Label changes: `Ship PR` → `Shipping…` (spinner) → `PR open` (link opens new tab)

**State B — confirming** (Ship button clicked, sheet opens):
- **Title field** — editable `<input>`, default = `party.issueTitle` with issue-number prefix stripped
- **Type chip** — `fix:` or `feat:` selector, default based on `party.classification.type`
- **Body field** — editable `<textarea rows=10>`, pre-filled from `GET /api/party/[id]/ship/preview`
- **Diff summary** — read-only block showing aggregate file list with total +/- counts (reuse `ChatTurn.diffStats` summed across all applied turns)
- **Primary action** — `Ship it` (matches existing pick button style)
- **Secondary action** — `Cancel` (closes sheet, preserves edits in React state until user navigates away)

**State C — shipped**:
- Replace sheet content with success card
- PR link, "Open in GitHub" button
- "Terminate sandbox" button (calls `terminateParty(partyId)`)
- PR URL persists in DB via existing `/pr` route

**On failure**: inline banner at top of sheet, retry button, do not reset title/body.

**New endpoint**: `GET /api/party/[id]/ship/preview` — returns `{ title, body, files: [{path, added, removed}] }`. Body pre-fill logic: join each applied `ChatTurn.assistantResponse` first line as bullets; footer = `Shipped from PatchParty party {id}`.

## 8. Loser sandbox teardown (at pick)

Already exists: `terminateLosers(partyId, winnerAgentId)` in `src/lib/sandbox-lifecycle.ts`, called fire-and-forget from `src/app/api/party/[id]/pick/route.ts`.

**Gap to close:**

1. **Parallelize** — current implementation iterates losers serially; change to `Promise.allSettled(losers.map(...))`. Zero user-visible behavior change, halves wall time.
2. **Record teardown** — new field `Agent.sandboxTerminatedAt DateTime?`. Set in `terminateLosers` loop. Allows compare modal (if reopened) to render reclaimed state.
3. **Reconciliation cron** — in `/api/cron/sandbox-lifecycle`, add a sweep: `WHERE pickedPersona IS NOT NULL AND agent.sandboxId IS NOT NULL AND sandboxTerminatedAt IS NULL AND agent.id != chatSessionAgentId AND older than 5 min` → retry termination. Prevents permanent leaks from transient Daytona failures.

## 9. Undo last turn

**Mechanic:** new revert commit, never force-push. Soft-delete original turn with `status='undone'`.

**Endpoint:** `POST /api/party/[id]/chat/undo` — body `{ turnIndex: number }`.

**Server flow:**

1. Auth + party ownership check.
2. Load `ChatTurn` at `(partyId, turnIndex)`. Reject if `status !== 'applied'` or if not the latest applied non-reverted turn.
3. Load agent + sandbox. Reject with 409 if `sandboxState !== 'ACTIVE'` ("resume sandbox first").
4. In sandbox: `cd $repoDir && git revert --no-edit ${commitSha} && find . -name '*.rej' -delete`. If conflict, return `{ ok: false, error: 'conflict' }`.
5. Push via the existing token-via-env path (see `02-data-model-changes.md` §token handling).
6. Create new `ChatTurn` row: `userMessage = "↩ Undo turn {turnIndex}"`, `status = 'applied'`, `assistantResponse = null`, `commitSha = <revertSha>`, `diffStats = <from git show --numstat>`.
7. Update original row: `status = 'undone'`, `revertedByTurnIndex = newTurnIndex`.
8. Response: `{ ok: true, revertSha, newTurnIndex }`.

**Client flow:**

1. User clicks `↩ Undo` on latest applied `TurnCard`.
2. Confirm dialog: "Revert turn N? This adds a new revert commit to the branch."
3. On confirm: POST /undo, on success re-fetch chat history (or patch local state).
4. Original `TurnCard` renders reverted style (strikethrough, grey).
5. New synthetic `TurnCard` appears at bottom showing the undo commit.

**Why not force-push:** destroys PR history, races with concurrent sandbox state, violates user's policy on force-push. Revert-commit is honest and reversible itself.

**Message history:** `buildMessageHistory` in `src/lib/chat.ts` already filters `status: 'applied'` — soft-deleted `undone` turns are automatically excluded from future Anthropic context. No code change needed there.
