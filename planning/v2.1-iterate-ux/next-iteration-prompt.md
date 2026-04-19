# Next Iteration Agent Prompt — v2.1 Iterate-UX → Wide-Screen + Fullscreen

> Copy everything below the `---` into a fresh Claude Code session at
> `C:\Users\nelso\Desktop\patchPartyDaytonaLovable` after context-clear.
> Self-contained. Paste verbatim.
>
> **Revision:** 2026-04-19, 21:00. Supersedes the pre-Upstash version. Two
> new commits landed after the previous handoff was written (`9f2a84f`,
> `4397c19`) — both maintainer-bypass work. Upstash is now live. MCP is
> registered. Those sections have been rewritten.

---

You are resuming PatchParty v2.1 Iterate-UX at `C:\Users\nelso\Desktop\patchPartyDaytonaLovable` on branch `main`. HEAD is `4397c19`. 135/135 tests pass, `npx tsc --noEmit` is clean. The user's focus for this session is **wide-screen layout + a fullscreen preview mode** — the iterate UI currently caps at `max-w-7xl` (1280 px) and looks lost on 2K/4K displays, and there is no way to test a candidate in full viewport width.

Before you do anything else, read the auto-memory index at `MEMORY.md` (already injected into your context). The memory `project_patchparty_ops_state.md` is the single source of truth for what's live right now. The memory `project_v2_1_iterate_ux.md` points at the planning folder. The Obsidian vault at `C:\Users\nelso\Documents\obsidian-vault\Projekte\Aktiv\PatchParty\07 - Secrets-und-Infra.md` has **every credential** — never ask the user for a token without checking that file first.

## What's live in production right now

| System | State |
|---|---|
| Rate-limiter | **Active.** Upstash Redis DB `patchparty-prod` at `huge-iguana-102214.upstash.io`. `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` are set on the Railway `patchparty` service. Chat is 4/60 s, respawn is 2/5 min. Verified: chat-turn creates keys under `patchparty:chat:user:*` in the Upstash browser. |
| Maintainer bypass | **Active.** `MAINTAINER_GITHUB_LOGINS=ThePyth0nKid` on Railway. `src/lib/usage.ts` skips the daily 5/24h cap for maintainers and raises concurrent cap from 1 to 3 (`MAINTAINER_CONCURRENT_LIMIT`). Stolen-session blast radius is deliberately bounded — do not lift the concurrent cap further without security review. |
| Upstash MCP | **Registered.** `claude mcp list` shows `upstash: ✓ Connected`. Tools `mcp__upstash__*` should appear in your tool list. **If they do**: use them to inspect rate-limit keys (`TTL patchparty:chat:user:...`, `SCAN`) instead of asking the user to open the Upstash browser. If they don't appear, that means the MCP server didn't load for this session — degrade gracefully, note it to the user, don't block on it. |
| Post-pick respawn | **Shipped.** `POST /api/party/[id]/respawn` + Respawn button in `resume-card.tsx` when `sandboxState === 'TERMINATED'`. |

## What shipped between handoffs (chronological, newest last)

| Commit | What |
|---|---|
| `d45d9e1` | feat — post-pick sandbox respawn (`respawnParty()` in `src/lib/sandbox-lifecycle.ts`, new route, 2/5min rate-limit). |
| `f2c870a` | fix — Sprint 3 reviewer findings (branchName shell-injection guard, `parseIssueUrl` allowlist tightened, `prisma.$transaction` wrap, Upstash-missing warn log). |
| `a34eec2` | fix — two live prod bugs. (1) Desktop iframe ~140 px height → `h-[calc(100svh-9rem)] min-h-[520px]` on the preview pane. (2) Chat `pg_try_advisory_xact_lock(integer, bigint)` overload doesn't exist — Prisma serialises JS numbers as bigint. Fixed with `::int` cast in `chat.ts:330` and `chat/undo/route.ts:160`. |
| `89c5311` | docs — previous handoff prompt (superseded by this one). |
| `9f2a84f` | feat — **maintainer bypass.** `src/lib/maintainers.ts` (new pure env-parser), `isMaintainer()` by `User.githubLogin`, `unlimited` flag on UsageSnapshot/UsageCheckResult, UI shows "∞ maintainer · no cap". 5 new unit tests. |
| `4397c19` | fix — reviewer findings on `9f2a84f`. HIGH (security): re-added a concurrent cap for maintainers (`MAINTAINER_CONCURRENT_LIMIT = 3`). MEDIUM: try/catch around `isMaintainer()` DB lookup, fail-closed on error. MEDIUM: non-maintainer path no longer double-queries `isMaintainer()`. |

## What the user wants this session

Two scoped UX tasks, frontend-only. The user explicitly said "für große Screens anpassen" and "muss auch ein Vollbild geben, wo man die Applikation testen kann." These are polish, not pivots — respect the existing design language.

### Goal 1 — Wide-screen layout

The iterate page wraps in `<section className="max-w-7xl mx-auto px-6 pb-12 space-y-4">` at `src/app/party/[id]/iterate-page.tsx:88`. On a ≥2K monitor this leaves huge empty gutters. The grid child is `lg:grid-cols-[minmax(0,1fr)_480px]` — the 480 px chat column is fine, the preview column is what should grow.

**Design question to resolve before coding** (don't assume, ask):
- Keep 480 px chat fixed, let preview fill remaining space — yes, almost certainly.
- Raise the section cap: `max-w-[1920px]` (hard cap) vs `max-w-[calc(100vw-4rem)]` (fluid minus gutters). Fluid feels more ambitious but can look diffuse at 4K. Propose both, let the user pick.
- Padding should scale: `xl:px-8 2xl:px-12`.
- `TurnColumn` readability at wide widths — line length is the concern. Consider `max-w-[640px]` on the log content itself, not the whole column.

### Goal 2 — Fullscreen preview mode

Add a fullscreen toggle on PreviewPane. Click → iframe fills the viewport with a lightweight top bar (viewport toggle, close button). Esc closes. No new route, no server state sync — pure client.

**Design questions to resolve before coding:**
- Browser Fullscreen API (`element.requestFullscreen()`) vs CSS `position:fixed inset-0 z-50`? CSS is more reliable cross-browser and doesn't need user-gesture renewal. Default to CSS unless the user asks for the real API.
- What stays visible — iframe only, or also the chat column in a narrower mode? Propose iframe-only first; chat is reachable via Esc.
- Mobile behavior — fullscreen is weird on mobile, the normal layout already stacks nicely. Hide the button below `lg`.

## Mandatory pre-work: reviewer findings that gate fullscreen

Before touching the layout, address these — the `code-reviewer` ran on `a34eec2` and flagged 4 HIGH on the iterate-UX frontend. Two of them are **hard dependencies** for the fullscreen work because the code must live in one place, not two:

1. **[HIGH] `TurnColumn` has no height anchor** (`iterate-page.tsx:95` / `turn-column.tsx:335`). The grid cell wrapping `<TurnColumn>` has no explicit height; `h-full` inside resolves to nothing; the chat log's `flex-1 min-h-0 overflow-y-auto` never activates internal scroll — the whole page scrolls instead. **Fullscreen work will make this obvious.** Fix: mirror the preview wrapper's `lg:sticky lg:top-16 lg:h-[calc(100svh-9rem)]` on the chat cell.
2. **[HIGH] `encodePreviewTarget` duplicated** in `page.tsx:138` and `preview-pane.tsx:20`. Will silently drift. Extract to `src/lib/preview-target.ts`.
3. **[HIGH] `Spinner` component duplicated** in the same two files. Extract to `src/components/spinner.tsx`.
4. **[HIGH] `PreviewFrame` in `page.tsx:35–115` is a diverged fork of `PreviewPane`** still used by `ComparePanel` (`page.tsx:822`). Refactor `ComparePanel` to reuse `<PreviewPane>` (desktop-only mode) and delete `PreviewFrame`. **Critical** — the fullscreen work must live in one component, not two.

Findings 2–4 are **dependencies** of the fullscreen work — fix them first, commit as `refactor(v2.1-iterate): extract shared PreviewPane primitives`, then tackle Goal 1 + 2.

Other MEDIUM/LOW findings (TimeAgo no re-render, SandboxBanner pass-through wrapper, mobile frame fixed-height instead of aspect-ratio) — **defer to a follow-up commit** unless you're already touching the file.

## Grounding step — read before editing

1. `src/app/party/[id]/iterate-page.tsx` — layout shell (`max-w-7xl`, grid, sticky preview)
2. `src/app/party/[id]/preview-pane.tsx` — iframe + mobile phone frame + viewport toggle integration
3. `src/app/party/[id]/viewport-toggle.tsx` — where the fullscreen toggle probably lives alongside Desktop/Mobile
4. `src/app/party/[id]/turn-column.tsx` — 600 lines, the chat column and SSE consumer
5. `src/app/party/[id]/page.tsx` — still carries `PreviewFrame` + `ComparePanel` + second copy of `encodePreviewTarget` + `Spinner`
6. `planning/v2.1-iterate-ux/01-ux-spec.md` — check if fullscreen was already specified
7. `planning/v2.1-iterate-ux/decisions.md` — D1–D9 locked

## Operational rules

- Branch is `main`. Every commit pushes to prod via Railway auto-deploy.
- One commit per logical unit. Conventional-commit style (see `git log`).
- **Never push automatically.** After each commit, summarize what will be pushed in one line and ask. The user's pattern: `Ja, schick's hoch.` means go, otherwise wait.
- **After every feat or refactor commit:** dispatch `code-reviewer` + `security-reviewer` as parallel subagents (`Agent` tool with `subagent_type`). Address CRITICAL + HIGH in a follow-up `fix(...)` commit. Defer MEDIUM/LOW unless they're in touched files. Update `planning/v2.1-iterate-ux/deferred.md` with anything you consciously don't fix.
- Before every commit: `npx tsc --noEmit` + `node --experimental-strip-types --test tests/*.test.ts`. Both must stay green. 135 tests minimum.
- If a production bug surfaces mid-session, stop the UX work, fix the bug in a `fix(...)` commit, ask to push, then resume.
- No `prisma migrate deploy`, no `railway up`, no `git push --force`, no `--no-verify`. These require explicit approval.
- Credentials are in Obsidian — do not ask the user for tokens without checking `07 - Secrets-und-Infra.md`.
- When in doubt about user intent, ask. The user prefers a two-sentence question over a wrong commit.

## Absolute scope

**YES:**
- Refactor commit for findings 1–4 above.
- `feat(v2.1-iterate): wide-screen layout` commit.
- `feat(v2.1-iterate): fullscreen preview` commit.
- Parallel `code-reviewer` + `security-reviewer` after each feat/refactor. Fix commits for CRITICAL/HIGH.
- If Upstash MCP is available: use it to verify rate-limits are behaving as expected after any relevant change.

**NO:**
- Do not re-litigate D1–D9 or anything in `00-locked-decisions.md`.
- Do not provision new infrastructure, run migrations, or rotate credentials.
- Do not add features outside Goal 1 + Goal 2. No settings menu, no dashboard polish, no v2.2 prep.
- Do not touch server routes, the sandbox lifecycle, the chat SSE pipeline, `respawnParty`, or the maintainer bypass — this session is UI-only.
- Do not lower `MAINTAINER_CONCURRENT_LIMIT` or remove `isMaintainer()` error handling — both were security-reviewed in `4397c19`.
- Do not delete `planning/` files.

## Verification before reporting "done"

- `npx tsc --noEmit` clean.
- `node --experimental-strip-types --test tests/*.test.ts` → 135+ pass.
- Manual browser check at 1280 / 1920 / 2560 px widths. Screenshot each, include paths in the summary.
- Fullscreen: open + Esc close + click-outside behaviour. Mobile (<1024 px): toggle hidden.
- No new reviewer CRITICAL or HIGH outstanding.
- If Upstash MCP is loaded: a quick `SCAN patchparty:chat:*` to confirm keys are still being written after the session's last chat turn.

## End state

- Refactor commit landed (`PreviewPane` primitives shared, `PreviewFrame` deleted from `page.tsx`, `TurnColumn` height-anchored).
- Wide-screen layout commit landed. App fills ≥2K monitors without silly gutters.
- Fullscreen preview commit landed. Esc closes, mobile hides the toggle.
- `deferred.md` updated with any reviewer findings you consciously didn't fix.
- Branch is `main`, pushed (after user OK), Railway snapshot-deploys on its own.

Begin by running `git log --oneline -6` to confirm `4397c19` is at HEAD. Then read `MEMORY.md` + the grounding files above in order. Then propose the wide-screen max-width design choice (hard cap vs fluid) in two sentences, wait for the user to pick, and start with the extraction refactor commit.
