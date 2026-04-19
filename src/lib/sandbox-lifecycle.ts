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

const daytona = new Daytona()

export async function markActivity(partyId: string): Promise<void> {
  try {
    await prisma.party.update({
      where: { id: partyId },
      data: {
        sandboxLastActivityAt: new Date(),
        // If we were in IDLE_WARN, bump back to ACTIVE.
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
  const party = await prisma.party.findUnique({
    where: { id: partyId },
    include: { agents: true },
  })
  if (!party) return
  if (party.sandboxState !== 'ACTIVE' && party.sandboxState !== 'IDLE_WARN') {
    return
  }

  const agent =
    party.agents.find((a) => a.id === party.chatSessionAgentId) ??
    party.agents.find((a) => !!a.sandboxId)
  if (!agent?.sandboxId) {
    log.warn('pauseParty: no sandboxId, marking PAUSED anyway', { partyId })
    await prisma.party.update({
      where: { id: partyId },
      data: { sandboxState: 'PAUSED', sandboxPausedAt: new Date() },
    })
    return
  }

  try {
    const sb = await daytona.get(agent.sandboxId)
    await sb.stop()
    await prisma.party.update({
      where: { id: partyId },
      data: { sandboxState: 'PAUSED', sandboxPausedAt: new Date() },
    })
    void emitEvent(EventType.SANDBOX_PAUSED, {
      partyId,
      agentId: agent.id,
      sandboxId: agent.sandboxId,
    })
  } catch (error: unknown) {
    log.error('pauseParty failed', { partyId, error: String(error) })
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
    const sb = await daytona.get(agent.sandboxId)
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
    log.warn('resumeParty: resume failed, caller should respawn', {
      partyId,
      error: String(error),
    })
    // Leave state as RESUMING so UI can show the respawn path and caller
    // can invoke respawnParty() without racing.
    return {
      ok: false,
      method: 'failed',
      error: String(error),
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
      const sb = await daytona.get(agent.sandboxId)
      await daytona.delete(sb)
    } catch (error: unknown) {
      log.warn('terminateParty: delete failed (likely gone)', {
        partyId,
        sandboxId: agent.sandboxId,
        error: String(error),
      })
    }
    await prisma.agent
      .update({ where: { id: agent.id }, data: { sandboxId: null } })
      .catch(() => undefined)
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
      const sb = await daytona.get(row.sandboxId)
      await daytona.delete(sb)
      killed++
    } catch (error: unknown) {
      log.warn('terminateLosers: delete failed', {
        partyId,
        sandboxId: row.sandboxId,
        error: String(error),
      })
    }
    await prisma.agent
      .update({ where: { id: row.id }, data: { sandboxId: null } })
      .catch(() => undefined)
  }
  return killed
}
