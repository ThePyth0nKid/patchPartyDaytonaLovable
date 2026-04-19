# Testing Plan — v2.1 Iterate-UX (Sprint 1 + Sprint 2 + T3.1)

Smoke script for the work shipped through commit `a6d3186` (T3.1 IteratePage extraction). Run locally against `http://localhost:3000` after `bun dev` is up. Each step has a pass criterion; fail-fast — stop and file a bug before moving on.

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

## Success criteria — what "green" means for this smoke

- **Steps 1–16 all pass** → Sprint 1 + Sprint 2 + T3.1 are user-testable. Sign off to move to Sprint 3 T3.2 (TurnCard + DiffDrawer).
- **Steps 17–23 pass** (where applicable) → security hardening holds under adversarial probes.
- **Steps 24–28 pass** → data-layer invariants hold.

If anything red: stop, open an issue, link to the failing step number. Do not continue into T3.2 with a broken foundation.

## Known limitations — not tested by this script

- Diff rendering XSS (S2) — no diff rendered today (ChatPane is still the message body). Defer to T3.2 smoke.
- ShipSheet PR body strip (S5) — no user-editable PR body today. Defer to T3.5 smoke.
- Chip templates (S7) — no chips today. Defer to T3.3 smoke.
- Managed-mode daily cost cap (S8) — deferred to v2.2.
- End-to-end "win the race → iterate 5 turns → ship PR" flow — covered by T4.4's 13-step script.
