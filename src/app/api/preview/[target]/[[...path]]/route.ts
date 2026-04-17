import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

function decodeTarget(target: string): { url: string; token?: string } | null {
  try {
    const b64 = target.replace(/-/g, '+').replace(/_/g, '/')
    const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4))
    const json = Buffer.from(b64 + pad, 'base64').toString('utf-8')
    const parsed = JSON.parse(json)
    if (typeof parsed?.url === 'string') return parsed
    return null
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

async function proxy(
  req: NextRequest,
  { params }: { params: Promise<{ target: string; path?: string[] }> },
) {
  const { target, path } = await params
  const decoded = decodeTarget(target)
  if (!decoded) return new Response('Invalid target', { status: 400 })

  const subPath = path && path.length ? '/' + path.join('/') : '/'
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
