# v2.1 Iterate-UX — Wide-Screen + Fullscreen

> **Scope:** two frontend-only commits preceded by one refactor. Polish, not
> pivot. Locked decisions in `00-locked-decisions.md` are constraints, not
> invitations to re-litigate. Decisions log in `decisions.md` picks up at D10
> after the squad round lands.

## Background

The iterate layout caps at `max-w-7xl` (1280 px). On 2K (2560 px) and 4K
(3840 px) monitors the app sits in a narrow strip with 640–1280 px of empty
gutter, which both looks unfinished and wastes the exact screen real estate
a builder wants when iterating. There is also no way to test a candidate in
the full viewport width — the preview iframe is always flanked by the chat
column. Two new user needs follow.

HEAD: `2190646` on `main` (code state = `4397c19`). 135/135 tests green.

## US1 — Wide-Screen Layout

> **As a** developer on a 2K/4K monitor
> **I want** the iterate preview to grow with my screen
> **So that** I can actually read my UI at full size while the agent iterates

### AC1.1 — Section fills ultrawide, preview column takes the slack
- `src/app/party/[id]/iterate-page.tsx:88` replaces `max-w-7xl` with a fluid
  cap: `max-w-[1920px] 2xl:max-w-[calc(100vw-4rem)]`. Rationale: stay safe
  through ≤2K; let 4K/ultrawide users feel the ambition above 1920 px.
  **Not** `max-w-none` — that would be unbounded at 8K.
- Grid row stays `lg:grid-cols-[minmax(0,1fr)_480px]`. Chat column width
  never grows past 480 px; every extra pixel lands on the preview. This is
  non-negotiable — 480 px is already near the ceiling for chat readability.

### AC1.2 — Padding scales with breakpoint
- `px-6 xl:px-8 2xl:px-12`. Avoids the content slamming into the edges of a
  fullscreen browser on ultrawide.

### AC1.3 — Chat-log content clamps regardless of column width
- `TurnColumn` log (`turn-column.tsx:376`) must visually cap the `TurnCard`
  content at ~640 px. Implementation: either wrap each card in
  `max-w-[640px]`, or add `max-w-[640px]` to the log container
  (`flex-1 min-h-0 overflow-y-auto ...`). Column itself stays 480 px so we
  actually can't exceed 640 anyway — but make this explicit so a future
  column-width bump doesn't silently produce unreadable 900 px line lengths.
  (Defensive CSS.)

### AC1.4 — No horizontal scroll at any breakpoint ≥ 1024 px
- Verified at 1024 / 1280 / 1536 / 1920 / 2560 px. A `min-w-0` is already on
  both grid children — preserve it. Any new element inside the preview
  column that uses `whitespace-nowrap` or an intrinsic-width child
  (e.g. a long preview URL pill) must `truncate` or `overflow-hidden`.

### AC1.5 — Below `lg` (< 1024 px) behavior unchanged
- Grid collapses to single column (already does). Preview above, chat below.
  Mobile spec in `01-ux-spec.md §1` still governs below `md`.

### AC1.6 — No iframe remount during resize
- Resizing the browser or the preview column never re-sets `PreviewPane`
  `src`. Verify: open DevTools → iframe element keeps the same `contentWindow`
  identity (or at minimum the `loaded` state doesn't flip back to false).

## US2 — Fullscreen Preview Mode

> **As a** developer iterating on a web app
> **I want** to blow the preview up to the full viewport
> **So that** I can see the candidate exactly as a real user will see it

### AC2.1 — Expand/collapse button lives next to the ViewportToggle
- New button in `preview-pane.tsx` header, to the right of `ViewportToggle`.
  Icon: `Maximize2` (collapsed) / `Minimize2` (expanded) from `lucide-react`.
  Same segmented-control styling language as the viewport toggle — this is
  a button, not a second segmented control, so it's a single icon button
  with the same border + padding vocabulary.
- `aria-label`: "Expand preview to fullscreen" / "Exit fullscreen".

### AC2.2 — CSS-fullscreen, not Fullscreen API
- Toggle sets local state `expanded: boolean`. When true, the preview
  outer wrapper becomes `fixed inset-0 z-50` + keeps its existing
  rounded border + keeps the same iframe element (no remount).
- Deliberate: the browser Fullscreen API (`element.requestFullscreen()`)
  requires a fresh user-gesture to renew after certain events, is flaky on
  iOS Safari, and can blow away our chrome (viewport toggle, status strip).
  CSS fullscreen preserves all of that and exits cleanly on Esc.

### AC2.3 — Esc and click-outside-to-close behavior
- `keydown` listener on `window` while expanded: Esc → collapse.
- Click on the Collapse button → collapse.
- **No** click-outside-to-close — the background is entirely the iframe,
  and clicking the iframe must go to the iframe (user is testing the
  candidate). A small visible Collapse button is the only exit.

### AC2.4 — Chat column is covered, not hidden (see D10)
- When expanded, the preview wrapper becomes `fixed inset-0 z-50` and
  visually covers the chat column. The chat column DOM is **untouched** —
  `display` stays as-is, `scrollTop` stays as-is, SSE stays connected,
  `diffCache` and draft textarea state stay intact. On collapse the
  fullscreen wrapper reverts to its in-flow position and the chat column
  is already in its original state.
- The viewport toggle and Collapse button render inside the expanded
  wrapper at the top, visible above the iframe.

### AC2.5 — Mobile hides the fullscreen toggle
- Below `lg` (< 1024 px) the button is hidden (`hidden lg:inline-flex`).
  On mobile the preview already fills the viewport width, and a CSS
  fullscreen on a mobile browser collides with native browser chrome /
  the address bar auto-hide. No value added.

### AC2.6 — Viewport toggle still works while expanded
- User in mobile viewport + clicks Expand → iframe takes the full viewport
  width but the mobile device frame wrapper is still rendered inside.
  Acceptable. User can switch to desktop viewport while expanded.

### AC2.7 — Iframe stays alive across the transition
- Critical. `src` does not change. State survives: Next.js HMR connection,
  any component state inside the preview, scroll position. Same invariant
  as the viewport toggle.

### AC2.8 — Page scroll is locked while expanded
- While expanded, add `overflow-hidden` to `<body>` so scrolling inside the
  iframe doesn't scroll the parent. Cleanup on collapse + on unmount.

### AC2.9 — Focus management
- On Expand, focus moves to the Collapse button (so Esc-via-keyboard is
  the obvious next action and screen readers announce the state change).
  On Collapse, focus returns to the Expand button.

## Mandatory pre-work — refactor commit

Before US1/US2, fix the four HIGH code-review findings from `a34eec2`. Two
are hard dependencies; two are duplication that would silently fork if we
touch either file.

### R1 — TurnColumn has no height anchor
- `iterate-page.tsx:114` wraps `<TurnColumn>` in `<div className="min-w-0">`
  with no explicit height. `TurnColumn`'s outer element is
  `flex flex-col h-full min-h-0 ...` — `h-full` resolves to zero, so the
  internal `flex-1 min-h-0 overflow-y-auto` log never activates its scroll.
  Result: the whole page scrolls instead of the log.
- Fix: wrap chat column in `lg:sticky lg:top-16 lg:h-[calc(100svh-9rem)]`
  (mirror of preview-column wrapper at `iterate-page.tsx:96`). Log scroll
  now activates internally.
- **Why this is a dependency of US2:** fullscreen will visually surface
  the broken internal scroll — and the stickied chat column is what lets
  the chat column collapse-and-restore cleanly in AC2.4.

### R2 — `encodePreviewTarget` duplicated
- `page.tsx:138` and `preview-pane.tsx:20` carry verbatim copies.
- Fix: extract to `src/lib/preview-target.ts`. Both callers import from it.
  Delete the inline copies.

### R3 — `Spinner` component duplicated
- `page.tsx:20` and `preview-pane.tsx:25` carry verbatim copies.
- Fix: extract to `src/components/spinner.tsx`. Both callers import from it.
  Delete the inline copies.

### R4 — `PreviewFrame` in `page.tsx` is a forked `PreviewPane`
- `ComparePanel` (pre-pick compare modal) at `page.tsx:822` uses the
  older `PreviewFrame` — a diverged copy of `PreviewPane` without the
  viewport toggle (it doesn't need one) and with a hardcoded `h-[600px]`.
- Fix: make `PreviewPane`'s `viewport` + `onViewportChange` props optional.
  When absent, the header bar renders no toggle. `ComparePanel` uses
  `<PreviewPane>` with viewport omitted and a prop for the fixed height
  (`h-[600px]`). Delete `PreviewFrame` and `Spinner` from `page.tsx`.
- **Why this is a dependency of US2:** the fullscreen toggle must live in
  one component. If we add it to `PreviewPane` only, `ComparePanel` is
  inconsistent. If we add it to both, drift is guaranteed.

### Commit shape
- Single `refactor(v2.1-iterate): extract shared PreviewPane primitives`.
- Must keep 135 tests passing. Add unit tests for `encodePreviewTarget`
  (round-trip, special chars, no token) since it's now a standalone module
  with a clean surface — extraction is the right moment to test it.

## Squad round — design decisions (D10–D16)

Adversarial design squad (architect + planner + code-reviewer) reviewed
this doc before any code was written. Two CRITICAL and several HIGH issues
surfaced. The following decisions resolve them.

### D10 — Chat column is NOT hidden during fullscreen
- **Finding:** `lg:hidden` = `display:none` destroys the chat log's
  `scrollTop`. AC2.4's "reappears untouched" claim was false.
- **Decision:** fullscreen does not hide the chat column at all. The
  `position:fixed inset-0 z-50` overlay covers the entire viewport
  including chat — so nothing needs to be hidden. Chat column's DOM and
  scroll position stay intact because nothing changes about it.
- **AC2.4 is rewritten accordingly.**

### D11 — Unify on the existing `src/components/ui/spinner.tsx`
- **Finding:** a third `Spinner` already exists (used in `wizard.tsx`,
  `picker.tsx`, `backlog.tsx`, also `page.tsx:608` and `page.tsx:895`).
  Its API has no `color` prop. The two local copies in `page.tsx:20`
  and `preview-pane.tsx:25` accept `color` for persona-accent tinting.
- **Decision:** extend `src/components/ui/spinner.tsx` with an optional
  `color?: string` prop (default `'currentColor'`). Migrate the two
  local copies to import from there. Existing consumers keep working
  because `color` is optional. **Do not** create
  `src/components/spinner.tsx` — that would be a fourth copy.

### D12 — Extract `PreviewFrame` primitive instead of optional-prop PreviewPane
- **Finding:** making `viewport`/`onViewportChange` optional on
  `PreviewPane` is boolean-prop-inflation. ComparePanel inherits
  fullscreen concern it doesn't want. Won't scale if we add fullscreen
  to ComparePanel later.
- **Decision:** new dumb primitive `<PreviewFrame>` (iframe + sandbox +
  loader + timeout, no chrome). `PreviewPane` renders `<PreviewFrame>`
  inside a header+body+status-strip wrapper. `ComparePanel` renders
  `<PreviewFrame>` directly with a fixed `height` prop. `viewport`
  stays required on `PreviewPane`.

### D13 — `expanded` state lives in `IteratePage`, not `PreviewPane`
- **Finding:** AC2 needs a parent-level concern (body scroll lock,
  potentially sibling behavior), and controlled state is the project's
  existing pattern (viewport is controlled this way).
- **Decision:** `IteratePage` owns `expanded: boolean`. `PreviewPane`
  receives `expanded` + `onExpandedChange` props, same shape as
  `viewport`/`onViewportChange`. Body scroll lock hook lives in
  `IteratePage` via `useEffect(expanded → body.overflow)`.

### D14 — Width cap is one rule: `max-w-[min(1920px,100vw-4rem)]`
- **Finding:** two-step cap was redundant — the real constraint is
  chat column ≤ 480 px + chat log ≤ 640 px + preview eats rest.
- **Decision:** replace `max-w-7xl` in `iterate-page.tsx:88` with
  `max-w-[min(1920px,calc(100vw-4rem))]`. Single rule: hard cap at
  1920 for 4K users, fluid below. Inner readability clamps do the rest.
- Also update the three `max-w-7xl` containers on `page.tsx` (lines
  ~313, 374, 424 — header, progress, sandbox status) to the same rule
  so the fullscreen-width blocks align visually above the iterate
  section. `page.tsx:334` (pre-pick agent grid) can stay `max-w-7xl`
  since it's a different screen, not in scope post-pick.

### D15 — Iframe remount guard: className-only transition
- **Finding:** if fullscreen wraps the iframe by ternary-rendering two
  different top-level elements, React unmounts and remounts the whole
  subtree — iframe remount, HMR loss.
- **Decision:** the wrapping div's **className** switches between the
  two states. The DOM node and iframe stay identical across the
  transition. Enforce with a comment at the join point and a mental
  ref-identity check during manual verification (no new test — adding
  an E2E would be overkill for one line of React).

### D16 — Esc priority + `body.overflow` cleanup
- **Finding:** `ShipSheet` already listens for Esc on `window`
  (`ship-sheet.tsx:144-150`). Two listeners fire on one Esc press.
  Also: `body{overflow:hidden}` can leak if component unmounts during
  Next.js soft navigation under React 18 concurrent.
- **Decision:** the fullscreen Esc handler checks `!shippingPr`
  (sheet cannot be in-flight) and stops propagation. `body.overflow`
  cleanup lives in the `useEffect` return **and** is mirrored on
  component unmount (cleanup runs both paths: expanded→false, and
  unmount-while-expanded). Body style stored before set, restored
  after. No defaults assumed.

### D17 — Keep z-50 for fullscreen; practical collisions unreachable
- **Finding:** four separate `fixed z-50` surfaces exist (ComparePanel,
  ShipSheet, DiffDrawer, proposed fullscreen). Paint order is DOM-order
  tiebreak with no explicit stacking.
- **Decision:** ComparePanel is pre-pick only (never renders on iterate
  page). ShipSheet/DiffDrawer are reachable only via chat column
  controls — which are covered by the fullscreen overlay, so the user
  cannot open them while expanded. The theoretical collision is
  unreachable by UX. Keep `z-50`. A z-scale constants file is explicit
  tech-debt for v2.2; document in `deferred.md`.

## Out-of-scope for this increment

Deferred to follow-up commit or a later iteration:
- `TimeAgo` no-re-render bug (needs `useEffect` + interval). Defer.
- `SandboxBanner` pass-through wrapper cleanup. Defer.
- Mobile preview using fixed px height instead of `aspect-ratio`. Defer
  unless we touch mobile rendering.
- Mouse-middle-drag pane resize, Split.js-style column dragger — valid
  future UX, explicitly not this increment.
- Pop-out preview in a new window (`window.open` + `postMessage`) — would
  give the same mental model as fullscreen + keep the chat visible in the
  original tab, but is a bigger surface (cross-window HMR, window close
  handling). Consider for v2.2.

## Verification

Before declaring any of the three commits done:
- `npx tsc --noEmit` clean.
- `node --experimental-strip-types --test tests/*.test.ts` → 135+ green.
- Manual browser walk-through at 1280, 1920, 2560 px window widths.
  Screenshots at each width saved under `.planning/screenshots/` and cited
  in the end-of-session summary.
- Fullscreen: open → Esc → open → Collapse button. At mobile viewport
  (< 1024 px emulated) the Expand button is not in the DOM.
- At no point during resize does the iframe reload (check Network tab).
- No new reviewer CRITICAL or HIGH outstanding after parallel
  `code-reviewer` + `security-reviewer` runs against each feat/refactor.

## Rollout

1. Refactor commit, push on user OK, Railway auto-deploys.
2. US1 commit, push on user OK, Railway auto-deploys.
3. US2 commit, push on user OK, Railway auto-deploys.
4. Smoke on prod by clicking around at Nelson's actual screen width.
5. Update `deferred.md` with anything the reviewer flagged that we chose
   not to fix (MEDIUM/LOW in non-touched files).
