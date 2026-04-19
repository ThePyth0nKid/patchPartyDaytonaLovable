// POST /api/party/[id]/chat/undo — undo the latest applied non-reverted turn.
//
// Body: { turnIndex: number }  (client must pass the turn it's undoing; the
// server cross-checks that it IS the latest applied non-reverted turn in
// this party to prevent out-of-order undo).
//
// Semantics (closes S10 in 05-security-checklist.md — soft-delete with audit
// trail):
//
//   1. Guard rails — auth, ownership, CSRF, sandbox-state, 20-turn cap.
//   2. Reserve a synthetic follow-up turn (pending) under the same partyId
//      advisory lock that /chat uses. This keeps `turnIndex` allocation
//      race-free vs. any concurrent `/chat` POST.
//   3. `git revert --no-edit <sha>` inside the sandbox, then push to the
//      party's branch. We do NOT force-push — the revert is a new commit
//      on top, preserving the audit trail on GitHub too.
//   4. On success: mark the original turn `status='undone'` with
//      `revertedByTurnIndex` set to the synthetic turn's index; mark the
//      synthetic turn `status='applied'` with the revert commit's SHA.
//      Both writes land in one Prisma transaction.
//   5. On sandbox failure: mark the synthetic turn `status='failed'` and
//      return an error. The original turn stays applied (no half-state).
//
// buildMessageHistory in src/lib/chat.ts already filters `status='applied'`,
// so undone turns + the synthetic undo turn are BOTH excluded from the next
// Anthropic call's context — exactly what the plan calls for.

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { Daytona } from '@daytonaio/sdk'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { requireCsrfHeader } from '@/lib/csrf'
import { getFallbackOctokit, getOctokitFor } from '@/lib/github'
import { setupGitAskpass, tokenlessGitHubRemote } from '@/lib/git-askpass'
import { checkChatRateLimit } from '@/lib/rate-limit'
import { log } from '@/lib/log'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const REPO_DIR = '/home/daytona/repo'

const Schema = z.object({
  turnIndex: z.number().int().nonnegative(),
})

interface UndoResponse {
  undoneTurnIndex: number
  revertTurnIndex: number
  revertSha: string
}

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

  // Share the /chat sliding window (4/60s per user): /undo also triggers
  // a sandbox round-trip plus a GitHub push, and a user who is rate-
  // limited on /chat shouldn't be able to hammer /undo as an escape
  // hatch. Operationally: 4 chat-iterate actions — any mix of sends and
  // undos — per 60s per user.
  const rl = await checkChatRateLimit(session.user.id)
  if (!rl.allowed) {
    return NextResponse.json(
      {
        error: `Too many requests. Try again in ${rl.retryAfterSeconds}s.`,
        retryAfterSeconds: rl.retryAfterSeconds,
      },
      {
        status: 429,
        headers: { 'Retry-After': String(rl.retryAfterSeconds) },
      },
    )
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
  const requestedTurnIndex = parsed.data.turnIndex

  const party = await prisma.party.findUnique({
    where: { id },
    select: {
      userId: true,
      repoOwner: true,
      repoName: true,
      chatSessionAgentId: true,
      sandboxState: true,
    },
  })
  if (!party) return NextResponse.json({ error: 'not found' }, { status: 404 })
  if (party.userId !== session.user.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  if (!party.chatSessionAgentId) {
    return NextResponse.json(
      { error: 'no chat session for this party' },
      { status: 400 },
    )
  }
  if (
    party.sandboxState !== 'ACTIVE' &&
    party.sandboxState !== 'IDLE_WARN'
  ) {
    return NextResponse.json(
      { error: 'Sandbox is not active. Resume it first.' },
      { status: 409 },
    )
  }

  const agent = await prisma.agent.findUnique({
    where: { id: party.chatSessionAgentId },
    select: { sandboxId: true, branchName: true },
  })
  if (!agent?.sandboxId || !agent.branchName) {
    return NextResponse.json(
      { error: 'sandbox missing' },
      { status: 409 },
    )
  }

  const gh = await getOctokitFor(session.user.id)
  const userToken =
    gh?.token ?? (getFallbackOctokit() ? process.env.GITHUB_TOKEN : undefined)
  if (!userToken) {
    return NextResponse.json(
      { error: 'GitHub token unavailable. Re-link your account.' },
      { status: 403 },
    )
  }

  // Reserve the synthetic revert turn atomically. Advisory lock serialises
  // us vs. /chat. We verify inside the lock that the requested turnIndex IS
  // the latest applied non-reverted turn (prevents out-of-order undo) and
  // that adding one more turn stays under the cap.
  let reservation:
    | { ok: true; revertTurnIndex: number; revertTurnId: string; targetSha: string }
    | { ok: false; status: number; error: string }
  try {
    reservation = await prisma.$transaction(async (tx) => {
      const lockRow = await tx.$queryRaw<{ ok: boolean }[]>`
        SELECT pg_try_advisory_xact_lock(
          hashtext(${id}),
          ${id.length}
        ) AS ok
      `
      if (!lockRow[0]?.ok) {
        return {
          ok: false,
          status: 409,
          error: 'Another turn is in progress. Wait a moment.',
        } as const
      }

      // Find the latest applied, non-reverted turn with a commitSha.
      const latest = await tx.chatTurn.findFirst({
        where: {
          partyId: id,
          status: 'applied',
          revertedByTurnIndex: null,
          commitSha: { not: null },
        },
        orderBy: { turnIndex: 'desc' },
        select: { turnIndex: true, commitSha: true },
      })
      if (!latest || !latest.commitSha) {
        return {
          ok: false,
          status: 404,
          error: 'nothing to undo',
        } as const
      }
      if (latest.turnIndex !== requestedTurnIndex) {
        return {
          ok: false,
          status: 409,
          error: 'Only the most recent applied turn can be undone.',
        } as const
      }

      // T4.1: the T3.4 `> MAX_TURNS_PER_PARTY` hack is gone. Undo no longer
      // counts against the cap at all — once the revert commits, the original
      // turn becomes 'undone' (not chargeable) and the synthetic becomes a
      // revert target (also not chargeable), so the post-commit delta is
      // strictly negative. We keep a paranoia guard that the row count isn't
      // already past the unique-index ceiling the DB can represent, then use
      // the total row count for the next turnIndex. /chat is the only caller
      // that enforces the chargeable cap.
      const existingTurns = await tx.chatTurn.count({ where: { partyId: id } })

      const row = await tx.chatTurn.create({
        data: {
          partyId: id,
          turnIndex: existingTurns,
          userMessage: `↩ Undo turn ${latest.turnIndex + 1}`,
          diffApplied: [],
          status: 'pending',
        },
        select: { id: true, turnIndex: true },
      })
      return {
        ok: true,
        revertTurnIndex: row.turnIndex,
        revertTurnId: row.id,
        targetSha: latest.commitSha,
      } as const
    })
  } catch (error: unknown) {
    log.error('chat.undo reservation failed', {
      partyId: id,
      error: String(error),
    })
    return NextResponse.json({ error: 'internal error' }, { status: 500 })
  }
  if (!reservation.ok) {
    return NextResponse.json(
      { error: reservation.error },
      { status: reservation.status },
    )
  }

  // Execute the revert inside the sandbox. We guard the SHA with a strict
  // hex regex even though it came from our own DB — defense in depth against
  // any future write path that might relax validation upstream.
  if (!/^[a-f0-9]{7,64}$/.test(reservation.targetSha)) {
    await markSyntheticFailed(reservation.revertTurnId, 'invalid target sha')
    return NextResponse.json({ error: 'invalid target sha' }, { status: 500 })
  }

  // Branch name guard — defense in depth. agent.branchName is server-
  // generated today (patchparty/{persona}/{partyId8}) so this regex should
  // always pass, but if a future change ever lets the name flow from user
  // input or an issue title, the guard prevents shell metacharacters from
  // reaching the `git push` command line.
  if (!/^[a-zA-Z0-9._/-]+$/.test(agent.branchName)) {
    await markSyntheticFailed(reservation.revertTurnId, 'invalid branch name')
    return NextResponse.json({ error: 'invalid branch name' }, { status: 500 })
  }

  let revertSha: string
  let publicErrMsg = 'Revert failed — see server logs.'
  try {
    revertSha = await revertInSandbox(
      agent.sandboxId,
      agent.branchName,
      reservation.targetSha,
      userToken,
      { repoOwner: party.repoOwner, repoName: party.repoName },
    )
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error)
    log.error('chat.undo sandbox revert failed', {
      partyId: id,
      targetSha: reservation.targetSha,
      error: errMsg,
    })
    // Only forward known-safe messages to the client. revertInSandbox raises
    // UserSafeError for the one message we've vetted (conflict). Anything
    // else could embed raw git stdout/stderr (filesystem paths, file lines,
    // conflict markers) so we collapse it to a generic string.
    if (error instanceof UserSafeError) {
      publicErrMsg = error.message
    }
    await markSyntheticFailed(reservation.revertTurnId, errMsg)
    return NextResponse.json(
      { error: publicErrMsg },
      { status: 502 },
    )
  }

  // Finalise both rows in one transaction.
  try {
    await prisma.$transaction([
      prisma.chatTurn.updateMany({
        where: {
          partyId: id,
          turnIndex: requestedTurnIndex,
          status: 'applied',
          revertedByTurnIndex: null,
        },
        data: {
          status: 'undone',
          revertedByTurnIndex: reservation.revertTurnIndex,
        },
      }),
      prisma.chatTurn.update({
        where: { id: reservation.revertTurnId },
        data: {
          status: 'applied',
          commitSha: revertSha,
          assistantResponse: `Reverted commit ${reservation.targetSha.slice(0, 7)}.`,
        },
      }),
    ])
  } catch (error: unknown) {
    // Split-tx pitfall: the revert commit is already on GitHub (we pushed
    // before entering this block) but the DB finalise failed. If we leave
    // the original turn as 'applied', reload surfaces the Undo button
    // again and a second undo would revert-the-revert. Tombstone the
    // synthetic row so it doesn't leave a stuck 'pending' either.
    log.error('chat.undo finalise failed', {
      partyId: id,
      revertSha,
      error: String(error),
    })
    await markSyntheticFailed(
      reservation.revertTurnId,
      'finalise tx failed after push',
    )
    // Best-effort: also mark the original 'undone' so reload doesn't offer
    // Undo a second time and trigger revert-the-revert. This write is
    // independent from the synthetic row so Prisma shouldn't retry-storm
    // on the same failure mode.
    try {
      await prisma.chatTurn.updateMany({
        where: {
          partyId: id,
          turnIndex: requestedTurnIndex,
          status: 'applied',
          revertedByTurnIndex: null,
        },
        data: {
          status: 'undone',
          revertedByTurnIndex: reservation.revertTurnIndex,
        },
      })
    } catch (fallbackError: unknown) {
      log.error('chat.undo best-effort tombstone failed', {
        partyId: id,
        turnIndex: requestedTurnIndex,
        error: String(fallbackError),
      })
    }
    return NextResponse.json(
      {
        error:
          'Revert committed on branch but DB update failed — reload the page.',
      },
      { status: 500 },
    )
  }

  return NextResponse.json({
    undoneTurnIndex: requestedTurnIndex,
    revertTurnIndex: reservation.revertTurnIndex,
    revertSha,
  } satisfies UndoResponse)
}

async function markSyntheticFailed(
  turnId: string,
  error: string,
): Promise<void> {
  try {
    await prisma.chatTurn.update({
      where: { id: turnId },
      data: { status: 'failed', error: error.slice(0, 500) },
    })
  } catch (updateError: unknown) {
    if (
      updateError instanceof Prisma.PrismaClientKnownRequestError &&
      updateError.code === 'P2025'
    ) {
      // Already gone — fine.
      return
    }
    log.error('chat.undo markSyntheticFailed failed', {
      turnId,
      error: String(updateError),
    })
  }
}

// Thrown by revertInSandbox when the error message is safe to forward to
// the end user. Anything else is collapsed to a generic string by the
// caller so raw git stderr — which can include filesystem paths, file
// content, or conflict markers — never reaches the client body.
class UserSafeError extends Error {}

async function revertInSandbox(
  sandboxId: string,
  branch: string,
  targetSha: string,
  userToken: string,
  party: { repoOwner: string; repoName: string },
): Promise<string> {
  const sandbox = await new Daytona().get(sandboxId)

  // `git revert --no-edit` creates a new commit that inverts targetSha.
  // We deliberately do NOT pass `-m 1` — it is harmless on straight-line
  // commits in Git ≥ 2.25 but was an error ("Mainline was specified but
  // commit is not a merge") on older versions. All chat-turn commits are
  // straight-line, so `-m` is unnecessary either way.
  const revertExec = await sandbox.process.executeCommand(
    `cd ${REPO_DIR} && git -c user.email=chat@patchparty.dev -c user.name="PatchParty Chat" revert --no-edit ${targetSha}`,
  )
  const revertOut = revertExec.result ?? ''
  if (revertExec.exitCode !== undefined && revertExec.exitCode !== 0) {
    // The classic failure is a conflict when a later turn touched the same
    // lines. We abort the revert so the sandbox is left in a clean state.
    await sandbox.process
      .executeCommand(`cd ${REPO_DIR} && git revert --abort || true`)
      .catch(() => {
        /* best-effort cleanup */
      })
    if (revertOut.toLowerCase().includes('conflict')) {
      throw new UserSafeError(
        'Revert conflicts with a later change — resolve or restart the party.',
      )
    }
    // Keep full stdout/stderr in logs only — see UserSafeError docstring.
    throw new Error(`git revert failed: ${revertOut.slice(0, 200)}`)
  }

  // Push the new revert commit. Never force — revert is additive.
  // branch is regex-guarded by the caller; double-quoting belt+braces.
  const askpass = await setupGitAskpass(sandbox, userToken)
  try {
    const remote = tokenlessGitHubRemote(party.repoOwner, party.repoName)
    await sandbox.process.executeCommand(
      `cd ${REPO_DIR} && ${askpass.envPrefix} git -c credential.helper= push "${remote}" HEAD:"${branch}"`,
    )
  } finally {
    await askpass.cleanup()
  }

  const shaExec = await sandbox.process.executeCommand(
    `cd ${REPO_DIR} && git rev-parse HEAD`,
  )
  const sha = shaExec.result?.trim()
  if (!sha || !/^[a-f0-9]{7,64}$/.test(sha)) {
    throw new Error('could not read revert sha')
  }
  return sha
}
