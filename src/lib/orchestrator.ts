// Issue-aware orchestrator: reads the issue once, decides what type of problem
// it is, and picks ONE squad of 5 deeply-specialised agents to race on it.
//
// The user-facing flow stays identical (paste URL → click). The classifier
// runs server-side during /api/party/start and its verdict is attached to the
// party so the UI can render the "team assembled because X" banner.

import Anthropic from '@anthropic-ai/sdk'
import { PersonaId, SquadId, SQUADS } from './personas'
import {
  IssueConcern,
  IssueType,
  PartyClassification,
} from './types'

const anthropic = new Anthropic()

const CLASSIFIER_SYSTEM = `You are PatchParty's issue router. Given a GitHub issue title + body, decide what kind of implementation work it implies.

Respond with ONLY a single JSON object, no prose:
{
  "type": "frontend" | "backend" | "fullstack" | "infrastructure" | "bug-fix",
  "concerns": subset of ["ui","accessibility","security","performance","data","api","styling","testing"],
  "complexity": "simple" | "medium" | "complex",
  "reason": "one short sentence — what you picked and why"
}

Rules:
- "frontend" = changes are primarily in UI / styling / client-side state
- "backend" = handlers, data, queries, no UI
- "fullstack" = both a UI and a server-side contract change
- "infrastructure" = CI / build / deployment / tooling
- "bug-fix" = the issue is to repair broken behaviour, not add a feature
- "simple" = one or two files, no data model, one obvious approach
- "complex" = multiple files, new routes / tables, or unclear requirements
- Include "security" in concerns if the issue involves auth, user input, or PII
- Include "accessibility" if UI and the feature is user-facing
- Keep "reason" under 20 words.`

export async function classifyIssue(
  title: string,
  body: string,
): Promise<Omit<PartyClassification, 'selectedPersonas' | 'squadId'>> {
  try {
    const resp = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system: CLASSIFIER_SYSTEM,
      messages: [
        {
          role: 'user',
          content: `TITLE: ${title}\n\nBODY:\n${body.slice(0, 4000)}`,
        },
      ],
    })

    const text = resp.content.find((c) => c.type === 'text')
    if (!text || text.type !== 'text') throw new Error('no text in response')

    const match = text.text.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('no json found')

    const parsed = JSON.parse(match[0])
    const validTypes: IssueType[] = [
      'frontend',
      'backend',
      'fullstack',
      'infrastructure',
      'bug-fix',
    ]
    const type: IssueType = validTypes.includes(parsed.type)
      ? parsed.type
      : 'fullstack'

    const concerns: IssueConcern[] = Array.isArray(parsed.concerns)
      ? (parsed.concerns as string[]).filter((c): c is IssueConcern =>
          [
            'ui',
            'accessibility',
            'security',
            'performance',
            'data',
            'api',
            'styling',
            'testing',
          ].includes(c),
        )
      : []

    const complexity =
      parsed.complexity === 'simple' ||
      parsed.complexity === 'medium' ||
      parsed.complexity === 'complex'
        ? parsed.complexity
        : 'medium'

    const reason =
      typeof parsed.reason === 'string' && parsed.reason.length > 0
        ? parsed.reason.slice(0, 140)
        : 'Classified from issue body.'

    return { type, concerns, complexity, reason }
  } catch (e) {
    console.error('[orchestrator] classify failed, falling back:', e)
    return {
      type: 'fullstack',
      concerns: [],
      complexity: 'medium',
      reason: 'Classifier unavailable — assembled the All-Trades squad as a safe default.',
    }
  }
}

/**
 * Pure, deterministic: given a classification, pick ONE squad by id.
 *
 * Rule of thumb:
 *   - any "security" concern → Security squad (overrides type)
 *   - otherwise fall through to the squad matching the issue type
 *   - fullstack with no other hints gets the philosophy (All-Trades) squad
 *     so the demo keeps its 5-philosophy character when classification is vague
 */
export function selectSquad(
  c: Omit<PartyClassification, 'selectedPersonas' | 'squadId'>,
): SquadId {
  if (c.concerns.includes('security')) return 'security'
  switch (c.type) {
    case 'frontend':
      return 'frontend'
    case 'backend':
      return 'backend'
    case 'bug-fix':
      return 'bugfix'
    case 'infrastructure':
      return 'infra'
    case 'fullstack':
      // Fullstack issues default to the philosophy squad unless a sub-concern
      // pushes them somewhere specific — most demo issues land here.
      if (c.concerns.includes('api') || c.concerns.includes('data'))
        return 'fullstack'
      return 'philosophy'
  }
}

export function selectPersonas(squadId: SquadId): PersonaId[] {
  return SQUADS[squadId].personaIds
}
