import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { partyStore } from '@/lib/store'
import {
  createPullRequest,
  getOctokitFor,
  getFallbackOctokit,
} from '@/lib/github'
import { getPersona, PersonaId } from '@/lib/personas'
import { parseBody, PickPatchSchema } from '@/lib/validation'
import { log } from '@/lib/log'
import { requireCsrfHeader } from '@/lib/csrf'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const csrf = requireCsrfHeader(req)
  if (csrf) return csrf
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: 'Sign in with GitHub to open a PR.' },
      { status: 401 },
    )
  }

  const { id } = await params
  const parsed = await parseBody(req, PickPatchSchema)
  if (!parsed.ok) return parsed.response
  const personaId = parsed.data.personaId as PersonaId

  const party = await partyStore.get(id)
  if (!party) {
    return NextResponse.json({ error: 'Party not found' }, { status: 404 })
  }

  const agent = party.agents[personaId]
  if (!agent?.result) {
    return NextResponse.json(
      { error: 'Agent has no result yet' },
      { status: 400 },
    )
  }

  const gh = await getOctokitFor(session.user.id)
  const octokit = gh?.octokit ?? getFallbackOctokit()
  if (!octokit) {
    return NextResponse.json(
      { error: 'GitHub account not connected. Re-link from Settings.' },
      { status: 403 },
    )
  }

  const persona = getPersona(personaId)

  const prBody = `## Implemented by PatchParty — ${persona.name}

**Philosophy:** ${persona.tagline}

**Summary:** ${agent.result.summary}

**Files changed:** ${agent.result.files.length}
${agent.result.files.map((f) => `- \`${f.path}\` (${f.action})`).join('\n')}

---

_Generated at PatchParty — choose your patch, skip the vibe._`

  const prUrl = await createPullRequest(octokit, {
    owner: party.repoOwner,
    repo: party.repoName,
    title: `${party.issueTitle} [via PatchParty: ${persona.name}]`,
    body: prBody,
    head: agent.result.branchName,
  })

  if (!prUrl) {
    return NextResponse.json(
      {
        error:
          'Could not create PR. The branch might not be pushed yet. Download patch instead.',
        patch: agent.result.files,
      },
      { status: 500 },
    )
  }

  await partyStore.recordPick(id, personaId, prUrl)
  log.info('pr opened', { partyId: id, personaId, prUrl })

  return NextResponse.json({ prUrl })
}
