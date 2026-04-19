// GET /api/party/[id]/ship/preview — pre-fill payload for the ShipSheet.
//
// Returns { title, type, body, files, turnCount, totalCostUsd } computed from
// the party's applied chat turns. Read-only — no state mutation. The client
// uses it to hydrate the sheet the first time it opens. Once hydrated the
// sheet keeps its own editable state (and the user can rewrite title/body
// freely); on POST to /pr the server sanitises whatever body the client
// submits (closes S5 — HTML-comment strip + 2000-char cap).

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import {
  aggregateDiffStats,
  buildPreviewBody,
  stripIssueNumberPrefix,
  type ShipBodyFile,
  type ShipBodyTurn,
} from '@/lib/ship-body'

export const dynamic = 'force-dynamic'

interface ShipPreviewResponse {
  title: string
  type: 'feat' | 'fix'
  body: string
  files: ShipBodyFile[]
  turnCount: number
  totalCostUsd: number
}

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const { id } = await ctx.params

  const party = await prisma.party.findUnique({
    where: { id },
    select: {
      userId: true,
      issueTitle: true,
      classification: true,
      pickedPersona: true,
    },
  })
  if (!party) return NextResponse.json({ error: 'not found' }, { status: 404 })
  if (party.userId !== session.user.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const turns = await prisma.chatTurn.findMany({
    where: { partyId: id, status: 'applied' },
    orderBy: { turnIndex: 'asc' },
    select: {
      turnIndex: true,
      userMessage: true,
      assistantResponse: true,
      diffStats: true,
      costUsd: true,
    },
  })

  const turnInputs: ShipBodyTurn[] = turns.map((t) => ({
    turnIndex: t.turnIndex,
    userMessage: t.userMessage,
    assistantResponse: t.assistantResponse,
  }))

  const diffStatArrays: ShipBodyFile[][] = turns.map((t) =>
    Array.isArray(t.diffStats)
      ? (t.diffStats as unknown[])
          .filter(
            (e): e is ShipBodyFile =>
              !!e &&
              typeof e === 'object' &&
              typeof (e as { path?: unknown }).path === 'string',
          )
          .map((e) => ({
            path: (e as ShipBodyFile).path,
            added: Number((e as ShipBodyFile).added) || 0,
            removed: Number((e as ShipBodyFile).removed) || 0,
          }))
      : [],
  )
  const files = aggregateDiffStats(diffStatArrays)

  const totalCostUsd = turns.reduce((sum, t) => {
    // costUsd is a Prisma Decimal — coerce via toString to keep precision.
    const n = Number(t.costUsd?.toString() ?? '0')
    return sum + (Number.isFinite(n) ? n : 0)
  }, 0)

  // Default type from classifier: bug-fix → fix, everything else → feat.
  const classifierType = (
    party.classification as { type?: string } | null
  )?.type
  const type: 'feat' | 'fix' = classifierType === 'bug-fix' ? 'fix' : 'feat'

  const title = stripIssueNumberPrefix(party.issueTitle)
  const body = buildPreviewBody(turnInputs, files, id)

  const payload: ShipPreviewResponse = {
    title,
    type,
    body,
    files,
    turnCount: turns.length,
    totalCostUsd,
  }
  return NextResponse.json(payload)
}
