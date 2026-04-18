// Hybrid party store.
//
// In-memory pub/sub for live SSE subscribers + asynchronous Prisma writes on
// every state change, so parties and their agents survive container restarts.
//
// Contract with callers:
//   - create()     — async, persists the initial row.
//   - get()        — async. Memory first, DB fallback (rehydrate).
//   - update()     — sync. Mutates memory immediately; persists changes in
//                    the background (fire-and-forget). This keeps the SSE
//                    hot path allocation-light.
//   - subscribe()  — sync, memory-only.
//   - emit()       — sync, memory-only.

import type { Prisma, PrismaClient, PartyStatus } from '@prisma/client'
import { prisma } from './prisma'
import { parseIssueUrl } from './github'
import type { PersonaId } from './personas'
import type {
  AgentState,
  Party,
  PartyClassification,
  PartyEvent,
} from './types'

type Listener = (event: PartyEvent) => void

function isTerminal(status: AgentState['status']): boolean {
  return status === 'done' || status === 'error'
}

function deriveStatus(party: Party): PartyStatus {
  const agents = Object.values(party.agents).filter(Boolean) as AgentState[]
  if (agents.length === 0) return 'RUNNING'
  const allFinished = agents.every((a) => isTerminal(a.status))
  if (!allFinished) return 'RUNNING'
  const anyError = agents.some((a) => a.status === 'error')
  const anyDone = agents.some((a) => a.status === 'done')
  if (anyDone && !anyError) return 'DONE'
  if (anyDone && anyError) return 'DONE' // partial success still surfaces results
  return 'FAILED'
}

function partyFromRow(
  row: Prisma.PartyGetPayload<{ include: { agents: true } }>,
): Party {
  const agents: Partial<Record<PersonaId, AgentState>> = {}
  for (const a of row.agents) {
    const filesJson = a.files as unknown
    const statsJson = a.stats as unknown
    const files = Array.isArray(filesJson)
      ? (filesJson as AgentState['result'] extends infer R
            ? R extends { files: infer F }
              ? F
              : never
            : never)
      : undefined
    const stats = (statsJson ?? {
      linesAdded: 0,
      linesRemoved: 0,
      filesChanged: 0,
    }) as AgentState['stats']

    const result: AgentState['result'] | undefined = a.summary
      ? {
          files: files ?? [],
          branchName: a.branchName ?? '',
          summary: a.summary ?? '',
          previewUrl: a.previewUrl ?? undefined,
          previewToken: a.previewToken ?? undefined,
          sandboxId: a.sandboxId ?? undefined,
        }
      : undefined

    agents[a.personaId as PersonaId] = {
      persona: a.personaId as PersonaId,
      status: a.status as AgentState['status'],
      message: a.message ?? '',
      startedAt: a.startedAt.getTime(),
      finishedAt: a.finishedAt?.getTime(),
      stats,
      result,
      error: a.error ?? undefined,
    }
  }

  return {
    id: row.id,
    issueUrl: row.issueUrl,
    issueTitle: row.issueTitle,
    issueBody: row.issueBody,
    repoOwner: row.repoOwner,
    repoName: row.repoName,
    createdAt: row.createdAt.getTime(),
    classification: (row.classification ?? undefined) as
      | PartyClassification
      | undefined,
    agents,
  }
}

class PartyStore {
  private parties = new Map<string, Party>()
  private listeners = new Map<string, Set<Listener>>()
  private partyUserId = new Map<string, string>()

  async create(party: Party, userId: string): Promise<void> {
    this.parties.set(party.id, party)
    this.partyUserId.set(party.id, userId)
    this.listeners.set(party.id, new Set())

    const issueNumber = parseIssueUrl(party.issueUrl)?.number ?? 0
    const initialAgents = Object.values(party.agents).filter(Boolean) as AgentState[]

    try {
      await prisma.party.create({
        data: {
          id: party.id,
          userId,
          issueUrl: party.issueUrl,
          issueTitle: party.issueTitle,
          issueBody: party.issueBody,
          repoOwner: party.repoOwner,
          repoName: party.repoName,
          issueNumber,
          classification: (party.classification ?? null) as unknown as Prisma.InputJsonValue,
          status: 'RUNNING',
          agents: {
            create: initialAgents.map((a) => ({
              personaId: a.persona,
              status: a.status,
              message: a.message,
              startedAt: new Date(a.startedAt),
              stats: (a.stats ?? null) as Prisma.InputJsonValue,
            })),
          },
        },
      })
    } catch (error: unknown) {
      console.error('partyStore.create persist failed:', error)
    }
  }

  async get(id: string): Promise<Party | undefined> {
    const cached = this.parties.get(id)
    if (cached) return cached

    const row = await prisma.party.findUnique({
      where: { id },
      include: { agents: true },
    })
    if (!row) return undefined

    const party = partyFromRow(row)
    this.parties.set(id, party)
    this.partyUserId.set(id, row.userId)
    if (!this.listeners.has(id)) this.listeners.set(id, new Set())
    return party
  }

  update(id: string, updater: (p: Party) => Party): void {
    const existing = this.parties.get(id)
    if (!existing) return
    const updated = updater(existing)
    this.parties.set(id, updated)

    // Diff agents against previous snapshot and persist only what changed.
    const changed: Array<{ personaId: PersonaId; state: AgentState }> = []
    for (const [key, value] of Object.entries(updated.agents)) {
      if (!value) continue
      const before = existing.agents[key as PersonaId]
      if (!before || before !== value) {
        changed.push({ personaId: key as PersonaId, state: value })
      }
    }

    if (changed.length > 0) {
      void this.persistAgents(id, changed)
    }

    const newStatus = deriveStatus(updated)
    const oldStatus = deriveStatus(existing)
    if (newStatus !== oldStatus) {
      void this.persistPartyStatus(id, newStatus)
    }
  }

  subscribe(id: string, listener: Listener): () => void {
    let set = this.listeners.get(id)
    if (!set) {
      set = new Set()
      this.listeners.set(id, set)
    }
    set.add(listener)
    return () => set!.delete(listener)
  }

  emit(id: string, event: PartyEvent): void {
    const set = this.listeners.get(id)
    if (!set) return
    set.forEach((listener) => {
      try {
        listener(event)
      } catch (error: unknown) {
        console.error('Listener error:', error)
      }
    })
  }

  /** Used by /api/party/[id]/pr to mark which persona was shipped. */
  async recordPick(id: string, personaId: string, prUrl: string): Promise<void> {
    try {
      await prisma.party.update({
        where: { id },
        data: { pickedPersona: personaId, prUrl },
      })
    } catch (error: unknown) {
      console.error('partyStore.recordPick failed:', error)
    }
  }

  private async persistAgents(
    partyId: string,
    updates: Array<{ personaId: PersonaId; state: AgentState }>,
  ): Promise<void> {
    const writes: Promise<unknown>[] = []
    for (const { personaId, state } of updates) {
      writes.push(
        prisma.agent.upsert({
          where: { partyId_personaId: { partyId, personaId } },
          create: {
            partyId,
            personaId,
            status: state.status,
            message: state.message,
            startedAt: new Date(state.startedAt),
            finishedAt: state.finishedAt ? new Date(state.finishedAt) : null,
            branchName: state.result?.branchName,
            previewUrl: state.result?.previewUrl,
            previewToken: state.result?.previewToken,
            sandboxId: state.result?.sandboxId,
            summary: state.result?.summary,
            files: (state.result?.files ?? null) as Prisma.InputJsonValue,
            stats: (state.stats ?? null) as Prisma.InputJsonValue,
            error: state.error,
          },
          update: {
            status: state.status,
            message: state.message,
            finishedAt: state.finishedAt ? new Date(state.finishedAt) : null,
            branchName: state.result?.branchName,
            previewUrl: state.result?.previewUrl,
            previewToken: state.result?.previewToken,
            sandboxId: state.result?.sandboxId,
            summary: state.result?.summary,
            files: (state.result?.files ?? null) as Prisma.InputJsonValue,
            stats: (state.stats ?? null) as Prisma.InputJsonValue,
            error: state.error,
          },
        }),
      )
    }
    try {
      await Promise.all(writes)
    } catch (error: unknown) {
      console.error('persistAgents failed:', error)
    }
  }

  private async persistPartyStatus(
    id: string,
    status: PartyStatus,
  ): Promise<void> {
    try {
      await prisma.party.update({ where: { id }, data: { status } })
    } catch (error: unknown) {
      console.error('persistPartyStatus failed:', error)
    }
  }
}

// Global singleton — survives hot reloads in dev, shared across routes in prod.
const globalForStore = globalThis as unknown as { partyStore?: PartyStore }
export const partyStore = globalForStore.partyStore ?? new PartyStore()
if (process.env.NODE_ENV !== 'production') globalForStore.partyStore = partyStore

// Expose the prisma client so server-only code (cron, admin) can reach the
// same instance without re-importing the module graph inside the store.
export type { PrismaClient }
