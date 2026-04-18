import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getOctokitFor } from '@/lib/github'

export const dynamic = 'force-dynamic'

export interface RepoSummary {
  id: number
  name: string
  fullName: string
  owner: string
  description: string | null
  private: boolean
  stars: number
  language: string | null
  pushedAt: string | null
  defaultBranch: string | null
  htmlUrl: string
}

export async function GET(req: NextRequest) {
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

  const url = new URL(req.url)
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10) || 1)
  const search = url.searchParams.get('search')?.toLowerCase().trim() ?? ''

  const { data } = await gh.octokit.repos.listForAuthenticatedUser({
    sort: 'pushed',
    per_page: 50,
    page,
    affiliation: 'owner,collaborator,organization_member',
  })

  const repos: RepoSummary[] = data
    .filter((r) => !search || r.full_name.toLowerCase().includes(search))
    .map((r) => ({
      id: r.id,
      name: r.name,
      fullName: r.full_name,
      owner: r.owner.login,
      description: r.description,
      private: r.private,
      stars: r.stargazers_count ?? 0,
      language: r.language ?? null,
      pushedAt: r.pushed_at ?? null,
      defaultBranch: r.default_branch ?? null,
      htmlUrl: r.html_url,
    }))

  return NextResponse.json({ repos, page, hasMore: data.length === 50 })
}
