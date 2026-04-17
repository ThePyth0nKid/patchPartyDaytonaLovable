import { PersonaId, SquadId } from './personas'

export type AgentStatus =
  | 'queued'
  | 'initializing'
  | 'cloning'
  | 'reading'
  | 'generating'
  | 'writing'
  | 'testing'
  | 'committing'
  | 'done'
  | 'error'

export interface AgentState {
  persona: PersonaId
  status: AgentStatus
  message: string
  startedAt: number
  finishedAt?: number
  stats: {
    linesAdded: number
    linesRemoved: number
    filesChanged: number
    testsStatus?: { passed: number; failed: number }
    durationMs?: number
  }
  result?: {
    files: Array<{
      path: string
      action: 'create' | 'modify'
      content: string
      originalContent?: string
    }>
    branchName: string
    commitSha?: string
    prUrl?: string
    summary: string
    previewUrl?: string     // Raw Daytona preview URL (bypasses warning via proxy)
    previewToken?: string   // Daytona preview-token, used by server proxy header
    sandboxId?: string      // Keep sandbox alive for preview (don't delete on success)
    bonusFeatures?: Array<{
      name: string
      why: string
      files: Array<{ path: string; action: string; content: string }>
    }>
  }
  error?: string
}

export type IssueType =
  | 'frontend'
  | 'backend'
  | 'fullstack'
  | 'infrastructure'
  | 'bug-fix'

export type IssueConcern =
  | 'ui'
  | 'accessibility'
  | 'security'
  | 'performance'
  | 'data'
  | 'api'
  | 'styling'
  | 'testing'

export interface PartyClassification {
  type: IssueType
  concerns: IssueConcern[]
  complexity: 'simple' | 'medium' | 'complex'
  /** One-sentence human-readable reason for the selection — surfaced in UI. */
  reason: string
  /** The squad the orchestrator picked — drives colour/banner copy in the UI. */
  squadId: SquadId
  /** Resolved persona ids the squad contains (denormalised for easy access). */
  selectedPersonas: PersonaId[]
}

export interface Party {
  id: string
  issueUrl: string
  issueTitle: string
  issueBody: string
  repoOwner: string
  repoName: string
  createdAt: number
  classification?: PartyClassification
  agents: Partial<Record<PersonaId, AgentState>>
}

export type PartyEvent =
  | { type: 'agent_update'; persona: PersonaId; state: Partial<AgentState> }
  | { type: 'party_done'; party: Party }
  | { type: 'error'; message: string }
