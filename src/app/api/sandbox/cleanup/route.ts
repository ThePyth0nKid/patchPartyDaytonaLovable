// POST /api/sandbox/cleanup — reclaim sandboxes when the user navigates away.
//
// Called from the party page via `navigator.sendBeacon` on `pagehide`
// (fallback: `fetch keepalive`). Both carry the session cookie, so we can
// enforce:
//   1. User is signed in.
//   2. Every sandboxId belongs to a party the user owns — no cross-user
//      DoS where a malicious caller spams someone else's sandbox IDs.
//
// CSRF note: sendBeacon cannot set custom headers, so this endpoint is
// intentionally exempt from `requireCsrfHeader`. The auth + ownership
// check is the actual defence — a drive-by POST from an attacker site
// either (a) has no session cookie (unauth → 401) or (b) has a session
// cookie for the attacker's own account, in which case they can only
// delete *their own* sandboxes, which is equivalent to them hitting the
// endpoint themselves.

import { NextRequest, NextResponse } from 'next/server'
import { Daytona } from '@daytonaio/sdk'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { log } from '@/lib/log'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const userId = session.user.id

  let sandboxIds: string[] = []
  try {
    const body = await req.json()
    if (Array.isArray(body?.sandboxIds)) {
      sandboxIds = body.sandboxIds.filter((x: unknown) => typeof x === 'string')
    }
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid body' }, { status: 400 })
  }

  if (sandboxIds.length === 0) {
    return NextResponse.json({ ok: true, cleaned: 0 })
  }

  // Ownership: each sandboxId must live on an Agent whose Party belongs
  // to this user. `findMany` + IN is a single query; we then intersect.
  const owned = await prisma.agent.findMany({
    where: {
      sandboxId: { in: sandboxIds },
      party: { userId },
    },
    select: { sandboxId: true },
  })
  const ownedSet = new Set(
    owned.map((a) => a.sandboxId).filter((x): x is string => !!x),
  )
  const allowed = sandboxIds.filter((id) => ownedSet.has(id))
  if (allowed.length === 0) {
    return NextResponse.json({ ok: true, cleaned: 0 })
  }

  const daytona = new Daytona()
  let cleaned = 0
  await Promise.all(
    allowed.map(async (id) => {
      try {
        const sb = await daytona.get(id)
        await daytona.delete(sb)
        cleaned++
      } catch (e) {
        log.warn('sandbox cleanup failed', { sandboxId: id, error: String(e) })
      }
    }),
  )
  return NextResponse.json({ ok: true, cleaned })
}
