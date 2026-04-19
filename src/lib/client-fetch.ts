// Client-side fetch helper that attaches PatchParty's CSRF header.
//
// Every state-changing POST from the browser must carry
// `x-patchparty-request: 1` — the server enforces this via
// `requireCsrfHeader` (src/lib/csrf.ts). Use `csrfFetch` instead of plain
// `fetch` for any POST / PUT / PATCH / DELETE so the header is applied
// consistently and in one place.

import { CSRF_HEADER, CSRF_HEADER_VALUE } from './csrf-constants'

export async function csrfFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(init.headers ?? {})
  headers.set(CSRF_HEADER, CSRF_HEADER_VALUE)
  return fetch(input, { ...init, headers })
}
