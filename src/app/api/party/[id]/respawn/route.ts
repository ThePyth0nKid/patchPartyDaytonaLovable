// POST /api/party/[id]/respawn — rebuild a TERMINATED sandbox from GitHub.
//
// Separate route from /resume because the cost profile is different:
//   - /resume calls `sandbox.resume()` (≤10 s, no fresh Daytona VM).
//   - /respawn calls `daytona.create()` + clone + `npm install` + `npm run dev`
//     (~30–90 s, boots a whole new sandbox). That justifies a tighter
//     rate limit (2 per 5 min) and a separate UI button.
//
// Auth order mirrors /resume: session check → CSRF → ownership → rate
// limit → lifecycle call. The rate limit runs after ownership so it only
// counts against the actual owner, not drive-by attackers.

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { respawnParty } from '@/lib/sandbox-lifecycle'
import { requireCsrfHeader } from '@/lib/csrf'
import { checkRespawnRateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const csrf = requireCsrfHeader(req)
  if (csrf) return csrf
  const { id } = await ctx.params

  const party = await prisma.party.findUnique({
    where: { id },
    select: { userId: true },
  })
  if (!party) {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }
  if (party.userId !== session.user.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const limit = await checkRespawnRateLimit(session.user.id)
  if (!limit.allowed) {
    return NextResponse.json(
      {
        ok: false,
        method: 'failed',
        error: `Too many respawns. Try again in ${limit.retryAfterSeconds}s.`,
      },
      {
        status: 429,
        headers: { 'Retry-After': String(limit.retryAfterSeconds) },
      },
    )
  }

  const result = await respawnParty(id)
  if (result.ok) {
    return NextResponse.json({
      ok: true,
      method: result.method,
      previewUrl: result.previewUrl,
    })
  }
  return NextResponse.json(
    { ok: false, method: result.method, error: result.error },
    { status: 502 },
  )
}
