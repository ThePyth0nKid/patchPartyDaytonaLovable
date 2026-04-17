import { NextRequest } from 'next/server'
import { partyStore } from '@/lib/store'
import { PersonaId } from '@/lib/personas'

export const dynamic = 'force-dynamic'

async function proxy(
  req: NextRequest,
  { params }: { params: Promise<{ partyId: string; personaId: string; path?: string[] }> },
) {
  const { partyId, personaId, path } = await params
  const party = partyStore.get(partyId)
  if (!party) return new Response('Party not found', { status: 404 })

  const agent = party.agents[personaId as PersonaId]
  const base = agent?.result?.previewUrl
  const token = agent?.result?.previewToken
  if (!base) return new Response('No preview available yet', { status: 404 })

  const subPath = path && path.length ? '/' + path.join('/') : '/'
  const target = base.replace(/\/$/, '') + subPath + (req.nextUrl.search || '')

  const headers: Record<string, string> = {
    'x-daytona-skip-preview-warning': 'true',
  }
  if (token) headers['x-daytona-preview-token'] = token

  const init: RequestInit = { method: req.method, headers, redirect: 'follow' }
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    init.body = await req.arrayBuffer()
  }

  const upstream = await fetch(target, init)

  const responseHeaders = new Headers(upstream.headers)
  responseHeaders.delete('content-security-policy')
  responseHeaders.delete('x-frame-options')
  responseHeaders.delete('content-encoding')
  responseHeaders.delete('content-length')

  return new Response(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  })
}

export const GET = proxy
export const POST = proxy
export const HEAD = proxy
