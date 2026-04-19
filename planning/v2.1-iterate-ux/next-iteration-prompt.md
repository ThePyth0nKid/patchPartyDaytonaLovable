# Next Iteration Agent Prompt — v2.1 Iterate-UX → post wide-screen + fullscreen

> Copy everything below the `---` into a fresh Claude Code session at
> `C:\Users\nelso\Desktop\patchPartyDaytonaLovable` after context-clear.
> Self-contained. Paste verbatim.
>
> **Revision:** 2026-04-19, 23:45. Supersedes the pre-wide-screen version.
> Five commits landed since the previous handoff: `0d937c7`, `b9cb912`,
> `9847dd8`, `574f21a`, `e1e0029`. Wide-screen and fullscreen are both
> shipped — the remaining work is validation + v2.2 kickoff.

---

You are resuming PatchParty at `C:\Users\nelso\Desktop\patchPartyDaytonaLovable` on branch `main`. HEAD is `e1e0029`. 140/140 tests pass. `npx tsc --noEmit` is clean. The v2.1 Iterate-UX sprint is **feature-complete** — wide-screen layout and fullscreen preview mode both shipped last session. Today's focus is **browser validation of the live state** and, if green, scoping the **v2.2 entry point**.

Before you do anything else, read the auto-memory index at `MEMORY.md` (already injected into your context). The memory `project_patchparty_ops_state.md` is the single source of truth for what's live right now. The memory `project_v2_1_iterate_ux.md` points at the planning folder. The Obsidian vault at `C:\Users\nelso\Documents\obsidian-vault\Projekte\Aktiv\PatchParty\07 - Secrets-und-Infra.md` has **every credential** — never ask the user for a token without checking that file first.

## What shipped last session (chronological)

| Commit | What |
|---|---|
| `0d937c7` | refactor — extracted `PreviewFrame` primitive (shared by `PreviewPane` and `ComparePanel`), `encodePreviewTarget` → `src/lib/preview-target.ts`, unified on existing `src/components/ui/spinner.tsx` with optional `color` prop. TurnColumn now has an explicit chat-column height anchor so internal scroll works. |
| `b9cb912` | fix — reviewer HIGH on the refactor: replaced template-literal className merge with `cn()` from `@/lib/utils` (clsx + tailwind-merge) in PreviewFrame. Removed dead re-export. |
| `9847dd8` | feat — wide-screen layout. Section cap lifted from `max-w-7xl` (1280 px) to `max-w-[min(1920px,calc(100vw-4rem))]` with `xl:px-8 2xl:px-12` padding on iterate + header + progress + orchestrator banner. Pre-pick agents grid stays `max-w-7xl`. |
| `574f21a` | feat — fullscreen preview mode. className-only transition (no iframe remount) between in-place `lg:sticky lg:top-16` and `fixed inset-0 z-50 bg-slate-950`. Esc yields to any `[role="dialog"]` so diff-drawer / ship-sheet keep their own close handler. Body-scroll lock restores prior inline value (not hardcoded ''). Maximize2/Minimize2 button visible on `lg`+ only. |
| `e1e0029` | fix — auto-collapse fullscreen if `previewSrc` goes null mid-session (sandbox terminated while user was in fullscreen → was leaving a blank overlay). |

Reviewer pass from last session: **0 CRITICAL, 0 HIGH** across code-reviewer + security-reviewer on both feat commits. Two MEDIUMs (Tailwind collision latent risk; focus-management on collapse) analysed — both determined non-actionable (template-literal is safe at current class set; button element is stable across className toggle so `document.activeElement` persists).

## What's live in production right now

| System | State |
|---|---|
| Rate-limiter | **Active.** Upstash Redis `patchparty-prod` at `huge-iguana-102214.upstash.io`. `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` set on Railway. Chat 4/60s, respawn 2/5min. |
| Maintainer bypass | **Active.** `MAINTAINER_GITHUB_LOGINS=ThePyth0nKid` on Railway. Daily 5/24h skipped; concurrent cap 3 (`MAINTAINER_CONCURRENT_LIMIT`). |
| Upstash MCP | **Registered.** `claude mcp list` shows `upstash: ✓ Connected`. `mcp__upstash__*` tools should appear in your tool list. If they do: use them for rate-limit inspection instead of asking the user to open the browser UI. |
| Wide-screen + fullscreen | **Shipped this session.** Pushed to `main`. Railway auto-deployed on push. |

## What the user wants this session

**Priority 1 — Browser validation of the live state.** Confirm the wide-screen and fullscreen features behave as intended on the deployed app (or on local dev, user's preference). The features were type-checked + unit-tested to 140/140 green but **no human-in-browser test has happened yet**. Before calling v2.1 done, these must be verified:

- Wide-screen at 1280 / 1920 / 2560 px widths. No horizontal scroll. Padding feels right. Preview column takes the slack, chat column stays 480 px.
- Fullscreen toggle (Maximize2 icon top-right of the preview pane header, `lg`+ only). Click → `fixed inset-0 z-50` overlay. Esc → collapse. Minimize2 icon → collapse.
- Fullscreen preserves chat scroll position (scroll chat log → expand → collapse → scroll must be where you left it).
- Fullscreen with sandbox terminated mid-session: overlay auto-collapses, user is not trapped.
- Esc priority: open diff-drawer while fullscreen → Esc closes diff-drawer first, second Esc collapses fullscreen.
- Viewport toggle (Desktop/Mobile) inside fullscreen works.
- Mobile (<1024 px) hides the expand button entirely — normal stacked layout is the only mode.

**Priority 2 — Decide the v2.2 entry point.** If Priority 1 is clean, scope the first v2.2 commit with the user. Candidates on the shelf (from `planning/v2.1-iterate-ux/deferred.md`):

1. **`/pr` rate-limit slot** (MEDIUM, security-reviewer). Add `@upstash/ratelimit` at 1 req/10s on `/api/party/[id]/pr`. Small, well-scoped.
2. **ShipSheet stale-draft banner** (MEDIUM). Dismissible "your draft may not reflect recent changes — reset to current" with button.
3. **ShipSheet userId-prefixed localStorage key** (LOW). `patchparty:ship:${userId}:${partyId}` to hide drafts on shared devices.
4. **CSP tightening** (MEDIUM). Migrate from clickjacking-only CSP to strict-dynamic `script-src` with nonces. Non-trivial — App Router nonce propagation.
5. **S8 managed-mode daily cost cap** (v2.2 scope-lock). Needs a billing model conversation first.

Propose 2–3 of these as the next commit, one sentence each, and let the user pick. Don't assume — the user's last instruction was scoped to v2.1 UX polish.

## Grounding step — read before editing anything

1. `MEMORY.md` (auto-injected)
2. `src/app/party/[id]/iterate-page.tsx` — the fullscreen state lives here (`expanded`), plus the Esc + body-scroll-lock effects
3. `src/app/party/[id]/preview-pane.tsx` — the Maximize/Minimize button and `bodyHeight` switch
4. `src/app/party/[id]/preview-frame.tsx` — the extracted iframe primitive (do not add logic here unless sandbox/loader related)
5. `planning/v2.1-iterate-ux/06-widescreen-fullscreen.md` — locked decisions D10–D17 for wide-screen + fullscreen. Do not re-litigate.
6. `planning/v2.1-iterate-ux/deferred.md` — the v2.2 candidate list with reasons

## Operational rules

- Branch is `main`. Every commit pushes to prod via Railway auto-deploy.
- One commit per logical unit. Conventional-commit style (see `git log`).
- **Never push automatically.** After each commit, summarize what will be pushed in one line and ask. The user's pattern: `Ja, schick's hoch.` / `einmal pushen` means go, otherwise wait.
- **After every feat or refactor commit:** dispatch `code-reviewer` + `security-reviewer` as parallel subagents (`Agent` tool with `subagent_type`). Address CRITICAL + HIGH in a follow-up `fix(...)` commit. Defer MEDIUM/LOW unless they're in touched files. Update `planning/v2.1-iterate-ux/deferred.md` with anything you consciously don't fix.
- Before every commit: `npx tsc --noEmit` + `node --experimental-strip-types --test tests/*.test.ts`. Both must stay green. **140 tests minimum now.**
- If a production bug surfaces mid-session, stop the feature work, fix the bug in a `fix(...)` commit, ask to push, then resume.
- No `prisma migrate deploy`, no `railway up`, no `git push --force`, no `--no-verify`. These require explicit approval.
- Credentials are in Obsidian — do not ask the user for tokens without checking `07 - Secrets-und-Infra.md`.
- When in doubt about user intent, ask. The user prefers a two-sentence question over a wrong commit.
- User uses adversarial design squads (Red/Green/Architect) for complex planning work — launch `architect` + `planner` + `code-reviewer` as parallel subagents for anything non-trivial before writing code.

## Absolute scope for this session

**YES:**
- Browser validation of wide-screen + fullscreen (document findings as you go).
- Any `fix(...)` commit addressing real bugs surfaced during validation.
- Propose v2.2 entry point from the deferred list, wait for pick.
- If the user picks a v2.2 item: plan it with a squad round first, then TDD it.

**NO:**
- Do not re-litigate D1–D17 or anything in `00-locked-decisions.md` / `06-widescreen-fullscreen.md`.
- Do not provision new infrastructure, run migrations, or rotate credentials.
- Do not add features outside validation + one scoped v2.2 item. No settings menu, no dashboard polish.
- Do not touch server routes, the sandbox lifecycle, the chat SSE pipeline, `respawnParty`, or the maintainer bypass unless the user's v2.2 pick lands there.
- Do not lower `MAINTAINER_CONCURRENT_LIMIT` or remove `isMaintainer()` error handling — both were security-reviewed in `4397c19`.
- Do not delete `planning/` files.

## Verification before reporting "done"

- `npx tsc --noEmit` clean.
- `node --experimental-strip-types --test tests/*.test.ts` → 140+ pass.
- Manual browser check: screenshot at 1280 / 1920 / 2560 px; fullscreen open+close cycle; sandbox-terminated-while-expanded edge.
- No new reviewer CRITICAL or HIGH outstanding.
- If a v2.2 commit landed: its own squad + reviewer pass, plus the deferred.md entry moved to "shipped".

## End state for this session

Either:
- **A) v2.1 validated, no code change.** Short report listing each AC from `06-widescreen-fullscreen.md` as pass/fail with a screenshot. v2.1 marked done.
- **B) v2.1 validated + one v2.2 commit landed.** As (A) plus the v2.2 item shipped, reviewed, and deferred.md updated.
- **C) Bug surfaced during validation.** Fix commit(s) landed, validation re-run, v2.1 re-verified.

Begin by running `git log --oneline -7` to confirm `e1e0029` is at HEAD. Then read `MEMORY.md` + the grounding files above. Then ask the user whether they want to validate in local dev (`npm run dev`) or against the deployed Railway URL, and propose the first ~3 ACs to walk through.
