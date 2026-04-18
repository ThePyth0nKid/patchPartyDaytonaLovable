import { NextRequest, NextResponse } from 'next/server'
import { nanoid } from 'nanoid'
import { auth } from '@/auth'
import { getPersona, PersonaId } from '@/lib/personas'
import { partyStore } from '@/lib/store'
import {
  fetchIssue,
  getOctokitFor,
  getFallbackOctokit,
} from '@/lib/github'
import { runAgent } from '@/lib/agent'
import { classifyIssue, selectPersonas, selectSquad } from '@/lib/orchestrator'
import { AgentState, Party, PartyClassification } from '@/lib/types'
import { parseBody, StartPartySchema } from '@/lib/validation'
import { checkAndReserveUsage } from '@/lib/usage'
import { log } from '@/lib/log'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: 'Sign in with GitHub to start a party.' },
      { status: 401 },
    )
  }

  const parsed = await parseBody(req, StartPartySchema)
  if (!parsed.ok) return parsed.response
  const { issueUrl } = parsed.data

  // 1. Resolve this user's GitHub token + Octokit. Falls back to env PAT only
  //    if the user has no linked account AND a legacy PAT is configured —
  //    useful for local dev before wiring an OAuth App.
  const gh = await getOctokitFor(session.user.id)
  const octokit = gh?.octokit ?? getFallbackOctokit()
  const userToken = gh?.token ?? process.env.GITHUB_TOKEN
  if (!octokit || !userToken) {
    return NextResponse.json(
      { error: 'GitHub account not connected. Re-link from Settings.' },
      { status: 403 },
    )
  }

  // 1.5 Cost-control: reserve usage BEFORE we spawn any sandbox. If we refuse
  //     here the user loses nothing; if we refuse after runAgent() fires we've
  //     already paid for Daytona + Anthropic.
  const reservation = await checkAndReserveUsage(session.user.id)
  if (!reservation.ok) {
    const msg =
      reservation.reason === 'daily-limit'
        ? "You've hit today's free-tier limit. Resets at midnight UTC."
        : 'You already have a party running. Finish or cancel it first.'
    return NextResponse.json(
      { error: msg, reason: reservation.reason, remaining: reservation.remaining },
      { status: 429 },
    )
  }

  const issue = await fetchIssue(octokit, issueUrl)
  if (!issue) {
    return NextResponse.json(
      { error: 'Could not fetch issue. Check the URL and that you have access to the repo.' },
      { status: 400 },
    )
  }

  // 2. Classify + pick squad.
  const base = await classifyIssue(issue.title, issue.body)
  const squadId = selectSquad(base)
  const selectedPersonas = selectPersonas(squadId)
  const classification: PartyClassification = {
    ...base,
    squadId,
    selectedPersonas,
  }

  const partyId = nanoid(10)
  const now = Date.now()

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

  await partyStore.create(party, session.user.id)

  // 3. Fire off only the selected agents — do NOT await.
  for (const id of selectedPersonas) {
    const persona = getPersona(id)
    runAgent(party, persona, { userToken }).catch((err) => {
      log.error('agent crashed', {
        partyId,
        personaId: id,
        error: err instanceof Error ? err.message : String(err),
      })
    })
  }

  log.info('party started', {
    partyId,
    userId: session.user.id,
    squadId,
    issueUrl,
  })

  return NextResponse.json({ partyId, issue, classification })
}
