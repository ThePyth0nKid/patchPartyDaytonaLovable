// GET /api/party/[id]/turns/[turnIndex]/diff?path=<encoded>
//
// Returns a unified diff for a single file changed in a chat turn. Used by
// the DiffDrawer (T3.2). Two-tier strategy:
//
//   1. Primary: if the sandbox is ACTIVE we run `git show <sha> -- <path>`
//      inside the Daytona sandbox. Gives us byte-exact reproduction of
//      what the agent committed.
//   2. Fallback: if the sandbox is paused/terminated/unreachable we hit the
//      GitHub commits API. The commit was pushed at `commitTurn` time, so
//      the SHA is authoritative there too.
//
// `path` is validated via `checkSandboxPath` — a user (or Claude) must not
// be able to read `.env` or escape the repo root by crafting a weird
// turnIndex + path tuple.

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { Daytona } from '@daytonaio/sdk'
import { checkSandboxPath } from '@/lib/safe-path'
import { getOctokitFor, getFallbackOctokit } from '@/lib/github'
import { log } from '@/lib/log'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const REPO_DIR = '/home/daytona/repo'

interface DiffResponse {
  sha: string
  path: string
  unifiedDiff: string
  source: 'sandbox' | 'github'
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; turnIndex: string }> },
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const { id, turnIndex } = await ctx.params
  const turnIdxNum = Number.parseInt(turnIndex, 10)
  if (!Number.isFinite(turnIdxNum) || turnIdxNum < 0) {
    return NextResponse.json({ error: 'invalid turnIndex' }, { status: 400 })
  }

  const rawPath = req.nextUrl.searchParams.get('path') ?? ''
  const pathCheck = checkSandboxPath(REPO_DIR, rawPath)
  if (!pathCheck.ok) {
    return NextResponse.json(
      { error: `path rejected (${pathCheck.reason})` },
      { status: 400 },
    )
  }

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

  const turn = await prisma.chatTurn.findUnique({
    where: { partyId_turnIndex: { partyId: id, turnIndex: turnIdxNum } },
    select: { commitSha: true, status: true, diffStats: true },
  })
  if (!turn || !turn.commitSha) {
    return NextResponse.json(
      { error: 'turn has no commit' },
      { status: 404 },
    )
  }

  // Resolve the relative path against the diffStats the turn recorded.
  // This prevents reading a file that *happens* to exist at that path but
  // was not touched by the turn (defence in depth on top of checkSandboxPath).
  const touchedPaths = asPathArray(turn.diffStats)
  if (touchedPaths.length > 0 && !touchedPaths.includes(rawPath)) {
    return NextResponse.json(
      { error: 'path not in turn diff' },
      { status: 404 },
    )
  }

  const sha = turn.commitSha
  const canUseSandbox =
    party.sandboxState === 'ACTIVE' ||
    party.sandboxState === 'IDLE_WARN'

  if (canUseSandbox && party.chatSessionAgentId) {
    const fromSandbox = await tryDiffFromSandbox(
      party.chatSessionAgentId,
      sha,
      rawPath,
    )
    if (fromSandbox !== null) {
      return NextResponse.json({
        sha,
        path: rawPath,
        unifiedDiff: fromSandbox,
        source: 'sandbox',
      } satisfies DiffResponse)
    }
  }

  // Fallback: GitHub REST commits API.
  const gh = await getOctokitFor(session.user.id)
  const octokit = gh?.octokit ?? getFallbackOctokit()
  if (!octokit) {
    return NextResponse.json(
      { error: 'sandbox paused and GitHub not linked' },
      { status: 502 },
    )
  }
  try {
    const { data } = await octokit.repos.getCommit({
      owner: party.repoOwner,
      repo: party.repoName,
      ref: sha,
    })
    const file = data.files?.find((f) => f.filename === rawPath)
    if (!file) {
      return NextResponse.json(
        { error: 'file not in commit' },
        { status: 404 },
      )
    }
    // The `patch` field may be absent for very large diffs (>1MB).
    const patch = typeof file.patch === 'string' ? file.patch : ''
    return NextResponse.json({
      sha,
      path: rawPath,
      unifiedDiff: patch,
      source: 'github',
    } satisfies DiffResponse)
  } catch (error: unknown) {
    log.warn('diff github fallback failed', {
      partyId: id,
      turnIndex: turnIdxNum,
      error: String(error),
    })
    return NextResponse.json(
      { error: 'could not load diff' },
      { status: 502 },
    )
  }
}

async function tryDiffFromSandbox(
  chatSessionAgentId: string,
  sha: string,
  relPath: string,
): Promise<string | null> {
  const agent = await prisma.agent.findUnique({
    where: { id: chatSessionAgentId },
    select: { sandboxId: true },
  })
  if (!agent?.sandboxId) return null

  // git show <sha> -- <path> prints a clean `diff --git` header followed by
  // the unified diff. Pipe through base64 on the client side would be nice
  // but executeCommand already returns a plain string.
  //
  // Arguments are well-formed (hex SHA + path that we validated above), so
  // string-interpolation into the shell command is safe here — the real
  // adversarial surface is `path`, which checkSandboxPath already rejected
  // anything suspicious.
  if (!/^[a-f0-9]{7,64}$/.test(sha)) return null
  if (/[`"$\\\n]/.test(relPath)) return null

  try {
    const sandbox = await new Daytona().get(agent.sandboxId)
    const exec = await sandbox.process.executeCommand(
      `cd ${REPO_DIR} && git show ${sha} -- "${relPath}"`,
    )
    const out = exec.result ?? ''
    return out.length > 0 ? out : null
  } catch (error: unknown) {
    log.warn('diff sandbox fetch failed', {
      sha,
      relPath,
      error: String(error),
    })
    return null
  }
}

function asPathArray(diffStats: unknown): string[] {
  if (!Array.isArray(diffStats)) return []
  const out: string[] = []
  for (const entry of diffStats) {
    if (entry && typeof entry === 'object' && 'path' in entry) {
      const p = (entry as { path: unknown }).path
      if (typeof p === 'string') out.push(p)
    }
  }
  return out
}
