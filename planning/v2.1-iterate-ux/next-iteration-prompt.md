# Next Iteration Agent Prompt — v2.1 Iterate-UX → Wide-Screen + Fullscreen

> Copy everything below the `---` into a fresh Claude Code session at
> `C:\Users\nelso\Desktop\patchPartyDaytonaLovable` after context-clear.
> Self-contained. Paste verbatim.

---

You are resuming PatchParty v2.1 Iterate-UX at `C:\Users\nelso\Desktop\patchPartyDaytonaLovable` on branch `main`. Sprints 1–4 have shipped. Post-pick sandbox respawn shipped. Two production hot-fixes shipped today. The user's focus for this session is **wide-screen layout + a fullscreen preview mode** — the iterate UI currently caps at `max-w-7xl` (1280 px) and looks lost on 2K/4K displays, and there is no way to test a candidate in full viewport width.

## What shipped between sessions (read `git log` for truth, these are the highlights)

| Commit | What |
|---|---|
| `d45d9e1` | feat — post-pick sandbox respawn. New `respawnParty()` in `src/lib/sandbox-lifecycle.ts`, new `POST /api/party/[id]/respawn` route, new `checkRespawnRateLimit` (2/5 min), new Respawn button in `resume-card.tsx` when `sandboxState === 'TERMINATED'` |
| `f2c870a` | fix — Sprint 3 reviewer findings. Shell-injection guard on `winner.branchName` in respawn, `parseIssueUrl` tightened to `^[A-Za-z0-9._-]+$` (this also hardens `agent.ts`'s initial clone), `prisma.$transaction` around Agent+Party writes, one-shot prod warning when Upstash creds absent |
| `a34eec2` | fix — two production bugs observed live. (1) Desktop iframe rendered at ~140 px because `flex-1 min-h-[520px]` on the PreviewPane content box doesn't anchor a `h-full` child when the grid parent uses `items-start` — now `h-[calc(100svh-9rem)] min-h-[520px]`. (2) Every `/chat` turn failed with "internal error" in prod because `pg_try_advisory_xact_lock(hashtext(x), len)` resolved to an overload that doesn't exist (`integer, bigint`) — Prisma serialises JS numbers as bigint. Fixed with `::int` cast in `chat.ts:330` and `chat/undo/route.ts:160` |

The `a34eec2` deploy is already live. Verify by grepping Railway logs for the absence of `42883` after `2026-04-19T17:00:00Z`.

## Production env state — **critical**, user should know

Railway (`patchparty` service) is **missing `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`**. The rate-limit module gracefully no-ops when these are absent (intentional for local dev, see D5) and the new warning at `src/lib/rate-limit.ts:39` logs one line per process: `UPSTASH_REDIS creds missing in production — rate limiters DISABLED`. Chat 4/60 s and Respawn 2/5 min limits are **not enforced in prod right now**. This is an ops issue, not a code bug — surface it to the user; do not silently fix by provisioning Upstash without their OK.

## What the user wants this session

Two scoped UX tasks, frontend-only:

### Goal 1 — Wide-screen layout
The iterate page wraps in `<section className="max-w-7xl mx-auto px-6 pb-12 space-y-4">` (`src/app/party/[id]/iterate-page.tsx:88`). On a ≥2K monitor this leaves huge empty gutters. The grid child is `lg:grid-cols-[minmax(0,1fr)_480px]` — the 480 px chat column is fine, the preview column is what should grow.

Design target (discuss before shipping — user didn't pre-pick):
- Keep 480 px chat fixed, let preview fill remaining space.
- Raise the section cap — maybe `max-w-[1920px]` or `max-w-[calc(100vw-4rem)]` — and keep `xl:px-8 2xl:px-12` scaling padding.
- Verify `TurnColumn` still reads naturally at wide widths (line-length is the concern; consider `max-w-[640px]` on the log content, not the whole column).

### Goal 2 — Fullscreen preview mode
Add a fullscreen toggle on PreviewPane. Click → iframe fills the viewport with a lightweight top bar (viewport toggle, close button). Esc closes. No new route, no state sync to server — pure client.

Open design questions to resolve before coding:
- Use the browser Fullscreen API (`element.requestFullscreen()`) or CSS `position:fixed inset-0 z-50`? The latter is more reliable cross-browser and doesn't require user-gesture renewal. Default to CSS unless the user asks otherwise.
- What stays visible — only iframe, or also the chat column in a narrower mode? Propose iframe-only first; chat is reachable via Esc.
- Mobile behaviour — fullscreen on mobile is weird, the normal layout already stacks nicely. Keep the button hidden below `lg`.

## Mandatory pre-work: read the code review findings

Before touching layout, read and address or explicitly defer these — the `code-reviewer` ran on `a34eec2` and flagged **4 HIGH + 7 MEDIUM** on the iterate-UX frontend. Two of the HIGHs directly affect the layout work:

1. **[HIGH] `TurnColumn` has no height anchor** (`iterate-page.tsx:95` / `turn-column.tsx:335`). The grid cell wrapping `<TurnColumn>` has no explicit height; `h-full` inside resolves to nothing; the chat log's `flex-1 min-h-0 overflow-y-auto` never activates internal scroll — the whole page scrolls instead. **Fullscreen work will make this obvious**. Fix: mirror the preview wrapper's `lg:sticky lg:top-16 lg:h-[calc(100svh-9rem)]` on the chat cell.
2. **[HIGH] `encodePreviewTarget` duplicated** in `page.tsx:138` and `preview-pane.tsx:20`. Will silently drift. Extract to `src/lib/preview-target.ts`.
3. **[HIGH] `Spinner` component duplicated** same files. Extract to `src/components/spinner.tsx`.
4. **[HIGH] `PreviewFrame` in `page.tsx:35–115` is a diverged fork of `PreviewPane`** still used by `ComparePanel` (`page.tsx:822`). Refactor `ComparePanel` to reuse `<PreviewPane>` (desktop-only mode) and delete `PreviewFrame` — critical because the fullscreen work should live in one component, not two.
5. **[MEDIUM] Mobile frame** uses fixed `h-[780px]` instead of `aspect-[390/844] w-[390px] max-h-full` — switch to aspect-ratio so the mobile chrome scales properly inside fullscreen.
6. **[MEDIUM] `TimeAgo`** (`turn-card.tsx:202`) doesn't re-render — stuck at first-render value. Add a 60 s interval.
7. **[LOW] `SandboxBanner`** is a 28-line transparent pass-through around `ResumeCard`. Delete and import `ResumeCard` directly.

Findings 2–4 are **dependencies** of the fullscreen work — fix them first, commit as `refactor(v2.1-iterate): extract shared PreviewPane primitives`, then tackle Goal 1 + 2.

Remaining MEDIUM/LOW findings (TimeAgo, SandboxBanner, etc.) — **defer to a follow-up commit** unless you're already touching the file.

## Grounding step — read before editing

1. `src/app/party/[id]/iterate-page.tsx` — layout shell (`max-w-7xl`, grid, sticky preview)
2. `src/app/party/[id]/preview-pane.tsx` — iframe + mobile phone frame + viewport toggle integration
3. `src/app/party/[id]/viewport-toggle.tsx` — where the fullscreen toggle probably lives alongside Desktop/Mobile
4. `src/app/party/[id]/turn-column.tsx` — 600 lines, the chat column and SSE consumer
5. `src/app/party/[id]/page.tsx` — still carries `PreviewFrame` + `ComparePanel` + second copy of `encodePreviewTarget` + `Spinner`
6. `planning/v2.1-iterate-ux/01-ux-spec.md` — UX spec; check if fullscreen was already specified
7. `planning/v2.1-iterate-ux/decisions.md` — D1–D9 locked

## Absolute scope

**YES:**
- Finish findings 1–4 above in a `refactor(...)` commit.
- Ship wide-screen layout in a `feat(v2.1-iterate): wide-screen layout` commit.
- Ship fullscreen preview mode in a `feat(v2.1-iterate): fullscreen preview` commit.
- After each feat/refactor commit: run `code-reviewer` + `security-reviewer` agents in parallel. Address CRITICAL + HIGH in a follow-up `fix(...)` commit. Defer MEDIUM/LOW unless they're in the touched files.
- `npx tsc --noEmit` + `node --experimental-strip-types --test tests/*.test.ts` before every commit. All 130 tests must stay green.

**NO:**
- Do not re-litigate D1–D9 or anything locked in `00-locked-decisions.md`.
- Do not run `prisma migrate deploy`, `railway up`, `git push --force`, or `--no-verify`.
- Do not provision Upstash Redis credentials without the user's OK — flag the prod gap and wait.
- Do not add features outside Goal 1 + Goal 2. No settings menu, no dashboard, no v2.2 prep.
- Do not touch server routes, the sandbox lifecycle, the chat SSE pipeline, or `respawnParty` — this session is UI-only.
- Do not delete `planning/` files. Update `deferred.md` if you defer a reviewer finding.

## Operational rules

- Branch is `main`. One commit per logical unit. Conventional-commit style (see `git log`).
- After each commit do not push automatically — ask the user with a one-line summary of what will be pushed.
- If a production bug surfaces mid-session, stop the UX work, fix the bug in a `fix(...)` commit, ask to push, then resume.
- User's workflow rule for feat/refactor commits: dispatch `code-reviewer` + `security-reviewer` as parallel subagents immediately after the commit, address findings in a `fix(...)` follow-up.
- Memory system is at `C:\Users\nelso\.claude\projects\C--Users-nelso-Desktop-patchPartyDaytonaLovable\memory\` — read `MEMORY.md` index first. Relevant: `project_v2_1_iterate_ux.md`, `feedback_adversarial_design.md`.

## Verification before reporting "done"

- `npx tsc --noEmit` clean.
- `node --experimental-strip-types --test tests/*.test.ts` → 130 pass.
- Manual browser check at 1280 / 1920 / 2560 px widths. Screenshot each, include paths in the summary.
- Fullscreen: open + Esc close + click-outside behaviour. Mobile (<1024 px): toggle hidden.
- No new reviewer CRITICAL or HIGH outstanding.

## End state

- Extraction commit landed (`PreviewPane` primitives shared, `PreviewFrame` deleted from `page.tsx`).
- Wide-screen layout commit landed. App fills ≥2K monitors without silly gutters.
- Fullscreen preview commit landed. Esc closes, mobile hides.
- `deferred.md` updated with any reviewer findings you consciously didn't fix.
- Branch is `main`, pushed (after user OK), Railway snapshot-deploys on its own.

Begin by running `git log --oneline -5` to confirm `a34eec2` is at HEAD, then read the 7 grounding files above in order. Then propose the wide-screen design choice (max-width vs fluid-vs-gutters) in two sentences, wait for the user to pick, and start with the extraction/refactor commit.
