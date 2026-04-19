// POST /api/party/[id]/pick — user picks a winning persona.
//
// Responsibilities:
//   - Validate session + ownership.
//   - Insert PickDecision row (one per party).
//   - Mark Party.chatSessionAgentId + start the sandbox lifecycle for the
//     winner. Loser sandboxes are terminated asynchronously.
//
// Returns immediately after DB update; termination runs in the background
// so the user doesn't wait on Daytona round-trips.

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { terminateLosers } from '@/lib/sandbox-lifecycle'
import { emitEvent, EventType } from '@/lib/events'
import { log } from '@/lib/log'

const Schema = z
  .object({
    agentId: z.string().min(1).optional(),
    personaId: z.string().min(1).optional(),
    reason: z.string().max(500).optional(),
  })
  .refine((v) => v.agentId || v.personaId, {
    message: 'agentId or personaId required',
  })

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const { id } = await ctx.params

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }
  const parsed = Schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 })
  }

  const party = await prisma.party.findUnique({
    where: { id },
    include: { agents: { select: { id: true, personaId: true, status: true } } },
  })
  if (!party) return NextResponse.json({ error: 'not found' }, { status: 404 })
  if (party.userId !== session.user.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  if (party.chatSessionAgentId) {
    return NextResponse.json(
      { error: 'Pick already recorded for this party.' },
      { status: 409 },
    )
  }

  const winner = party.agents.find((a) =>
    parsed.data.agentId
      ? a.id === parsed.data.agentId
      : a.personaId === parsed.data.personaId,
  )
  if (!winner) {
    return NextResponse.json({ error: 'agent not on this party' }, { status: 400 })
  }
  if (winner.status !== 'done') {
    return NextResponse.json(
      { error: `agent not done (status=${winner.status})` },
      { status: 400 },
    )
  }

  const comparedAgents = party.agents.map((a) => a.id)

  try {
    await prisma.$transaction([
      prisma.pickDecision.create({
        data: {
          partyId: id,
          pickedAgentId: winner.id,
          reasonText: parsed.data.reason ?? null,
          comparedAgents,
        },
      }),
      prisma.party.update({
        where: { id },
        data: {
          chatSessionAgentId: winner.id,
          pickedPersona: winner.personaId,
          sandboxState: 'ACTIVE',
          sandboxLastActivityAt: new Date(),
        },
      }),
    ])
  } catch (error: unknown) {
    log.error('pick: db write failed', { partyId: id, error: String(error) })
    return NextResponse.json({ error: 'db write failed' }, { status: 500 })
  }

  void emitEvent(EventType.PERSONA_PICKED, {
    partyId: id,
    agentId: winner.id,
    personaId: winner.personaId,
  })

  // Fire-and-forget termination of losing sandboxes.
  void terminateLosers(id, winner.id).catch((error: unknown) =>
    log.warn('pick: terminateLosers failed', {
      partyId: id,
      error: String(error),
    }),
  )

  return NextResponse.json({
    ok: true,
    pickedAgentId: winner.id,
    personaId: winner.personaId,
  })
}
