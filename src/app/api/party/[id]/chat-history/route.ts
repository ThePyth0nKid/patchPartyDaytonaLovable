// GET /api/party/[id]/chat-history — list applied chat turns for the UI.
//
// Used by the chat pane on mount to hydrate earlier turns (after refresh or
// reconnect). Errors and failed turns are excluded by default so the history
// always shows the committed assistant responses.

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

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
    select: { userId: true },
  })
  if (!party) return NextResponse.json({ error: 'not found' }, { status: 404 })
  if (party.userId !== session.user.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const turns = await prisma.chatTurn.findMany({
    where: { partyId: id, status: { in: ['applied', 'failed', 'undone'] } },
    orderBy: { turnIndex: 'asc' },
    select: {
      turnIndex: true,
      userMessage: true,
      assistantResponse: true,
      diffApplied: true,
      diffStats: true,
      commitSha: true,
      revertedByTurnIndex: true,
      costUsd: true,
      latencyMs: true,
      status: true,
      error: true,
      createdAt: true,
    },
  })

  return NextResponse.json({ turns })
}
