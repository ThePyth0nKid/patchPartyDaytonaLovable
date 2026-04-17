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

  const res = await fetch(upstream, init)

  const out = new Headers(res.headers)
  out.delete('content-security-policy')
  out.delete('x-frame-options')
  out.delete('content-encoding')
  out.delete('content-length')

  return new Response(res.body, { status: res.status, headers: out })
}

export const GET = proxy
export const POST = proxy
export const HEAD = proxy
