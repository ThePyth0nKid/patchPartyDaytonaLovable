import { PersonaId } from './personas'

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
    previewUrl?: string  // Live Daytona preview URL — the Lovable moment
    sandboxId?: string   // Keep sandbox alive for preview (don't delete on success)
    bonusFeatures?: Array<{
      name: string
      why: string
      files: Array<{ path: string; action: string; content: string }>
    }>
  }
  error?: string
}

export interface Party {
  id: string
  issueUrl: string
  issueTitle: string
  issueBody: string
  repoOwner: string
  repoName: string
  createdAt: number
  agents: Record<PersonaId, AgentState>
}

export type PartyEvent =
  | { type: 'agent_update'; persona: PersonaId; state: Partial<AgentState> }
  | { type: 'party_done'; party: Party }
  | { type: 'error'; message: string }
