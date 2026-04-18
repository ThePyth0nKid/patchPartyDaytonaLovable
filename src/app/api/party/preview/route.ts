import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { classifyIssue, selectPersonas, selectSquad } from '@/lib/orchestrator'
import { SQUADS } from '@/lib/personas'
import { parseBody, PreviewPartySchema } from '@/lib/validation'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const parsed = await parseBody(req, PreviewPartySchema)
  if (!parsed.ok) return parsed.response
  const { title, body: issueBody } = parsed.data

  const base = await classifyIssue(title, issueBody)
  const squadId = selectSquad(base)
  const personaIds = selectPersonas(squadId)
  const squad = SQUADS[squadId]

  return NextResponse.json({
    type: base.type,
    complexity: base.complexity,
    concerns: base.concerns,
    reason: base.reason,
    squadId,
    squadName: squad.name,
    personaIds,
  })
}
