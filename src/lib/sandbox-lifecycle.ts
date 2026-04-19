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

import { Daytona, type Sandbox } from '@daytonaio/sdk'
import { prisma } from './prisma'
import { emitEvent, EventType } from './events'
import { log } from './log'
import { getGithubTokenForUser } from './github'
import { setupGitAskpass, tokenlessGitHubRemote } from './git-askpass'

export const IDLE_WARN_AFTER_MIN = 10
export const PAUSE_AFTER_MIN = 15
export const TERMINATE_AFTER_DAYS = 7

// Matches PREVIEW_LIFETIME_MINUTES in agent.ts — importing would drag
// anthropic + persona code into every caller of this module. Duplicated
// on purpose; if you change one, grep for the other.
const RESPAWN_AUTOSTOP_MINUTES = 15

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

export interface RespawnResult {
  ok: boolean
  method: 'respawned' | 'failed'
  error?: string
  previewUrl?: string
}

/**
 * Recreate the winning agent's sandbox from its GitHub feature branch.
 * Used when Daytona has permanently deleted a post-pick sandbox (e.g.
 * the party was idle past the auto-stop window and the proxy now 400s
 * the iframe with "Sandbox with ID … not found").
 *
 * Flow: clone the persona's branch into a fresh Daytona sandbox, run
 * `npm install`, start `npm run dev` detached, fetch the preview link
 * via SDK, write the new `sandboxId`/`previewUrl`/`previewToken` back
 * onto the Agent row, and flip the party's `sandboxState` to ACTIVE.
 *
 * Preconditions:
 *   - Party has a `chatSessionAgentId` (post-pick only; pre-pick
 *     candidates are intentionally not respawnable — user should start
 *     a new party).
 *   - Winning agent has a `branchName` pushed to GitHub.
 *   - The user still has a valid GitHub OAuth token in Account.
 *
 * Concurrency: takes a RESUMING claim on the Party row. Two parallel
 * respawn attempts → second one short-circuits with "already resuming".
 */
export async function respawnParty(partyId: string): Promise<RespawnResult> {
  const party = await prisma.party.findUnique({
    where: { id: partyId },
    include: { agents: true },
  })
  if (!party) {
    return { ok: false, method: 'failed', error: 'party not found' }
  }
  if (!party.chatSessionAgentId) {
    return {
      ok: false,
      method: 'failed',
      error:
        'This party has not been picked yet — respawn only works after you pick a persona.',
    }
  }
  const winner = party.agents.find((a) => a.id === party.chatSessionAgentId)
  if (!winner) {
    return { ok: false, method: 'failed', error: 'winner agent missing' }
  }
  if (!winner.branchName) {
    return {
      ok: false,
      method: 'failed',
      error: 'No branch recorded for the winning agent — cannot respawn.',
    }
  }

  const identity = await getGithubTokenForUser(party.userId)
  if (!identity) {
    return {
      ok: false,
      method: 'failed',
      error: 'Your GitHub token is no longer available. Sign in again.',
    }
  }

  // Optimistic claim: only transition from TERMINATED / PAUSED / IDLE_WARN
  // into RESUMING. Blocks double-clicks and cron-vs-user races.
  const claimed = await prisma.party.updateMany({
    where: {
      id: partyId,
      sandboxState: { in: ['TERMINATED', 'PAUSED', 'IDLE_WARN'] },
    },
    data: { sandboxState: 'RESUMING' },
  })
  if (claimed.count === 0) {
    return {
      ok: false,
      method: 'failed',
      error:
        'Sandbox is already active or being resumed. Refresh the page in a few seconds.',
    }
  }

  let sandbox: Sandbox | undefined
  try {
    sandbox = await getDaytona().create({
      language: 'typescript',
      public: true,
      autoStopInterval: RESPAWN_AUTOSTOP_MINUTES,
    })

    // Clone via GIT_ASKPASS so the token never lands in argv — Daytona
    // captures command argv in its own logs. Private repos need auth;
    // public repos tolerate it with no extra cost.
    const askpass = await setupGitAskpass(sandbox, identity.token)
    try {
      const remote = tokenlessGitHubRemote(party.repoOwner, party.repoName)
      await sandbox.process.executeCommand(
        `cd /home/daytona && ${askpass.envPrefix} git -c credential.helper= clone --depth 50 --single-branch --branch ${winner.branchName} "${remote}" repo`,
      )
    } finally {
      await askpass.cleanup()
    }

    await sandbox.process.executeCommand(
      'cd /home/daytona/repo && npm install --no-audit --no-fund --prefer-offline',
      undefined,
      undefined,
      300_000,
    )
    await sandbox.process.executeCommand(
      'cd /home/daytona/repo && nohup npm run dev > /tmp/dev.log 2>&1 &',
    )
    // Same 4 s binding wait as the initial boot in agent.ts. getPreviewLink
    // succeeds as long as the port is registered with Daytona — the app
    // doesn't need to be fully listening yet; Vite/Next bind fast.
    await new Promise((resolve) => setTimeout(resolve, 4000))

    const preview = await sandbox.getPreviewLink(3000)

    await prisma.agent.update({
      where: { id: winner.id },
      data: {
        sandboxId: sandbox.id,
        previewUrl: preview.url,
        previewToken: preview.token,
        sandboxTerminatedAt: null,
      },
    })
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
      agentId: winner.id,
      sandboxId: sandbox.id,
    })

    return { ok: true, method: 'respawned', previewUrl: preview.url }
  } catch (error: unknown) {
    // Half-built sandbox → best-effort delete so we don't leak cost.
    if (sandbox) {
      try {
        await getDaytona().delete(sandbox)
      } catch (cleanupErr) {
        log.warn('respawnParty: cleanup delete failed', {
          partyId,
          error: String(cleanupErr),
        })
      }
    }
    // Revert RESUMING → TERMINATED so the user can retry. Don't go back
    // to PAUSED; the original sandbox is gone and a resume would fail.
    await prisma.party
      .updateMany({
        where: { id: partyId, sandboxState: 'RESUMING' },
        data: { sandboxState: 'TERMINATED' },
      })
      .catch(() => undefined)

    log.warn('respawnParty: boot failed', {
      partyId,
      branchName: winner.branchName,
      error: String(error),
    })
    // Never forward raw SDK errors — they can leak internal hostnames
    // or token fragments. Full error is in the server log.
    return {
      ok: false,
      method: 'failed',
      error:
        'Could not recreate sandbox. The branch is still on GitHub — try again in a moment.',
    }
  }
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
      // Also clear previewUrl/previewToken so a subsequent page load
      // doesn't try to iframe a dead Daytona host (shows friendly
      // "preview expired" copy instead of the raw 400 JSON).
      await prisma.agent
        .update({
          where: { id: agent.id },
          data: {
            sandboxId: null,
            previewUrl: null,
            previewToken: null,
            sandboxTerminatedAt: new Date(),
          },
        })
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
 *
 * Parallelized via `Promise.allSettled` so a slow/failing Daytona delete for
 * one loser never blocks the others (serial teardown in v2 measured ~8 s per
 * loser; two losers serial = 16 s of user-visible limbo). On success we set
 * `Agent.sandboxTerminatedAt` — that timestamp doubles as the cron sweep's
 * "already handled" marker so retries don't double-delete.
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
      sandboxTerminatedAt: null,
    },
    select: { id: true, sandboxId: true },
  })

  const outcomes = await Promise.allSettled(
    losers.map(async (row) => {
      if (!row.sandboxId) return false
      const sb = await getDaytona().get(row.sandboxId)
      await getDaytona().delete(sb)
      // Clear sandboxId + stamp termination time in a single update so the
      // cron reconciliation sweep (which keys off `sandboxTerminatedAt IS
      // NULL`) correctly sees the row as handled. Also null the preview
      // fields so the candidate drawer shows "expired" copy instead of
      // iframing a dead Daytona host and surfacing raw 400 JSON.
      await prisma.agent
        .update({
          where: { id: row.id },
          data: {
            sandboxId: null,
            sandboxTerminatedAt: new Date(),
            previewUrl: null,
            previewToken: null,
          },
        })
        .catch(() => undefined)
      return true
    }),
  )

  let killed = 0
  outcomes.forEach((outcome, idx) => {
    if (outcome.status === 'fulfilled' && outcome.value) {
      killed++
    } else if (outcome.status === 'rejected') {
      log.warn('terminateLosers: delete failed, leaving sandboxId for retry', {
        partyId,
        sandboxId: losers[idx]?.sandboxId,
        error: String(outcome.reason),
      })
    }
  })
  return killed
}

/**
 * Reconciliation sweep for pick-teardown: retries termination of loser
 * sandboxes whose initial `terminateLosers` call failed (Daytona flake,
 * transient network error, etc). A loser is a row where the parent party
 * has a `chatSessionAgentId`, the agent is *not* that winner, it still has
 * `sandboxId` set, `sandboxTerminatedAt IS NULL`, and the pick happened
 * more than `staleAfterMs` ago. Returns the number of sandboxes reclaimed.
 */
export async function reconcileStuckLosers(
  staleAfterMs = 5 * 60_000,
): Promise<number> {
  const cutoff = new Date(Date.now() - staleAfterMs)
  // Prisma has no relational filter on Agent.party.pickedAt, so pull the
  // candidate parties first, then fan out. `take: 50` bounds per-tick cost.
  const parties = await prisma.party.findMany({
    where: {
      chatSessionAgentId: { not: null },
      updatedAt: { lt: cutoff },
      agents: {
        some: {
          sandboxId: { not: null },
          sandboxTerminatedAt: null,
        },
      },
    },
    select: { id: true, chatSessionAgentId: true },
    take: 50,
  })

  let reclaimed = 0
  for (const p of parties) {
    if (!p.chatSessionAgentId) continue
    try {
      reclaimed += await terminateLosers(p.id, p.chatSessionAgentId)
    } catch (error: unknown) {
      log.warn('reconcileStuckLosers: terminateLosers threw', {
        partyId: p.id,
        error: String(error),
      })
    }
  }
  return reclaimed
}
