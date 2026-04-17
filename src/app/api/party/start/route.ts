import { NextRequest, NextResponse } from 'next/server'
import { nanoid } from 'nanoid'
import { PERSONAS } from '@/lib/personas'
import { partyStore } from '@/lib/store'
import { fetchIssue } from '@/lib/github'
import { runAgent } from '@/lib/agent'
import { AgentState, Party } from '@/lib/types'

export async function POST(req: NextRequest) {
  const { issueUrl } = await req.json()

  if (!issueUrl) {
    return NextResponse.json({ error: 'issueUrl required' }, { status: 400 })
  }

  const issue = await fetchIssue(issueUrl)
  if (!issue) {
    return NextResponse.json(
      { error: 'Could not fetch issue. Is the repo public and URL correct?' },
      { status: 400 },
    )
  }

  const partyId = nanoid(10)
  const now = Date.now()

  const initialAgents = PERSONAS.reduce(
    (acc, p) => {
      acc[p.id] = {
        persona: p.id,
        status: 'queued',
        message: 'Waiting to start...',
        startedAt: now,
        stats: { linesAdded: 0, linesRemoved: 0, filesChanged: 0 },
      }
      return acc
    },
    {} as Record<string, AgentState>,
  )

  const party: Party = {
    id: partyId,
    issueUrl,
    issueTitle: issue.title,
    issueBody: issue.body,
    repoOwner: issue.owner,
    repoName: issue.repo,
    createdAt: now,
    agents: initialAgents as Party['agents'],
  }

  partyStore.create(party)

  // Fire off all 5 agents in parallel — do NOT await.
  // They report progress via partyStore events, which the SSE route streams.
  PERSONAS.forEach((persona) => {
    runAgent(party, persona).catch((err) => {
      console.error(`Agent ${persona.id} crashed:`, err)
    })
  })

  return NextResponse.json({ partyId, issue })
}
