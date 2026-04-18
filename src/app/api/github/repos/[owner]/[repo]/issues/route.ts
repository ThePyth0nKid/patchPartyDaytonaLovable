import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getOctokitFor } from '@/lib/github'

export const dynamic = 'force-dynamic'

export interface IssueSummary {
  number: number
  title: string
  body: string
  state: 'open' | 'closed'
  labels: Array<{ name: string; color: string }>
  author: string | null
  commentsCount: number
  createdAt: string
  htmlUrl: string
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ owner: string; repo: string }> },
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const gh = await getOctokitFor(session.user.id)
  if (!gh) {
    return NextResponse.json(
      { error: 'GitHub account not connected' },
      { status: 403 },
    )
  }

  const { owner, repo } = await params
  const url = new URL(req.url)
  const state = (url.searchParams.get('state') ?? 'open') as
    | 'open'
    | 'closed'
    | 'all'
  const labels = url.searchParams.get('labels') ?? undefined
  const search = url.searchParams.get('search')?.toLowerCase().trim() ?? ''
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10) || 1)

  const { data } = await gh.octokit.issues.listForRepo({
    owner,
    repo,
    state,
    labels,
    per_page: 50,
    page,
  })

  const issues: IssueSummary[] = data
    // Pull requests come back from this endpoint too; filter them out.
    .filter((i) => !i.pull_request)
    .filter(
      (i) =>
        !search ||
        i.title.toLowerCase().includes(search) ||
        String(i.number).includes(search),
    )
    .map((i) => ({
      number: i.number,
      title: i.title,
      body: i.body ?? '',
      state: i.state as 'open' | 'closed',
      labels: (i.labels ?? [])
        .map((l) => (typeof l === 'string' ? { name: l, color: '94a3b8' } : {
          name: l.name ?? '',
          color: l.color ?? '94a3b8',
        }))
        .filter((l) => l.name),
      author: i.user?.login ?? null,
      commentsCount: i.comments,
      createdAt: i.created_at,
      htmlUrl: i.html_url,
    }))

  return NextResponse.json({ issues, page, hasMore: data.length === 50 })
}
