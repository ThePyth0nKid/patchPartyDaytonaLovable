import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getOctokitFor } from '@/lib/github'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  {
    params,
  }: { params: Promise<{ owner: string; repo: string; number: string }> },
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const gh = await getOctokitFor(session.user.id)
  if (!gh) {
    return NextResponse.json({ error: 'not connected' }, { status: 403 })
  }

  const { owner, repo, number } = await params
  const issueNumber = parseInt(number, 10)
  if (!Number.isFinite(issueNumber)) {
    return NextResponse.json({ error: 'bad number' }, { status: 400 })
  }

  try {
    const { data } = await gh.octokit.issues.get({
      owner,
      repo,
      issue_number: issueNumber,
    })
    return NextResponse.json({
      number: data.number,
      title: data.title,
      body: data.body ?? '',
      state: data.state,
      htmlUrl: data.html_url,
      url: data.html_url,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'fetch failed'
    return NextResponse.json({ error: message }, { status: 404 })
  }
}
