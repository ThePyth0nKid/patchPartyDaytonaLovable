import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getOctokitFor } from '@/lib/github'
import { log } from '@/lib/log'

export const dynamic = 'force-dynamic'

const ActivateSchema = z.object({
  owner: z.string().trim().min(1).max(100).regex(/^[A-Za-z0-9][A-Za-z0-9-]*$/),
  name: z.string().trim().min(1).max(100).regex(/^[A-Za-z0-9._-]+$/),
})

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const repos = await prisma.activeRepo.findMany({
    where: { userId: session.user.id },
    orderBy: { lastUsedAt: 'desc' },
  })

  return NextResponse.json({ repos })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const json = await req.json().catch(() => null)
  const parsed = ActivateSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_input', detail: parsed.error.flatten() },
      { status: 400 },
    )
  }
  const { owner, name } = parsed.data

  const gh = await getOctokitFor(session.user.id)
  if (!gh) {
    return NextResponse.json({ error: 'github_not_connected' }, { status: 403 })
  }

  try {
    const { data: repo } = await gh.octokit.repos.get({ owner, repo: name })

    const saved = await prisma.activeRepo.upsert({
      where: { userId_owner_name: { userId: session.user.id, owner, name } },
      create: {
        userId: session.user.id,
        owner,
        name,
        description: repo.description ?? null,
        isPrivate: repo.private,
        defaultBranch: repo.default_branch ?? null,
        language: repo.language ?? null,
        stars: repo.stargazers_count ?? 0,
      },
      update: {
        description: repo.description ?? null,
        isPrivate: repo.private,
        defaultBranch: repo.default_branch ?? null,
        language: repo.language ?? null,
        stars: repo.stargazers_count ?? 0,
        lastUsedAt: new Date(),
      },
    })

    log.info('repo activated', { userId: session.user.id, owner, name })
    return NextResponse.json({ repo: saved })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('Not Found')) {
      return NextResponse.json({ error: 'repo_not_found' }, { status: 404 })
    }
    log.error('repo activation failed', { owner, name, error: msg })
    return NextResponse.json({ error: 'activation_failed', detail: msg }, { status: 500 })
  }
}
