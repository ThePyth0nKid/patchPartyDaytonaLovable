// Sandbox-lifecycle cron — runs every 2 min.
//
// Responsibilities:
//   - ACTIVE → IDLE_WARN when sandboxLastActivityAt older than IDLE_WARN_AFTER_MIN
//   - IDLE_WARN → PAUSED  when older than PAUSE_AFTER_MIN
//   - PAUSED  → TERMINATED when sandboxPausedAt older than TERMINATE_AFTER_DAYS
//
// Protected by CRON_SECRET.

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  IDLE_WARN_AFTER_MIN,
  PAUSE_AFTER_MIN,
  TERMINATE_AFTER_DAYS,
  pauseParty,
  terminateParty,
} from '@/lib/sandbox-lifecycle'
import { emitEvent, EventType } from '@/lib/events'
import { log } from '@/lib/log'

export const dynamic = 'force-dynamic'

async function authorize(req: NextRequest): Promise<boolean> {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const authHeader = req.headers.get('authorization') ?? ''
  if (authHeader === `Bearer ${secret}`) return true
  return req.headers.get('x-cron-secret') === secret
}

async function run(): Promise<{
  warned: number
  paused: number
  terminated: number
}> {
  const now = new Date()
  const warnCutoff = new Date(now.getTime() - IDLE_WARN_AFTER_MIN * 60_000)
  const pauseCutoff = new Date(now.getTime() - PAUSE_AFTER_MIN * 60_000)
  const terminateCutoff = new Date(
    now.getTime() - TERMINATE_AFTER_DAYS * 24 * 3_600_000,
  )

  // ACTIVE → IDLE_WARN
  const toWarn = await prisma.party.findMany({
    where: {
      sandboxState: 'ACTIVE',
      sandboxLastActivityAt: { lt: warnCutoff },
      chatSessionAgentId: { not: null },
    },
    select: { id: true },
    take: 200,
  })
  for (const { id } of toWarn) {
    try {
      await prisma.party.update({
        where: { id },
        data: { sandboxState: 'IDLE_WARN' },
      })
      void emitEvent(EventType.SANDBOX_PAUSED, {
        partyId: id,
        phase: 'idle_warn',
      })
    } catch (error: unknown) {
      log.warn('cron: idle_warn failed', { id, error: String(error) })
    }
  }

  // IDLE_WARN → PAUSED
  const toPause = await prisma.party.findMany({
    where: {
      sandboxState: 'IDLE_WARN',
      sandboxLastActivityAt: { lt: pauseCutoff },
    },
    select: { id: true },
    take: 50,
  })
  for (const { id } of toPause) {
    await pauseParty(id)
  }

  // PAUSED → TERMINATED
  const toTerm = await prisma.party.findMany({
    where: {
      sandboxState: 'PAUSED',
      sandboxPausedAt: { lt: terminateCutoff },
    },
    select: { id: true },
    take: 50,
  })
  for (const { id } of toTerm) {
    await terminateParty(id)
  }

  return {
    warned: toWarn.length,
    paused: toPause.length,
    terminated: toTerm.length,
  }
}

export async function GET(req: NextRequest) {
  if (!(await authorize(req))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const result = await run()
  return NextResponse.json({ ok: true, ...result })
}

export async function POST(req: NextRequest) {
  return GET(req)
}
