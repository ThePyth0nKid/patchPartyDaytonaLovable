// POST /api/party/[id]/resume — resume a paused sandbox.
//
// If Daytona `resume` fails (volume expired, SDK rejects) the route returns
// a degraded response so the client can show "Rebuilding sandbox…" and the
// chat UI can soft-block until the next polling tick.

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { resumeParty, markActivity } from '@/lib/sandbox-lifecycle'
import { requireCsrfHeader } from '@/lib/csrf'

export const dynamic = 'force-dynamic'

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const csrf = requireCsrfHeader(req)
  if (csrf) return csrf
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const { id } = await ctx.params

  const party = await prisma.party.findUnique({
    where: { id },
    select: { userId: true, sandboxState: true },
  })
  if (!party) {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }
  if (party.userId !== session.user.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const result = await resumeParty(id)
  if (result.ok) {
    await markActivity(id)
    return NextResponse.json({ ok: true, method: result.method })
  }
  return NextResponse.json(
    { ok: false, method: result.method, error: result.error },
    { status: 502 },
  )
}
