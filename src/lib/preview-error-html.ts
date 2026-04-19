// Friendly HTML fallback for the preview proxy
// (src/app/api/preview/[target]/[[...path]]/route.ts).
//
// When the upstream Daytona preview returns a non-2xx response for the
// top-level document — typically because the sandbox was auto-stopped,
// deleted, or never existed — the old proxy streamed the raw error JSON
// into the iframe:
//
//     {"statusCode":400,"message":"bad request: failed to get runner
//     info: Sandbox with ID f22b…d63412 not found", ...}
//
// That's user-hostile. This module builds a minimal dark-themed HTML
// page that explains the situation in plain language. Served from the
// same origin, it fits inside the iframe naturally and doesn't fight
// the sandbox attribute (no scripts, no external assets).
//
// Extracted into its own module so the classification + escaping logic
// can be unit-tested without spinning up a Next request.

/** Lightweight classifier for upstream response bodies. We try not to
 *  false-positive on legitimate HTML that happens to mention "error" —
 *  the caller checks `res.status >= 400` before consulting us. */
export interface UpstreamErrorInfo {
  status: number
  /** Best-effort hint extracted from the upstream body. Bounded length,
   *  already escaped for HTML embedding. Never contains `<` / `>`. */
  hint: string
}

/** Parse a JSON-ish error body (as emitted by Daytona's API layer) and
 *  return a short human-readable hint. Accepts the raw text — returns
 *  empty string if nothing useful can be extracted. */
export function extractErrorHint(body: string, contentType: string): string {
  if (!body) return ''
  // Only peek at bodies that look JSON-ish; HTML error pages would need
  // their own scraping rules and aren't worth the complexity.
  if (!/json/i.test(contentType) && !body.trimStart().startsWith('{')) {
    return ''
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(body)
  } catch {
    return ''
  }
  if (typeof parsed !== 'object' || parsed === null) return ''
  const obj = parsed as Record<string, unknown>
  const msg =
    typeof obj.message === 'string'
      ? obj.message
      : typeof obj.error === 'string'
        ? obj.error
        : ''
  return msg.slice(0, 240)
}

/** Heuristic: does the upstream error indicate the sandbox has been
 *  permanently deleted (as opposed to temporarily paused / network-flaky)? */
export function isSandboxGone(status: number, hint: string): boolean {
  if (status === 404) return true
  return /not found|does not exist/i.test(hint)
}

/** Escape for safe embedding inside an HTML text node or attribute. The
 *  hint is already capped at 240 chars by `extractErrorHint`, so the
 *  output length is bounded. */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Build the friendly HTML body. Pure function of inputs — no globals,
 *  no Next/Request/process access, so it's trivially unit-testable. */
export function buildPreviewErrorHtml(info: UpstreamErrorInfo): string {
  const gone = isSandboxGone(info.status, info.hint)
  const title = gone
    ? 'Preview is no longer available'
    : 'Preview is temporarily unreachable'
  const detail = gone
    ? 'The sandbox backing this preview has been terminated. Start a new party to generate a fresh preview.'
    : info.status >= 500
      ? 'The sandbox is unreachable right now. It may be paused — try again in a moment.'
      : 'The sandbox returned an unexpected response. Try refreshing this panel.'
  const safeHint = info.hint ? escapeHtml(info.hint) : ''
  const safeStatus = String(info.status).slice(0, 4)

  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
  html,body{margin:0;padding:0;height:100%;background:#0b1220;color:#e2e8f0;
    font:14px/1.55 ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;}
  .wrap{min-height:100%;display:flex;align-items:center;justify-content:center;padding:32px}
  .card{max-width:440px;text-align:center}
  .badge{display:inline-block;font-family:ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#94a3b8;
    border:1px solid #334155;border-radius:999px;padding:4px 10px;margin-bottom:20px}
  .title{font-size:17px;font-weight:600;color:#f1f5f9;margin:0 0 10px;letter-spacing:-0.01em}
  .detail{color:#94a3b8;font-size:13px;margin:0 0 16px}
  .hint{color:#64748b;font-size:11px;font-family:ui-monospace, SFMono-Regular, Menlo, monospace;
    word-break:break-word;background:#0f172a;border:1px solid #1e293b;border-radius:7px;
    padding:10px 12px;margin:12px 0 0;text-align:left;white-space:pre-wrap;line-height:1.5;
    max-height:120px;overflow:auto}
</style>
</head>
<body><div class="wrap"><div class="card">
  <div class="badge">Sandbox · ${safeStatus}</div>
  <h1 class="title">${escapeHtml(title)}</h1>
  <p class="detail">${escapeHtml(detail)}</p>
  ${safeHint ? `<pre class="hint">${safeHint}</pre>` : ''}
</div></div></body></html>`
}
