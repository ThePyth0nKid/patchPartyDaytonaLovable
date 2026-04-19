// SSRF allowlist for the preview proxy (see
// src/app/api/preview/[target]/[[...path]]/route.ts).
//
// The decoded target URL is user-controlled (base64-encoded in the route
// segment), so we MUST refuse anything that isn't obviously a Daytona
// preview. Without this check an authenticated user could point the
// proxy at 169.254.169.254 (cloud metadata), an internal Railway host,
// or file:// — and happily receive the response body.
//
// Extracted from the route handler so the suffix list + predicate can
// be unit-tested without booting the full Next runtime.

const DEFAULT_SUFFIXES = [
  // Current Daytona production proxy (confirmed via Railway logs,
  // 2026-04-19: `https://3000-<uuid>.daytonaproxy01.net`).
  '.daytonaproxy01.net',
  // Earlier / alternate Daytona proxy domains. Kept so rollbacks and
  // multi-region deploys keep working.
  '.daytona.work',
  '.daytona.app',
  '.daytona.io',
] as const

export function parseSuffixes(raw: string | undefined | null): string[] {
  const fromEnv = (raw ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
  return fromEnv.length ? fromEnv : [...DEFAULT_SUFFIXES]
}

export const PREVIEW_HOST_SUFFIXES = parseSuffixes(
  process.env.DAYTONA_PREVIEW_HOST_SUFFIXES,
)

export function isAllowedPreviewUrl(
  raw: string,
  suffixes: readonly string[] = PREVIEW_HOST_SUFFIXES,
): boolean {
  let u: URL
  try {
    u = new URL(raw)
  } catch {
    return false
  }
  if (u.protocol !== 'https:') return false
  const host = u.hostname.toLowerCase()
  return suffixes.some((suffix) => host.endsWith(suffix))
}
