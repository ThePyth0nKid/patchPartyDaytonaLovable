import { NextRequest, NextResponse } from 'next/server'
import { nanoid } from 'nanoid'
import { getPersona, PersonaId } from '@/lib/personas'
import { partyStore } from '@/lib/store'
import { fetchIssue } from '@/lib/github'
import { runAgent } from '@/lib/agent'
import { classifyIssue, selectPersonas, selectSquad } from '@/lib/orchestrator'
import { AgentState, Party, PartyClassification } from '@/lib/types'

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

  // 1. Classify the issue. Fast Haiku call, returns a safe fallback on error.
  const base = await classifyIssue(issue.title, issue.body)

  // 2. Pick ONE squad. Every agent in the squad is a deep specialist for that
  //    domain — the user gets five expert takes on the same problem, not a
  //    generalist mix. Squad IDs: 'philosophy' | 'frontend' | 'backend' |
  //    'security' | 'fullstack' | 'bugfix' | 'infra'.
  const squadId = selectSquad(base)
  const selectedPersonas = selectPersonas(squadId)
  const classification: PartyClassification = {
    ...base,
    squadId,
    selectedPersonas,
  }

  const partyId = nanoid(10)
  const now = Date.now()

  // 3. Seed the agent state only for the selected personas so the UI renders
  //    exactly the team that was assembled.
  const initialAgents: Partial<Record<PersonaId, AgentState>> = {}
  for (const id of selectedPersonas) {
    initialAgents[id] = {
      persona: id,
      status: 'queued',
      message: 'Waiting to start...',
      startedAt: now,
      stats: { linesAdded: 0, linesRemoved: 0, filesChanged: 0 },
    }
  }

  const party: Party = {
    id: partyId,
    issueUrl,
    issueTitle: issue.title,
    issueBody: issue.body,
    repoOwner: issue.owner,
    repoName: issue.repo,
    createdAt: now,
    classification,
    agents: initialAgents,
  }

  partyStore.create(party)

  // 4. Fire off only the selected agents — do NOT await.
  for (const id of selectedPersonas) {
    const persona = getPersona(id)
    runAgent(party, persona).catch((err) => {
      console.error(`Agent ${id} crashed:`, err)
    })
  }

  return NextResponse.json({ partyId, issue, classification })
}
