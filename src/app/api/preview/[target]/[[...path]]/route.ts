import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

// SSRF allowlist. The `target` URL is user-controlled (base64-encoded in
// the route segment), so we MUST refuse anything that isn't obviously a
// Daytona preview. Without this check an authenticated user could point
// the proxy at 169.254.169.254 (cloud metadata), an internal Railway
// hostname, or file:// — and happily receive the response body.
//
// Daytona previews resolve to `*.proxy.daytona.work` today. We keep a
// short hardcoded suffix list + allow overriding via env for self-hosted
// Daytona installations.
const PREVIEW_HOST_SUFFIXES = (() => {
  const fromEnv = (process.env.DAYTONA_PREVIEW_HOST_SUFFIXES ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
  const defaults = ['.daytona.work', '.daytona.app', '.daytona.io']
  return fromEnv.length ? fromEnv : defaults
})()

function isAllowedPreviewUrl(raw: string): boolean {
  let u: URL
  try {
    u = new URL(raw)
  } catch {
    return false
  }
  if (u.protocol !== 'https:') return false
  const host = u.hostname.toLowerCase()
  return PREVIEW_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix))
}

function decodeTarget(target: string): { url: string; token?: string } | null {
  try {
    const b64 = target.replace(/-/g, '+').replace(/_/g, '/')
    const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4))
    const json = Buffer.from(b64 + pad, 'base64').toString('utf-8')
    const parsed = JSON.parse(json)
    if (typeof parsed?.url !== 'string') return null
    if (!isAllowedPreviewUrl(parsed.url)) return null
    return parsed
  } catch {
    return null
  }
}

function pathLooksLikeHtml(path: string): boolean {
  return path === '/' || /\.html?($|\?)/i.test(path)
}

function contentTypeFromExt(path: string): string | null {
  const ext = path.match(/\.([a-zA-Z0-9]+)(?:\?|$)/)?.[1]?.toLowerCase()
  if (!ext) return null
  if (['js', 'mjs', 'cjs', 'jsx', 'ts', 'tsx'].includes(ext))
    return 'application/javascript; charset=utf-8'
  if (ext === 'css') return 'text/css; charset=utf-8'
  if (ext === 'svg') return 'image/svg+xml'
  if (ext === 'json') return 'application/json; charset=utf-8'
  if (ext === 'ico') return 'image/x-icon'
  if (ext === 'png') return 'image/png'
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg'
  if (ext === 'webp') return 'image/webp'
  if (ext === 'woff') return 'font/woff'
  if (ext === 'woff2') return 'font/woff2'
  return null
}

function isViteVirtualJsPath(path: string): boolean {
  return (
    path.startsWith('/@vite/') ||
    path.startsWith('/@react-refresh') ||
    path.startsWith('/@id/') ||
    path.startsWith('/@fs/') ||
    path.startsWith('/node_modules/')
  )
}

function looksLikeJsSource(body: string): boolean {
  // Vite wraps CSS / SVG / etc. as JS modules with an `import …` prefix at the
  // very top. This sniff catches that and forces the correct MIME type.
  const head = body.trimStart().slice(0, 200)
  return (
    /^import\b/.test(head) ||
    /^export\b/.test(head) ||
    /^const\s+/.test(head) ||
    /^var\s+/.test(head) ||
    /^let\s+/.test(head) ||
    head.startsWith('(function') ||
    head.startsWith('/* ') ||
    /^__vite__/.test(head)
  )
}

function rewriteHtml(body: string, prefix: string): string {
  // Prefix absolute URLs (`"/foo"`, `'/foo'`, template `` `/foo` ``) so they
  // traverse our proxy. Skip `//` (protocol-relative).
  return body.replace(/(["'`])\/(?!\/)/g, `$1${prefix}/`)
}

function rewriteJs(body: string, prefix: string): string {
  // Only rewrite import/export/from specifiers that start with `/` so we don't
  // accidentally mangle unrelated string literals.
  return body.replace(
    /(\b(?:import|from|export\s+(?:\*|\{[^}]*\})\s+from)\s+["'])\/(?!\/)/g,
    `$1${prefix}/`,
  )
}

function rewriteCss(body: string, prefix: string): string {
  return body.replace(/url\((['"]?)\/(?!\/)/g, `url($1${prefix}/`)
}

// Stub replacement for Vite's @vite/client. The real one opens a WebSocket to
// the origin for HMR; when we serve through our proxy the origin is our Next
// server (no WS) so the client flips into "connection lost" → polls → triggers
// `location.reload()` the moment polling "succeeds" against Railway's edge,
// which causes the iframe to flicker between blank and rendered. Disabling HMR
// here keeps the preview stable.
const VITE_CLIENT_STUB = `// Proxy-injected stub: Vite HMR disabled for the PatchParty iframe preview.
// Must export every name the Vite-transformed modules might import (react-refresh,
// CSS modules, etc.), otherwise ES-module loading throws "does not provide an
// export named …" and the iframe goes blank.
export function createHotContext() {
  return {
    accept() {}, acceptExports() {}, dispose() {}, prune() {}, decline() {},
    invalidate() {}, on() {}, off() {}, send() {},
    data: {},
  };
}
export function updateStyle(id, content) {
  try {
    const sel = 'style[data-vite-dev-id="' + id + '"]';
    let el = document.querySelector(sel);
    if (!el) {
      el = document.createElement('style');
      el.setAttribute('data-vite-dev-id', id);
      document.head.appendChild(el);
    }
    el.textContent = content;
  } catch (_) {}
}
export function removeStyle(id) {
  try {
    const el = document.querySelector('style[data-vite-dev-id="' + id + '"]');
    if (el) el.remove();
  } catch (_) {}
}
// Vite appends ?t=timestamp / ?v=hash to module URLs for cache busting — in our
// static preview we just return the URL unchanged.
export function injectQuery(url, queryToInject) { return url; }
// Error-overlay no-ops so HMR error paths don't throw.
export const ErrorOverlay = class extends HTMLElement { constructor(){ super(); } close(){} };
if (typeof customElements !== 'undefined' && !customElements.get('vite-error-overlay')) {
  try { customElements.define('vite-error-overlay', ErrorOverlay); } catch (_) {}
}
// Logger / ping helpers used by some Vite transforms.
export function hmrPrelude() {}
export function createHotContextForDep() { return createHotContext(); }
export const hmrClient = {
  notifyListeners() {}, send() {}, messenger: { send() {} },
  queueUpdate() {}, queueMsg() {}, warnFailedFetch() {},
};
export function warnFailedFetch() {}
// Default export guard so a bare default import resolves.
export default {};
`

async function proxy(
  req: NextRequest,
  { params }: { params: Promise<{ target: string; path?: string[] }> },
) {
  const { target, path } = await params
  const decoded = decodeTarget(target)
  if (!decoded) return new Response('Invalid target', { status: 400 })

  const subPath = path && path.length ? '/' + path.join('/') : '/'

  // Short-circuit Vite's HMR client to a no-op so the iframe doesn't flicker
  // from WebSocket-failure reload loops.
  if (subPath === '/@vite/client') {
    return new Response(VITE_CLIENT_STUB, {
      status: 200,
      headers: {
        'content-type': 'application/javascript; charset=utf-8',
        'cache-control': 'no-store',
      },
    })
  }

  const upstream =
    decoded.url.replace(/\/$/, '') + subPath + (req.nextUrl.search || '')

  const headers: Record<string, string> = {
    'x-daytona-skip-preview-warning': 'true',
  }
  if (decoded.token) headers['x-daytona-preview-token'] = decoded.token

  const init: RequestInit = { method: req.method, headers, redirect: 'follow' }
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    init.body = await req.arrayBuffer()
  }

  let res: Response
  try {
    res = await fetch(upstream, init)
  } catch (e) {
    return new Response(`Upstream fetch failed: ${String(e)}`, { status: 502 })
  }

  const out = new Headers(res.headers)
  out.delete('content-security-policy')
  out.delete('content-security-policy-report-only')
  out.delete('x-frame-options')
  out.delete('content-encoding')
  out.delete('content-length')
  out.set('cache-control', 'no-store')
  // Clamp where the preview can be embedded. Combined with the app-wide
  // `frame-src 'self'` (next.config.js) this means: only our own origin
  // may iframe the preview, and the preview iframe can only load stuff
  // served through this proxy. A phished/forged page cannot embed a
  // user's preview to capture keystrokes.
  out.set('content-security-policy', "frame-ancestors 'self'")

  const origCt = (res.headers.get('content-type') || '').toLowerCase()
  const prefix = `/api/preview/${target}`

  // If HEAD or we can't usefully rewrite (binary images, fonts), stream through.
  const mayNeedRewriteByCt =
    /html|javascript|ecmascript|css/i.test(origCt) || origCt === '' || /^text\//i.test(origCt)
  if (req.method === 'HEAD' || !mayNeedRewriteByCt) {
    // Fix obvious MIME mismatches for binary-ish paths served as text/html.
    const extCt = contentTypeFromExt(subPath)
    if (/^text\/html/i.test(origCt) && !pathLooksLikeHtml(subPath) && extCt) {
      out.set('content-type', extCt)
    }
    return new Response(res.body, { status: res.status, headers: out })
  }

  // Read the text body once — then decide what to do.
  const text = await res.text()

  // Decide true content-type.
  //   1. Start from upstream ct.
  //   2. If upstream says text/html but path is clearly not HTML → use ext.
  //   3. If body looks like JS (Vite wraps CSS/SVG/etc. as JS modules) → JS.
  let ct = res.headers.get('content-type') || 'text/plain'
  if (/^text\/html/i.test(ct) && !pathLooksLikeHtml(subPath)) {
    ct = contentTypeFromExt(subPath) ?? (isViteVirtualJsPath(subPath) ? 'application/javascript; charset=utf-8' : ct)
  }
  if (!/javascript/i.test(ct) && looksLikeJsSource(text)) {
    ct = 'application/javascript; charset=utf-8'
  }
  out.set('content-type', ct)

  let body = text
  if (/html/i.test(ct)) body = rewriteHtml(text, prefix)
  else if (/javascript|ecmascript/i.test(ct)) body = rewriteJs(text, prefix)
  else if (/css/i.test(ct)) body = rewriteCss(text, prefix)

  return new Response(body, { status: res.status, headers: out })
}

export const GET = proxy
export const POST = proxy
export const HEAD = proxy
