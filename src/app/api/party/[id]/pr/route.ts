import { NextRequest, NextResponse } from 'next/server'
import { partyStore } from '@/lib/store'
import { createPullRequest } from '@/lib/github'
import { getPersona, PersonaId } from '@/lib/personas'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const { personaId } = (await req.json()) as { personaId: PersonaId }

  const party = partyStore.get(id)
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

  const persona = getPersona(personaId)

  // NOTE: Branch was already created + committed in the sandbox.
  // To actually create a PR, we need to push the branch to GitHub first.
  // For the hackathon MVP, the branch lives in the ephemeral sandbox only.
  // The "Create PR" button instead creates the PR directly via GitHub API
  // using the git contents we have locally.
  //
  // TODO POST-HACKATHON: push branch properly from sandbox before calling this.
  // For demo: fall back to sharing the patch contents.

  const prBody = `## Implemented by PatchParty (${persona.icon} ${persona.name})

**Philosophy:** ${persona.tagline}

**Summary:** ${agent.result.summary}

**Files changed:** ${agent.result.files.length}
${agent.result.files.map((f) => `- \`${f.path}\` (${f.action})`).join('\n')}

---

_Generated at PatchParty — choose your patch, skip the vibe._`

  const prUrl = await createPullRequest({
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

  return NextResponse.json({ prUrl })
}
