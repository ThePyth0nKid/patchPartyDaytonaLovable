// GET /api/party/[id]/state — lightweight state poll for the chat pane.
//
// The SSE stream closes once all personas finish classification/plan/edit.
// After pick, the client needs a way to observe sandboxState transitions
// (ACTIVE → IDLE_WARN → PAUSED → RESUMING). A tiny JSON endpoint that the
// party page polls every ~10s is simpler than re-architecting the stream.

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
    select: {
      userId: true,
      chatSessionAgentId: true,
      pickedPersona: true,
      sandboxState: true,
      sandboxPausedAt: true,
      sandboxLastActivityAt: true,
    },
  })
  if (!party) {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }
  if (party.userId !== session.user.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  return NextResponse.json({
    chatSessionAgentId: party.chatSessionAgentId,
    pickedPersona: party.pickedPersona,
    sandboxState: party.sandboxState,
    sandboxPausedAt: party.sandboxPausedAt,
    sandboxLastActivityAt: party.sandboxLastActivityAt,
  })
}
