import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/auth'
import { partyStore } from '@/lib/store'
import {
  createPullRequest,
  getOctokitFor,
  getFallbackOctokit,
} from '@/lib/github'
import { getPersona, PersonaId } from '@/lib/personas'
import { log } from '@/lib/log'
import { requireCsrfHeader } from '@/lib/csrf'
import { sanitizeShipBody, sanitizeShipTitle } from '@/lib/ship-body'

// T3.5: accept optional user-edited title/body from the ShipSheet. Both are
// sanitised server-side via `sanitizeShipBody` / `sanitizeShipTitle` — HTML
// comments stripped, body capped at 2000 chars, title stripped of newlines
// and capped at 200 chars. Closes S5.
const ShipSchema = z.object({
  personaId: z.string().trim().min(1).max(64),
  title: z.string().max(400).optional(),
  body: z.string().max(40_000).optional(),
  type: z.enum(['feat', 'fix']).optional(),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: 'Sign in with GitHub to open a PR.' },
      { status: 401 },
    )
  }
  const csrf = requireCsrfHeader(req)
  if (csrf) return csrf

  const { id } = await params
  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }
  const parsed = ShipSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 })
  }
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

  // User-edited path (ShipSheet) or canned fallback (pre-T3.5 clients).
  // Either way, the body runs through `sanitizeShipBody` so a malicious
  // `<!-- instruction -->` cannot round-trip to GitHub.
  const customBody = parsed.data.body
  const customTitle = parsed.data.title
  const typePrefix = parsed.data.type ?? 'feat'

  const fallbackBody = `## Implemented by PatchParty — ${persona.name}

**Philosophy:** ${persona.tagline}

**Summary:** ${agent.result.summary}

**Files changed:** ${agent.result.files.length}
${agent.result.files.map((f) => `- \`${f.path}\` (${f.action})`).join('\n')}

---

_Generated at PatchParty — choose your patch, skip the vibe._`

  const finalBody = sanitizeShipBody(customBody ?? fallbackBody)

  const rawTitle =
    customTitle && customTitle.trim().length > 0
      ? `${typePrefix}: ${customTitle}`
      : `${party.issueTitle} [via PatchParty: ${persona.name}]`
  const finalTitle = sanitizeShipTitle(rawTitle)

  const prUrl = await createPullRequest(octokit, {
    owner: party.repoOwner,
    repo: party.repoName,
    title: finalTitle,
    body: finalBody,
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
