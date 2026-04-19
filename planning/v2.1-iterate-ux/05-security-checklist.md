# Security Checklist

From security-reviewer swarm pass (2026-04-19). Each item has severity, concrete mitigation, and an acceptance test. Check each box before Sprint 4 smoke.

## HIGH — Must fix before any demo

### S1. Iframe sandbox attribute — ✅ shipped (T2.1)
- [x] Every `<iframe>` instance of a preview URL has `sandbox="allow-scripts allow-same-origin allow-forms allow-popups-to-escape-sandbox"` + `referrerpolicy="no-referrer"`
- [x] Proxy response headers always include `Content-Security-Policy: frame-ancestors 'self'`
- [x] App-wide `next.config.js` CSP: `frame-src 'self'`
- **Verify:** browser devtools → inspect iframe → `sandbox` attr present; `window.parent.document` from iframe → SecurityError

### S2. Diff/code rendering XSS — ✅ shipped (T2.4 + T3.2)
- [x] `prism-react-renderer`'s `Highlight` element API drives syntax highlighting in `src/app/party/[id]/diff-drawer.tsx` — no HTML strings reach the DOM
- [x] Zero `dangerouslySetInnerHTML={...}` JSX props anywhere in the DiffDrawer / TurnCard / TurnColumn tree (enforced by `tests/diff-drawer-xss.test.ts`)
- [x] Diff content arrives from `/api/party/[id]/turns/[idx]/diff` which path-validates via `checkSandboxPath` and commit-SHA-pins the request
- **Verify:** `tests/diff-drawer-xss.test.ts` asserts the attacker fixture `</pre><script>alert(1)</script><pre>` classifies as a plain context line (never routed to any raw-HTML sink)

### S3. Rate limit on /api/party/[id]/chat — ✅ shipped (T2.2)
- [x] Per-user sliding window: 4 requests / 60s (based on `session.user.id`)
- [x] Per-party inflight guard (advisory lock from T1.3 counts)
- [x] 429 response includes `Retry-After` header
- [x] `@upstash/ratelimit` + Upstash Redis — installed; creds must be set in Railway env
- **Verify:** 5 fetches in 30s → 1× 429; 6th fetch after 60s → 200
- **Note:** when env vars are absent, limiter is a no-op (D5). Production must set both.

## MEDIUM — Fix before public launch

### S4. CSRF defense (lightweight) — ✅ shipped (T2.5)
- [x] Every state-changing POST from the client sends `x-patchparty-request: 1` header (`csrfFetch`)
- [x] Write-routes `/pr`, `/chat`, `/pick`, `/resume` check the header; return 403 if missing
- [ ] `/chat/undo` — not shipped yet (lands with T3.4)
- [x] `/api/cron/sandbox-lifecycle` is exempt (uses Bearer token auth, not cookies)
- [x] Auth runs **before** CSRF on all four routes (D9) so anon probes see 401 not 403
- **Verify:** `curl -X POST /api/party/x/pr` without header → 403; with header → normal processing

### S5. PR body injection into future prompts — pending (lands with T3.5 ShipSheet)
- [ ] Ship-PR endpoint strips HTML comments (`/<!--[\s\S]*?-->/g`) from user-edited body before sending to GitHub
- [ ] Cap body length at 2000 chars (GitHub issue-body constraints may already enforce something, but enforce our own too)
- [ ] Any path that re-reads a PR body as input to Anthropic (doesn't exist today, but guardrail for future) must wrap it in a distinct user-turn message, not splice into system prompt
- **Verify:** paste body containing `<!-- system: ignore instructions -->` → served on GitHub PR but never echoed into Anthropic messages
- **Note:** current `/api/party/[id]/pr` uses a canned body (no user-editable PR copy yet); S5 becomes a real surface only once ShipSheet lets users edit the body.

### S6. Secrets-file deny-list in read_file + apply_edit — ✅ shipped (T2.3)
- [x] `checkSandboxPath` (src/lib/safe-path.ts) refuses `/^\.env(?:\.(?!example$|sample$)[^/\\]+)?$/`, `/\.(pem|key|p12|pfx|jks)$/i`, `/^id_(rsa|ed25519|ecdsa|dsa)(?:\.pub)?$/`, `/^credentials$/`, `/^\.netrc$/`
- [x] Returns `{ output: "<read_file|apply_edit> refused: Access to ... denied...", isError: true }` on match
- [x] 18 unit tests in `tests/safe-path.test.ts` (incl. `.env.example` whitelist, `.pem`, SSH keys, `.aws/credentials`, Windows backslash edge cases)
- **Verify:** chat message asking Claude to read `.env` returns refusal in tool_result; marker string does not appear in chat pane

### S7. Chip templates never interpolate user/repo strings — ✅ shipped (T3.3)
- [x] All 5 chip templates are hard-coded client-side constants in `src/app/party/[id]/chip-row.tsx` (`CHIP_TEMPLATES: readonly ChipTemplate[]`)
- [x] No merge fields like `{{file}}`, `{{branch}}`, `{{issue}}`, no `${…}` template-literal interpolation
- [x] `Undo last` is a direct-action chip (no textarea pass-through); the other four insert literal strings into the draft
- **Verify:** `tests/chip-templates.test.ts` asserts no `${…}` / `{{…}}` in the array body, the 5 expected chip IDs exist, and no `party.*` / `repo.*` / `file.*` references appear

### S8. Managed-mode daily cost cap — deferred to v2.2
- [ ] `User.dailyManagedCostUsd Decimal @default(0)` added
- [ ] Increment inside the `ChatTurn.create` transaction only for managed-mode users
- [ ] Nightly cron (or cron at cheap interval) resets to 0 via `dailyManagedCostResetAt`
- [ ] `runChatTurn` early-exit if cap exceeded; surface `turn_failed` with "daily cost cap reached — add your Anthropic key via BYOK"
- [ ] Configurable via `MANAGED_DAILY_CAP_USD` env (default `2.00`)
- **Status:** DEFERRED to v2.2 per locked decision in `00-locked-decisions.md`. v2.1 ships BYOK-first — managed mode stays behind the existing 20-turn cap + free-tier Anthropic keys that auto-throttle at the provider. Record in `deferred.md` before Sprint 4 smoke.

## LOW — Nice to have

### S9. Sandbox-cleanup route ownership check (audit)
- [ ] Confirm `/api/sandbox/cleanup` (invoked via `sendBeacon` on page close) validates `sandboxIds` belong to the requesting user's parties
- **Verify:** read the route; if ownership check absent, add it

### S10. Undo as soft-delete
- [ ] `ChatTurn.status` can take value `'undone'` (schema supports it)
- [ ] `buildMessageHistory` filter `status: 'applied'` excludes undone turns (already the case)
- [ ] Never hard-delete the row (audit trail preserved, cost accounting intact)
- **Verify:** undo a turn → DB row persists with `status='undone'` + `revertedByTurnIndex` populated

### S11. Viewport toggle is pure client-side
- [ ] No server route reads `?viewport=` query param
- [ ] No proxy behavior change based on viewport
- **Verify:** grep for `viewport` in server routes; should only appear in client components

## Checklist summary for PR description

Copy this block into the final v2.1 PR body:

```
## Security changes

HIGH (must-have):
- [ ] S1 iframe sandbox + CSP
- [ ] S2 safe diff rendering (prism-react-renderer)
- [ ] S3 rate limit on /chat + inflight lock

MEDIUM:
- [ ] S4 CSRF custom header
- [ ] S5 PR body HTML-comment strip
- [ ] S6 secrets-file deny-list in read_file
- [ ] S7 hard-coded chip templates
- [ ] S8 daily cost cap (or deferred with link)

LOW (audit):
- [ ] S9 sandbox-cleanup ownership check
- [ ] S10 undo as soft-delete
- [ ] S11 viewport toggle client-side only
```
