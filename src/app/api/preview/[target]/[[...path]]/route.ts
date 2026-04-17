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

function contentTypeForPath(path: string, original: string): string {
  // Daytona's proxy returns text/html for many non-HTML paths. Fix that for
  // known extensions and well-known Vite virtual paths so browsers accept
  // scripts as modules, etc.
  const ext = path.match(/\.([a-zA-Z0-9]+)(?:\?|$)/)?.[1]?.toLowerCase()
  const jsLike =
    path.startsWith('/@vite/') ||
    path.startsWith('/@react-refresh') ||
    path.startsWith('/@id/') ||
    path.startsWith('/@fs/') ||
    path.startsWith('/node_modules/') ||
    ['js', 'mjs', 'cjs', 'jsx', 'ts', 'tsx'].includes(ext ?? '')

  if (jsLike) return 'application/javascript; charset=utf-8'
  if (ext === 'css') return 'text/css; charset=utf-8'
  if (ext === 'svg') return 'image/svg+xml'
  if (ext === 'json') return 'application/json; charset=utf-8'
  if (ext === 'ico') return 'image/x-icon'
  if (ext === 'png') return 'image/png'
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg'
  if (ext === 'webp') return 'image/webp'
  if (ext === 'woff') return 'font/woff'
  if (ext === 'woff2') return 'font/woff2'
  return original
}

function rewriteBody(body: string, prefix: string, contentType: string): string {
  // Rewrite absolute paths `/foo` → `${prefix}/foo` so subresources route
  // through our proxy instead of hitting our own domain root.
  // We intentionally avoid rewriting `//` (protocol-relative URLs).
  //
  // The approach: match `"/` or `'/` NOT followed by another `/`.
  // This catches attribute values and import specifiers.
  const replaceQuotedAbs = (s: string) =>
    s.replace(/(["'`])\/(?!\/)/g, `$1${prefix}/`)

  if (/html/i.test(contentType)) {
    // Rewrite attribute values + inline script import/from specifiers
    return replaceQuotedAbs(body)
  }
  if (/javascript|ecmascript/i.test(contentType)) {
    // Rewrite ESM import/from `/…` specifiers. Keep it safe: only quoted.
    return body.replace(
      /(\b(?:import|from|export\s+(?:\*|\{[^}]*\})\s+from)\s+["'])\/(?!\/)/g,
      `$1${prefix}/`,
    )
  }
  if (/css/i.test(contentType)) {
    return body.replace(/url\((['"]?)\/(?!\/)/g, `url($1${prefix}/`)
  }
  return body
}

async function proxy(
  req: NextRequest,
  { params }: { params: Promise<{ target: string; path?: string[] }> },
) {
  const { target, path } = await params
  const decoded = decodeTarget(target)
  if (!decoded) return new Response('Invalid target', { status: 400 })

  const subPath = path && path.length ? '/' + path.join('/') : '/'
  const upstream = decoded.url.replace(/\/$/, '') + subPath + (req.nextUrl.search || '')

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

  // Fix broken content-types Daytona returns as text/html for non-HTML paths.
  const originalCt = res.headers.get('content-type') ?? 'text/plain'
  const fixedCt = contentTypeForPath(subPath, originalCt)
  out.set('content-type', fixedCt)

  // Rewrite bodies so absolute paths (`/@vite/client` etc.) traverse our proxy.
  const shouldRewrite =
    /html|javascript|ecmascript|css/i.test(fixedCt) && req.method !== 'HEAD'

  if (shouldRewrite) {
    const text = await res.text()
    const prefix = `/api/preview/${target}`
    const rewritten = rewriteBody(text, prefix, fixedCt)
    return new Response(rewritten, { status: res.status, headers: out })
  }

  return new Response(res.body, { status: res.status, headers: out })
}

export const GET = proxy
export const POST = proxy
export const HEAD = proxy
