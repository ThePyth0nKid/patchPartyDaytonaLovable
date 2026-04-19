// Sandbox lifecycle — ACTIVE → IDLE_WARN → PAUSED → TERMINATED
//
// After a user picks a winning persona, that persona's sandbox enters this
// state machine. Losing personas' sandboxes are deleted immediately by the
// pick route; only the winner goes into the pause/resume loop.
//
// Thresholds (minutes):
//   ACTIVE    → IDLE_WARN when no activity > IDLE_WARN_AFTER_MIN
//   IDLE_WARN → PAUSED    when no activity > PAUSE_AFTER_MIN total
//   PAUSED    → TERMINATED when paused > TERMINATE_AFTER_DAYS
//
// Activity = any chat turn, command exec, or explicit heartbeat.

import { Daytona } from '@daytonaio/sdk'
import { prisma } from './prisma'
import { emitEvent, EventType } from './events'
import { log } from './log'

export const IDLE_WARN_AFTER_MIN = 10
export const PAUSE_AFTER_MIN = 15
export const TERMINATE_AFTER_DAYS = 7

// Lazy singleton: constructing Daytona at module load fails if
// DAYTONA_API_KEY is missing (e.g. `next build` page-data collection),
// which takes down every route that imports this module.
let _daytona: Daytona | null = null
function getDaytona(): Daytona {
  if (!_daytona) _daytona = new Daytona()
  return _daytona
}

export async function markActivity(partyId: string): Promise<void> {
  try {
    // Only promote ACTIVE/IDLE_WARN — never override RESUMING/PAUSED/TERMINATED,
    // otherwise the DB claims the sandbox is running while it's stopped.
    await prisma.party.updateMany({
      where: {
        id: partyId,
        sandboxState: { in: ['ACTIVE', 'IDLE_WARN'] },
      },
      data: {
        sandboxLastActivityAt: new Date(),
        sandboxState: 'ACTIVE',
      },
    })
  } catch (error: unknown) {
    log.error('markActivity failed', { partyId, error: String(error) })
  }
}

/**
 * Pause a party's winning-agent sandbox. Idempotent: checks current state,
 * transitions IDLE_WARN|ACTIVE → PAUSED. No-op if already PAUSED / TERMINATED.
 */
export async function pauseParty(partyId: string): Promise<void> {
  // Atomic claim: only one cron tick / caller wins the transition.
  // If markActivity races with us, the WHERE clause excludes ACTIVE on retry.
  const claimed = await prisma.party.updateMany({
    where: {
      id: partyId,
      sandboxState: { in: ['ACTIVE', 'IDLE_WARN'] },
    },
    data: { sandboxState: 'PAUSED', sandboxPausedAt: new Date() },
  })
  if (claimed.count === 0) return // someone else moved it, or already PAUSED

  const party = await prisma.party.findUnique({
    where: { id: partyId },
    include: { agents: true },
  })
  if (!party) return

  const agent =
    party.agents.find((a) => a.id === party.chatSessionAgentId) ??
    party.agents.find((a) => !!a.sandboxId)
  if (!agent?.sandboxId) {
    log.warn('pauseParty: no sandboxId, DB-only pause', { partyId })
    return
  }

  try {
    const sb = await getDaytona().get(agent.sandboxId)
    await sb.stop()
    void emitEvent(EventType.SANDBOX_PAUSED, {
      partyId,
      agentId: agent.id,
      sandboxId: agent.sandboxId,
    })
  } catch (error: unknown) {
    // sb.stop() failed but DB says PAUSED. Roll forward, not back: leave
    // the row PAUSED so cron won't re-attempt every minute. Daytona's own
    // idle-timeout will eventually reap a leaked sandbox; cost ceiling is
    // bounded. Surface the error for ops triage.
    log.error('pauseParty: sb.stop failed (sandbox may still run)', {
      partyId,
      sandboxId: agent.sandboxId,
      error: String(error),
    })
  }
}

export interface ResumeResult {
  ok: boolean
  method: 'resumed' | 'respawned' | 'failed'
  error?: string
}

/**
 * Resume a PAUSED party. Tries sandbox.resume() first (3-8s); on failure
 * the caller can fall back to full re-spawn via respawnParty().
 */
export async function resumeParty(partyId: string): Promise<ResumeResult> {
  const party = await prisma.party.findUnique({
    where: { id: partyId },
    include: { agents: true },
  })
  if (!party) return { ok: false, method: 'failed', error: 'party not found' }
  if (party.sandboxState === 'ACTIVE') {
    return { ok: true, method: 'resumed' }
  }
  if (party.sandboxState !== 'PAUSED' && party.sandboxState !== 'IDLE_WARN') {
    return {
      ok: false,
      method: 'failed',
      error: `cannot resume from ${party.sandboxState}`,
    }
  }

  const agent =
    party.agents.find((a) => a.id === party.chatSessionAgentId) ??
    party.agents.find((a) => !!a.sandboxId)
  if (!agent?.sandboxId) {
    return { ok: false, method: 'failed', error: 'no sandbox to resume' }
  }

  await prisma.party.update({
    where: { id: partyId },
    data: { sandboxState: 'RESUMING' },
  })

  try {
    const sb = await getDaytona().get(agent.sandboxId)
    await sb.start(40)
    await prisma.party.update({
      where: { id: partyId },
      data: {
        sandboxState: 'ACTIVE',
        sandboxLastActivityAt: new Date(),
        sandboxPausedAt: null,
      },
    })
    void emitEvent(EventType.SANDBOX_RESUMED, {
      partyId,
      agentId: agent.id,
      sandboxId: agent.sandboxId,
    })
    return { ok: true, method: 'resumed' }
  } catch (error: unknown) {
    log.warn('resumeParty: resume failed, rolling back to PAUSED', {
      partyId,
      error: String(error),
    })
    // Roll the state back so the user can retry and the cron can sweep.
    // RESUMING is invisible to every cron query; leaving it would orphan
    // the row and bill the sandbox indefinitely.
    await prisma.party
      .updateMany({
        where: { id: partyId, sandboxState: 'RESUMING' },
        data: { sandboxState: 'PAUSED' },
      })
      .catch(() => undefined)
    // Never forward raw SDK errors to the caller — Daytona errors can leak
    // internal hostnames, sandbox IDs, or token fragments. The full error
    // is already in the server log for ops triage.
    return {
      ok: false,
      method: 'failed',
      error: 'Sandbox could not be resumed. Try again in a moment.',
    }
  }
}

/**
 * Hard-terminate the sandboxes for all agents of a party. Used when:
 *   - loser personas after a pick
 *   - 7-day auto-reap
 *   - explicit user cancel
 */
export async function terminateParty(partyId: string): Promise<void> {
  const party = await prisma.party.findUnique({
    where: { id: partyId },
    include: { agents: true },
  })
  if (!party) return

  for (const agent of party.agents) {
    if (!agent.sandboxId) continue
    try {
      const sb = await getDaytona().get(agent.sandboxId)
      await getDaytona().delete(sb)
      // Only null the pointer when delete actually succeeded — otherwise
      // we orphan the sandbox in Daytona with no way to retry deletion.
      await prisma.agent
        .update({ where: { id: agent.id }, data: { sandboxId: null } })
        .catch(() => undefined)
    } catch (error: unknown) {
      log.warn('terminateParty: delete failed, leaving sandboxId for retry', {
        partyId,
        sandboxId: agent.sandboxId,
        error: String(error),
      })
    }
  }

  await prisma.party.update({
    where: { id: partyId },
    data: { sandboxState: 'TERMINATED' },
  })
  void emitEvent(EventType.SANDBOX_TERMINATED, { partyId })
}

/**
 * Terminate every *losing* agent's sandbox for a party after a pick. Keeps
 * the winning agent alive (that one enters the state machine).
 */
export async function terminateLosers(
  partyId: string,
  winnerAgentId: string,
): Promise<number> {
  const losers = await prisma.agent.findMany({
    where: {
      partyId,
      id: { not: winnerAgentId },
      sandboxId: { not: null },
    },
    select: { id: true, sandboxId: true },
  })
  let killed = 0
  for (const row of losers) {
    if (!row.sandboxId) continue
    try {
      const sb = await getDaytona().get(row.sandboxId)
      await getDaytona().delete(sb)
      killed++
      // Same as terminateParty: only clear the pointer on actual success.
      await prisma.agent
        .update({ where: { id: row.id }, data: { sandboxId: null } })
        .catch(() => undefined)
    } catch (error: unknown) {
      log.warn('terminateLosers: delete failed, leaving sandboxId for retry', {
        partyId,
        sandboxId: row.sandboxId,
        error: String(error),
      })
    }
  }
  return killed
}
