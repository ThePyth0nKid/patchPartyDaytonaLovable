// Lightweight CSRF guard using a custom header.
//
// Standard cross-origin `<form>` and `<img src>` attacks can't set custom
// request headers — only fetch/XHR from the same origin can. Requiring
// every state-changing POST to carry `x-patchparty-request: 1` therefore
// blocks drive-by CSRF without issuing a token cookie.
//
// Limitations:
//   - Defense depth is "CSRF Basic", not "token CSRF". If a subdomain of
//     patchparty.dev is ever compromised and can fetch with credentials,
//     this won't stop it — but PatchParty is a single-origin app today.
//   - sendBeacon cannot set custom headers; callers that need sendBeacon
//     (currently only /api/sandbox/cleanup) must rely on other controls.
//
// Plan: v2.2 upgrades to a proper double-submit token if subdomains appear.

import { NextRequest, NextResponse } from 'next/server'

export { CSRF_HEADER, CSRF_HEADER_VALUE } from './csrf-constants'
import { CSRF_HEADER, CSRF_HEADER_VALUE } from './csrf-constants'

/**
 * Reject any request that doesn't carry our custom CSRF header. Returns a
 * 403 response when missing/mismatched, or `null` when the request is OK
 * to proceed — use as: `const r = requireCsrfHeader(req); if (r) return r`.
 */
export function requireCsrfHeader(req: NextRequest): NextResponse | null {
  const header = req.headers.get(CSRF_HEADER)
  if (header !== CSRF_HEADER_VALUE) {
    return NextResponse.json(
      { error: 'CSRF header missing or invalid' },
      { status: 403 },
    )
  }
  return null
}
