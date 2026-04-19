// Base64url-encode a preview target so the server-side proxy at
// /api/preview/[target] can decode `{ url, token? }` without needing the
// raw values in the URL path. Token (when present) is the ephemeral
// Daytona preview access token; it is only passed through the proxy, not
// exposed on the client beyond this hop.
//
// The output is URL-safe: `+` → `-`, `/` → `_`, padding `=` stripped.
// Kept ASCII-only for now — current Daytona preview URLs are always
// ASCII; UTF-8 safety (via TextEncoder) is deferred.

export function encodePreviewTarget(url: string, token?: string): string {
  const json = JSON.stringify(token ? { url, token } : { url })
  return btoa(json).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
