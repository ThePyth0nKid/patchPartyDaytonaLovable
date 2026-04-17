// Issue-aware orchestrator: reads the issue once, decides what type of problem
// it is, and assembles a 5-persona team from the pool that fits.
//
// Keeps the user-facing flow identical ("paste URL → click") — the classifier
// runs server-side during `/api/party/start` and its verdict is attached to the
// party so the UI can render the "team assembled because X" banner.

import Anthropic from '@anthropic-ai/sdk'
import { PersonaId } from './personas'
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
): Promise<Omit<PartyClassification, 'selectedPersonas'>> {
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
    // Safe fallback — keeps the app working even if the classifier call
    // fails (API outage, rate limit, weird model output).
    return {
      type: 'fullstack',
      concerns: [],
      complexity: 'medium',
      reason: 'Classifier unavailable — assembled balanced default team.',
    }
  }
}

/**
 * Pure, deterministic: given a classification, produce an ordered list of
 * exactly 5 PersonaIds. Tweak the rules here to reshape the team without
 * touching any UI or API code.
 */
export function selectPersonas(
  c: Omit<PartyClassification, 'selectedPersonas'>,
): PersonaId[] {
  const picked: PersonaId[] = []
  const add = (...ids: PersonaId[]) => {
    for (const id of ids) if (!picked.includes(id) && picked.length < 5) picked.push(id)
  }

  // Concern-driven mandatory additions come first — anything security-sensitive
  // always gets the Defender at the table even if the body screams "frontend".
  if (c.concerns.includes('security')) add('defender')

  // Type-driven core team.
  switch (c.type) {
    case 'frontend':
      add('frontend-specialist', 'ux-king', 'hackfix', 'craftsman', 'innovator')
      break
    case 'backend':
      add('backend-specialist', 'api-designer', 'craftsman', 'defender', 'hackfix')
      break
    case 'fullstack':
      add(
        'fullstack-engineer',
        'frontend-specialist',
        'backend-specialist',
        'craftsman',
        'innovator',
      )
      break
    case 'infrastructure':
      add('backend-specialist', 'defender', 'craftsman', 'hackfix', 'innovator')
      break
    case 'bug-fix':
      add('craftsman', 'defender', 'hackfix', 'innovator', 'ux-king')
      break
  }

  // Complexity tuning: on simple issues, swap out one specialist for a philosophy
  // persona so we don't over-engineer. On complex ones, pull in Innovator.
  if (c.complexity === 'simple' && !picked.includes('hackfix')) {
    picked[picked.length - 1] = 'hackfix'
  }
  if (c.complexity === 'complex' && !picked.includes('innovator')) {
    picked[picked.length - 1] = 'innovator'
  }

  // Fill any remaining slots from a stable priority list — guarantees exactly 5.
  const fill: PersonaId[] = [
    'craftsman',
    'hackfix',
    'innovator',
    'ux-king',
    'defender',
    'frontend-specialist',
    'backend-specialist',
    'fullstack-engineer',
    'api-designer',
  ]
  for (const id of fill) if (picked.length < 5) add(id)

  return picked.slice(0, 5)
}
