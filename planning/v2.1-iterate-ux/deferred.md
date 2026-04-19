# Deferred — v2.1 Iterate-UX

Items intentionally skipped in v2.1 with a one-line reason. Each entry names the
task / finding, the severity, why we're deferring, and where it's tracked for
v2.2.

## From the original scope (05-security-checklist.md)

### S8 — Managed-mode daily cost cap → v2.2
- **What:** `User.dailyManagedCostUsd` + per-turn increment + nightly reset + early-exit in `runChatTurn` when cap exceeded.
- **Why deferred:** v2.1 is BYOK-first — users bring their own Anthropic key and the 20-turn per-party cap + provider-side free-tier throttling is sufficient for the hackathon demo. A managed-mode cap needs a billing model we haven't designed yet.
- **Decision reference:** `00-locked-decisions.md` + reaffirmed throughout Sprint 4.
- **Ship in:** v2.2 (paid-tier / managed-key onboarding).

### S9 — `/api/sandbox/cleanup` ownership audit → ✅ done earlier than scope
- Originally LOW (audit). Promoted and fixed as CRITICAL during the Sprint 2 follow-up (commit `b209a43`, decision D9).

### S11 — Viewport toggle client-side purity audit → ✅ done during T3.1
- Grep confirmed no server route reads `?viewport=`. Checked off in T3.1 (`a6d3186`).

## Reviewer-flagged items kept out of v2.1

### T2.2 / `/pr` rate limiting → v2.2
- **Severity:** MEDIUM (security-reviewer on T3.5).
- **What:** `/api/party/[id]/pr` has no rate limit of its own. The `/chat` 4-per-60s sliding window indirectly throttles PR creation (you need applied turns to ship) but a user could in theory mash the Ship button to spam GitHub PR creation on pre-existing applied turns.
- **Why deferred:** GitHub's own API rate limit (5000 req/h per user token) is the next-ring defence, and the UX disables the button during the in-flight request. Low real-world risk for a hackathon demo.
- **Ship in:** v2.2 — add a per-user `@upstash/ratelimit` slot for `/pr` (1 req / 10 s is plenty).

### Full token-based CSRF (oslo/csrf) → v2.2 unless subdomains appear
- **Severity:** MEDIUM.
- **What:** v2.1 uses a lightweight custom-header scheme (`x-patchparty-request: 1`) — sufficient for a single-origin same-site-cookie deployment.
- **Why deferred:** locked in `03-tasks.md §T2.5` defer clause. If we ever add a subdomain (e.g. `api.patchparty.dev`) the cross-subdomain-same-site story needs real tokens.
- **Ship in:** v2.2 when infrastructure demands it.

### ShipSheet — stale-draft banner → v2.2
- **Severity:** MEDIUM (code-reviewer on T4.3).
- **What:** if a user edits the Ship draft, closes the tab, then more turns are applied in another session, the localStorage draft body no longer reflects the real diff. We load it anyway ("draft wins over preview").
- **Why deferred:** product decision — most users finish in one session. A banner ("Your saved draft may not reflect recent changes — [reset to current]") is the right long-term UX but out of scope for v2.1.
- **Ship in:** v2.2 with a dismissible banner + "reset to current" button.

### ShipSheet — userId-prefixed localStorage key → v2.2
- **Severity:** LOW (security-reviewer on T4.3, shared-device privacy).
- **What:** key format today is `patchparty:ship:${partyId}`. On a shared machine, a prior user's draft title/body would be visible to the next user (for the same partyId, which is per-user on the server, so they can't actually ship it — but the *text* is disclosed).
- **Why deferred:** hackathon + BYOK users run on their own machines. Prefixing the key with `userId` needs plumbing the session-user into `<ShipSheet>` props; not worth the churn for v2.1.
- **Ship in:** v2.2 — prefix `patchparty:ship:${userId}:${partyId}` (then migrate or orphan old entries on user switch).

### CSP `script-src` / `default-src` tightening → v2.2
- **Severity:** MEDIUM (security-reviewer, Sprint 2).
- **What:** v2.1's CSP is clickjacking-only (`frame-src` + `frame-ancestors`). No `script-src`, no `default-src`.
- **Why deferred:** noted in D9; Next.js dev HMR conflicts with strict `script-src` unless nonces are wired, which is a non-trivial refactor.
- **Ship in:** v2.2 — migrate to strict-dynamic nonce scheme for App Router.

## Nothing else is deferred

Every other Sprint 1–4 task either shipped or has its follow-up commit landed.
The 13-step E2E smoke (T4.4) remains a **manual** run the user executes once
deployed (see `TESTING.md` §§L–R for the extended v2.1 steps).
