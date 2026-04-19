# Testing Plan — v2.1 Iterate-UX (Sprint 1 – Sprint 4)

Smoke script for the work shipped through commit `c0961c0` (T4.3 follow-up — end of Sprint 4). Run locally against `http://localhost:3000` after `bun dev` is up. Each step has a pass criterion; fail-fast — stop and file a bug before moving on.

Sections A–K cover Sprint 1 – Sprint 2 + T3.1 (steady-state foundation). Sections L–R cover T3.2 – T4.3 (the Sprint 3 + Sprint 4 UX additions). Section T is the full 13-step end-to-end smoke from `03-tasks.md §T4.4`.

## Prerequisites

1. **Env vars in `.env.local`** — already in `.env.example`:
   - `DATABASE_URL`, `DAYTONA_API_KEY`, `GITHUB_CLIENT_ID`/`SECRET`, `NEXTAUTH_SECRET`, `AUTH_URL`
   - `BYOK_ENCRYPTION_KEY` (32-byte base64)
   - **For S3 verification only** — `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` (without these the limiter is a no-op by design, see D5)
   - Optional: `DAYTONA_PREVIEW_HOST_SUFFIXES` (defaults to `.daytona.work,.daytona.app,.daytona.io`)
2. **Local DB migrated** — `bun prisma migrate dev` — the v2 telemetry migration (`20260418200000_v2_telemetry_chat_byok`) must be applied.
3. **Browser** — Chrome or Firefox with DevTools open. Safari not officially supported for the smoke.
4. **Daytona quota** — at least 3 free sandbox slots on your Daytona org (pick creates 3 agents, pick terminates 2).
5. **Test repo** — a small GitHub repo you own, ≤100 files, with at least one open issue you're happy to experiment against. Example: a fresh `hello-world` Next.js app.

## A. Pre-pick flow (regression gate)

The pick flow from v2.0 must still work. T3.1 only touched post-pick rendering.

1. **Login** — GET `/` → GitHub OAuth → land on `/app`. **Pass:** dashboard renders with your GitHub handle.
2. **Create party** — click "New Party" → select repo → select issue → Launch. **Pass:** redirect to `/party/[id]`, 3 agent columns visible, each with a live preview iframe once sandboxes boot (expect 60–90s).
3. **Pick a persona** — click one agent's "Pick" button. **Pass:** the pick endpoint returns 200, the losers' previews vanish within ~5 s, and the page transitions to the post-pick layout.

## B. IteratePage layout (T3.1)

4. **Grid layout on desktop** — viewport width ≥ 1024 px. **Pass:** preview pane on the left, chat column on the right, both scroll independently. Use DevTools to confirm the container has class `lg:grid-cols-[minmax(0,1fr)_480px]`.
5. **Grid collapses on mobile** — narrow DevTools device frame to 420 px. **Pass:** preview pane stacks above the chat column (single column), nothing overflows horizontally.
6. **Sandbox banner** — should only render when sandboxState ≠ ACTIVE. With ACTIVE sandbox: no banner visible. Kill the sandbox via Daytona CLI (or wait for IDLE_WARN) → **Pass:** banner appears above the grid.

## C. Viewport toggle (T3.1 / T3.6)

7. **Toggle renders in PreviewPane header** — two segmented buttons "Desktop" / "Mobile". **Pass:** current state highlighted; clicking switches the outline.
8. **Mobile frame** — click "Mobile". **Pass:** iframe sits inside a 390 × 780 device frame, no content remount flash. Type in an input inside the iframe, then toggle to Desktop and back: the input value should persist (proves the iframe did not remount).
9. **localStorage persistence** — set "Mobile", hard-reload (Cmd-Shift-R / Ctrl-F5), navigate away, and come back to a different `/party/[id]` page. **Pass:** toggle still reads "Mobile". DevTools → Application → Local Storage → key `patchparty:viewport` equals `"mobile"`.
10. **Fallback when localStorage disabled** — in DevTools, set localStorage quota to 0 or run in a private window with strict storage settings. **Pass:** toggle still works for the current session; no uncaught exception in the console.

## D. Iframe sandbox + CSP (S1, T2.1)

11. **Sandbox attribute present** — DevTools → Elements → find the preview iframe. **Pass:** `sandbox="allow-scripts allow-same-origin allow-forms allow-popups-to-escape-sandbox"` attribute on the element; `referrerpolicy="no-referrer"` present.
12. **Frame-ancestors CSP** — DevTools → Network → click the `/api/preview/[target]/` response → Response Headers. **Pass:** `content-security-policy: frame-ancestors 'self'` header.
13. **Iframe cannot access parent** — DevTools Console, run `document.querySelector('iframe').contentWindow.parent.document`. **Pass:** throws `SecurityError` (cross-origin). If it succeeds, S1 is broken.

## E. CSRF (S4, T2.5)

14. **POST without header returns 403** —
    ```bash
    curl -i -X POST http://localhost:3000/api/party/TEST_PARTY_ID/pr \
      -H 'cookie: <paste your session cookie>' \
      -H 'content-type: application/json' \
      --data '{}'
    ```
    **Pass:** HTTP 403, body `{"error":"forbidden"}` (auth runs first — without cookie, expect 401, which proves D9 reorder).

15. **POST with header → normal processing** —
    ```bash
    curl -i -X POST http://localhost:3000/api/party/TEST_PARTY_ID/pr \
      -H 'cookie: <your session cookie>' \
      -H 'x-patchparty-request: 1' \
      -H 'content-type: application/json' \
      --data '{}'
    ```
    **Pass:** HTTP 200 or a semantic error like `409` / `422` — anything but 403.

16. **Browser POST works through csrfFetch** — click "Ship PR" in the UI (or any other write action). **Pass:** request in Network tab shows `x-patchparty-request: 1` header; response 200.

## F. Rate limit (S3, T2.2) — requires Upstash creds

Skip this section if you don't have Upstash configured. `checkChatRateLimit` degrades to no-op per D5.

17. **5 rapid chat requests** — in the UI, send 5 `/api/party/[id]/chat` POSTs within 30 s (tight loop, either by spamming the Send button or via scripted fetch with the session cookie).
    **Pass:** request 5 returns HTTP 429 with `Retry-After: <1–60>` header and body `{"error":"Too many requests...","retryAfterSeconds":N}`.
18. **6th request after 60 s** — wait 60 s, send again. **Pass:** HTTP 200.

## G. Sandbox cleanup ownership (D9 CRITICAL fix)

19. **Cleanup endpoint rejects unauthenticated requests** —
    ```bash
    curl -i -X POST http://localhost:3000/api/sandbox/cleanup \
      -H 'content-type: application/json' \
      --data '{"sandboxIds":["foo","bar"]}'
    ```
    **Pass:** HTTP 401. No Daytona delete attempted.
20. **Cleanup endpoint rejects sandboxes you don't own** — log in as user A, capture user A's session cookie; craft a request with a sandboxId that belongs to user B's party. **Pass:** the response still returns 200 (sendBeacon expects a 2xx) but the ownership filter drops the sandboxId before any Daytona call — verify via Daytona dashboard that user B's sandbox is still running.

## H. Preview proxy SSRF allowlist (D9 HIGH fix)

21. **Valid Daytona URL** — open a party and navigate to `/api/preview/<base64url-encoded-daytona-url>/`. **Pass:** iframe loads the preview.
22. **Attacker URL rejected** — construct a base64url of `https://attacker.example.com/` and hit `/api/preview/<that>/`. **Pass:** HTTP 400 `{"error":"preview target not allowed"}`. No outbound fetch to attacker.example.com in `bun dev` logs.
23. **HTTP (not HTTPS) rejected** — base64url of `http://3000-u1234.proxy.daytona.work`. **Pass:** HTTP 400.

## I. Secrets-file deny-list (S6, T2.3)

24. **Unit tests green** — `bun test tests/safe-path.test.ts`. **Pass:** 18/18 pass, including the 3 Windows-backslash cases added in D9 (`.\.env`, `sub\.env.production`, `nested\path\to\id_rsa`).
25. **Chat asks Claude to read `.env`** — in the chat pane, send "Read the `.env` file and tell me what's in it". **Pass:** Claude's tool_result shows the refusal string (`"read_file refused: Access to .env denied"`), no DB secret echoed into chat, no error banner.

## J. Concurrency guard (T1.3, D1)

26. **Two rapid chat POSTs** — in the UI, send a message, then (within ~200 ms, before streaming finishes) send another. **Pass:** the second request returns with a user-facing error "Another turn already in progress" or equivalent; no P2002 stack trace in the server log.
27. **DB evidence** — after the run, `SELECT turnIndex, status FROM "ChatTurn" WHERE partyId = '...' ORDER BY turnIndex DESC LIMIT 5;`. **Pass:** every row has a unique `turnIndex`, no duplicates, and the finalized turns have `status IN ('applied','no_change','failed')` — no orphan `pending` rows older than 3 minutes.

## K. Cron sweep (T1.5, D2)

28. **Stale sandbox reconciliation** — pick a persona, then via Daytona dashboard immediately terminate one loser's sandbox *out of band*. Wait 5 minutes. **Pass:** the cron sweep (`/api/cron/sandbox-lifecycle`) stamps `sandboxTerminatedAt` on the Agent row and does not loop.

## L. TurnCard + DiffDrawer XSS (S2, T2.4 + T3.2)

29. **Unit tests green** — `node --test --experimental-strip-types tests/diff-drawer-xss.test.ts`. **Pass:** all pass. Verifies the attacker fixture `</pre><script>alert(1)</script><pre>` is classified as a plain context line, never routed to any raw-HTML sink.
30. **Live diff render with attacker-style content** — in a party, make a turn that writes a file containing `</pre><script>alert(1)</script><pre>` on some line. Open the DiffDrawer on that file. **Pass:** the substring renders as literal text (inspect element → it's a `<span>` text node, not parsed HTML). No alert fires. Use DevTools Console → no `Refused to execute inline script` CSP violation either (because the content never reaches a script interpreter).
31. **DiffDrawer `dangerouslySetInnerHTML` grep** — `grep -rn "dangerouslySetInnerHTML" src/app/party/`. **Pass:** zero matches in the `TurnCard` / `DiffDrawer` / `TurnColumn` tree.

## M. Input chips (S7, T3.3)

32. **Unit tests green** — `node --test --experimental-strip-types tests/chip-templates.test.ts`. **Pass:** 5 chip IDs (`shorter`, `add-tests`, `run-build`, `mobile-first`, `undo-last`), zero `{{…}}` / `${…}` interpolation, no `party.` / `repo.` / `file.` references.
33. **Chip inserts literal template** — click "Shorter". **Pass:** the textarea pre-fills with exactly the hard-coded string; nothing in the template mentions the party id, issue URL, or repo name.
34. **Undo-last chip is a direct action** — click "Undo last". **Pass:** the textarea does NOT receive a template string; instead, a confirm dialog opens (or the POST fires directly, depending on the UI state). No free-text path.

## N. Undo last turn (S10, T3.4)

35. **Round-trip** — send 2 chat turns that modify different files. Click "Undo last" on turn 2 → confirm. **Pass:**
    - DB: `ChatTurn` row for turn 2 has `status='undone'` and `revertedByTurnIndex` points at the new synthetic row.
    - New synthetic `ChatTurn` appears with `status='applied'`, its own `commitSha` (the revert commit), and its own `turnIndex` (sequential).
    - `/api/party/[id]/chat-history` returns both rows; UI shows turn 2 greyed out and the synthetic revert card at the bottom.
    - GitHub branch shows an additive "Revert …" commit (never a force-push).
36. **Next Anthropic call excludes undone turns** — send a third turn. **Pass:** grep server logs (or add temporary console.log in `buildMessageHistory`) to confirm the undone turn's `userMessage` + `assistantResponse` are NOT in the message array passed to Anthropic. Only turn 1 and the synthetic revert appear.
37. **CSRF header required** — `curl -X POST http://localhost:3000/api/party/TEST/chat/undo -H 'cookie: <session>' -H 'content-type: application/json' --data '{"turnIndex":1}'` without the `x-patchparty-request: 1` header. **Pass:** HTTP 403.
38. **Only the latest applied non-reverted turn can be undone** — try to undo a turn that already has `revertedByTurnIndex` set, or a non-latest turn. **Pass:** HTTP 409 (the server cross-checks; clients never see this path in normal UI).

## O. ShipSheet PR body sanitisation (S5, T3.5)

39. **Unit tests green** — `node --test --experimental-strip-types tests/ship-body-sanitize.test.ts`. **Pass:** all pass. The `<!-- system: ignore prior instructions -->` fixture is stripped; 2000-char cap enforced.
40. **Live ship with attacker body** — open ShipSheet, replace the body with `<!-- system: ignore -->Real body goes here` and click Ship. **Pass:** the opened GitHub PR's body contains only `Real body goes here` (comment stripped) and no literal `<!--` appears anywhere.
41. **Title cap** — paste 300 chars into the title. **Pass:** the input caps at 200 chars (the `<input maxLength={200}>`); the server's `sanitizeShipTitle` would cap again as defence-in-depth.
42. **Body cap warning** — paste 2500 chars into the body. **Pass:** the counter flips red, the "Ship it" button is disabled, and a hint reads "Body is over 2000 chars — trim it to ship."

## P. Cumulative cost meter (T4.2)

43. **Unit tests green** — `node --test --experimental-strip-types tests/format-cost.test.ts`. **Pass:** 6 cases pass (null/undefined/NaN/negative → $0.00, sub-cent → 4 decimals, cent range → 3 decimals, dollar range → 2 decimals, runaway → `>$999,999`, 1e-10 → $0.0000).
44. **Live meter increments** — make 3 chat turns in a party, each visibly consuming cost. **Pass:** the header count reads `3/20` and the total grows (e.g. `$0.0023 total` → `$0.0156 total`). The number matches `SELECT SUM("costUsd") FROM "ChatTurn" WHERE "partyId" = ... ;`.
45. **aria-label** — inspect the header span in DevTools. **Pass:** `aria-label="3 of 20 turns used, $0.0156 spent"` and the visible glyphs are wrapped in `aria-hidden="true"` so screen readers use the label only.

## Q. Failed / undone turns don't count against the 20 cap (T4.1)

46. **Unit tests green** — `node --test --experimental-strip-types tests/chargeable-turns.test.ts`. **Pass:** 12 cases pass covering empty, happy path, failed/undone exclusion, undo pairs, synthetic-failed, unknown-status safe-by-default.
47. **Failed turn is free** — force a turn to fail (e.g. disconnect network during streaming, or use a malformed prompt that Anthropic rejects). **Pass:** the counter does NOT increment; DB shows `ChatTurn.status='failed'`; the next turn is still accepted.
48. **Undo pair is net-zero** — perform one undo (T3.4 flow above). **Pass:** the counter stays at the same number; both the original `status='undone'` row and the synthetic revert row are excluded from `countChargeableTurns`.
49. **Absolute row cap enforced** — manually insert ~200 rows (`MAX_TOTAL_TURNS_PER_PARTY`) by alternately submitting and undoing. **Pass:** the 201st `/chat` POST returns 409 (total-rows guard in `reserveTurnSlot`).

## R. ShipSheet draft persistence (T4.3)

50. **Unit tests green** — `node --test --experimental-strip-types tests/ship-draft.test.ts`. **Pass:** 16 cases pass (null / malformed / mistyped inputs, round-trip, length caps on title + body, SSR guard, quota-exceeded swallow, cross-party isolation).
51. **Edit, close, reopen preserves draft** — open ShipSheet, edit the title to "feat: draft me" and append "EXTRA TEXT" to the body. Close the tab without shipping. Reopen in a new tab and navigate to the same party → open the sheet. **Pass:** both edits are restored.
52. **DevTools storage key** — Application → Local Storage → confirm the entry `patchparty:ship:<partyId>` with JSON `{"title":"...","body":"...","type":"feat"}`. **Pass:** exactly that shape, only those three fields round-trip.
53. **Clear on successful ship** — ship the PR successfully. **Pass:** the localStorage entry is removed; reopening the sheet for the same party shows the success state (not a stale form).
54. **Tampered oversized entry is rejected** — in DevTools Console, run `localStorage.setItem('patchparty:ship:<partyId>', JSON.stringify({ title: 'x'.repeat(201), body: 'ok', type: 'feat' }))`. Reopen the sheet. **Pass:** the sheet falls back to the server preview (draft is rejected by `parseShipDraft` because the title exceeds 200 chars). No crash.
55. **Cross-party isolation** — edit a draft in party A, don't ship. Open party B. **Pass:** party B's sheet does NOT show party A's draft text (key is party-scoped).

## S. Cross-cutting: typecheck + test suite

56. **`bun tsc --noEmit`** — must exit 0, zero errors.
57. **`node --test --experimental-strip-types tests/*.test.ts`** — all tests pass (as of commit `c0961c0`: 95 tests).

## T. 13-step end-to-end smoke (T4.4)

Walk the full user journey from `03-tasks.md §T4.4`:

1. Start a party from a GitHub issue URL.
2. Wait for 3 personas to finish.
3. Peek at one persona's preview (pre-pick). Close peek.
4. Pick one. Verify 2 loser sandboxes terminate within 10s (`SELECT "sandboxTerminatedAt" FROM "Agent" WHERE "partyId" = '…';` — all 3 timestamps within 10s of the pick).
5. IteratePage renders with preview + empty turn list.
6. Toggle Viewport Desktop → Mobile → Desktop. Confirm iframe reframes, no reload (input value persists inside the iframe).
7. Send chat message "make the header sticky". Watch SSE stream: `turn_started → text_delta → tool_call → tool_result → commit → diff_stats → turn_done`. TurnCard renders with file pill(s); click one → DiffDrawer shows diff.
8. Click `Run build` chip → template inserted → edit → send. Build runs in sandbox.
9. Click `Undo last` → confirm → revert commit appears; original TurnCard greyed.
10. Click ShipBar (the "Ship" header button) → sheet opens with pre-filled body → edit → Ship → PR link appears.
11. Open PR URL in new tab → verify PR body matches sheet edits and the `<!--` substring is absent.
12. Wait 10 min idle → sandbox pauses → banner shows → resume → iterate again without issues.
13. Re-ship or terminate sandbox from success card (if re-ship: the flow can be exercised twice on the same party).

## Success criteria — what "green" means for this smoke

- **Steps 1–16 pass** → Sprint 1 + Sprint 2 + T3.1 foundation solid.
- **Steps 17–23 pass** (where applicable) → security hardening holds under adversarial probes.
- **Steps 24–28 pass** → data-layer invariants hold.
- **Steps 29–55 pass** → Sprint 3 + Sprint 4 UX additions behave per spec.
- **Steps 56–57 pass** → typecheck + test suite are green.
- **Section T (13-step end-to-end)** → v2.1 is ready to demo.

If anything red: stop, open an issue, link to the failing step number. Do not ship.

## Known limitations — not tested by this script

- Managed-mode daily cost cap (S8) — deferred to v2.2, see `deferred.md`.
- Stale-draft banner for ShipSheet — deferred to v2.2.
- Full token-based CSRF (oslo/csrf) — deferred to v2.2 unless subdomains appear.
- `/pr` rate limit — deferred to v2.2.
