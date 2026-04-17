'use client'

import { use, useEffect, useRef, useState } from 'react'
import { PERSONAS, PersonaId } from '@/lib/personas'
import { Party, AgentState, PartyEvent } from '@/lib/types'

function encodePreviewTarget(url: string, token?: string): string {
  const json = JSON.stringify(token ? { url, token } : { url })
  return btoa(json).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function collectSandboxIds(party: Party | null): string[] {
  if (!party) return []
  return Object.values(party.agents)
    .map((a) => a.result?.sandboxId)
    .filter((x): x is string => !!x)
}

function cleanupSandboxes(sandboxIds: string[]) {
  if (sandboxIds.length === 0) return
  const data = new Blob([JSON.stringify({ sandboxIds })], { type: 'application/json' })
  try {
    navigator.sendBeacon('/api/sandbox/cleanup', data)
  } catch {
    fetch('/api/sandbox/cleanup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sandboxIds }),
      keepalive: true,
    }).catch(() => {})
  }
}

export default function PartyPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const [party, setParty] = useState<Party | null>(null)
  const [connected, setConnected] = useState(false)
  const [selectedPersona, setSelectedPersona] = useState<PersonaId | null>(null)
  const partyRef = useRef<Party | null>(null)

  useEffect(() => {
    partyRef.current = party
  }, [party])

  useEffect(() => {
    // Only fire on explicit tab close / reload. Earlier we also listened to
    // `pagehide` and called cleanup on component unmount, but both fire too
    // eagerly (e.g. during React dev remounts and SPA nav), which tried to
    // delete sandboxes while they were still booting — Daytona then 409'd
    // with "modified by another operation" and the iframe saw a dead sandbox.
    const handleUnload = () => cleanupSandboxes(collectSandboxIds(partyRef.current))
    window.addEventListener('beforeunload', handleUnload)
    return () => window.removeEventListener('beforeunload', handleUnload)
  }, [])

  useEffect(() => {
    const es = new EventSource(`/api/party/${id}/stream`)
    es.onopen = () => setConnected(true)
    es.onerror = () => setConnected(false)

    es.onmessage = (ev) => {
      try {
        const event = JSON.parse(ev.data) as
          | { type: 'initial'; party: Party }
          | PartyEvent
        if (event.type === 'initial') {
          setParty(event.party)
        } else if (event.type === 'agent_update') {
          setParty((prev) => {
            if (!prev) return prev
            return {
              ...prev,
              agents: {
                ...prev.agents,
                [event.persona]: {
                  ...prev.agents[event.persona],
                  ...event.state,
                },
              },
            }
          })
        } else if (event.type === 'party_done') {
          setParty(event.party)
        }
      } catch (e) {
        console.error('Parse error:', e)
      }
    }

    return () => es.close()
  }, [id])

  if (!party) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <div>Loading party...</div>
      </main>
    )
  }

  const allDone = Object.values(party.agents).every(
    (a) => a.status === 'done' || a.status === 'error',
  )
  const doneCount = Object.values(party.agents).filter(
    (a) => a.status === 'done',
  ).length

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6">
        <a
          href="/"
          className="text-sm text-slate-400 hover:text-white transition-colors"
        >
          ← PatchParty
        </a>
        <div className="mt-2 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{party.issueTitle}</h1>
            <a
              href={party.issueUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-slate-500 hover:text-slate-300"
            >
              {party.repoOwner}/{party.repoName}
            </a>
          </div>
          <div className="text-right">
            <div className="text-sm">{doneCount} of 5 agents finished</div>
            <div className="w-40 h-1.5 bg-slate-800 rounded-full mt-1.5 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#E879F9] via-[#A78BFA] to-[#60A5FA] transition-all duration-500 ease-linear"
                style={{ width: `${(doneCount / 5) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Agents grid */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {PERSONAS.map((persona) => {
          const agent = party.agents[persona.id]
          return (
            <AgentCard
              key={persona.id}
              persona={persona}
              agent={agent}
              selected={selectedPersona === persona.id}
              onSelect={() =>
                agent.status === 'done' && setSelectedPersona(persona.id)
              }
            />
          )
        })}
      </div>

      {/* Compare modal — open as soon as the clicked agent is done */}
      {selectedPersona && (
        <ComparePanel
          party={party}
          selectedPersona={selectedPersona}
          onClose={() => setSelectedPersona(null)}
        />
      )}

      <div className="fixed bottom-4 right-4 text-xs text-slate-500">
        {connected ? '● live' : '○ disconnected'}
      </div>
    </main>
  )
}

function AgentCard({
  persona,
  agent,
  selected,
  onSelect,
}: {
  persona: (typeof PERSONAS)[number]
  agent: AgentState
  selected: boolean
  onSelect: () => void
}) {
  const accentMap: Record<string, { border: string; glow: string; text: string }> = {
    hackfix:    { border: 'border-hackfix',    glow: 'shadow-[0_0_24px_-6px_#FF6B35]', text: 'text-hackfix' },
    craftsman:  { border: 'border-craftsman',  glow: 'shadow-[0_0_24px_-6px_#14B8A6]', text: 'text-craftsman' },
    'ux-king':  { border: 'border-ux-king',    glow: 'shadow-[0_0_24px_-6px_#E879F9]', text: 'text-ux-king' },
    defender:   { border: 'border-defender',   glow: 'shadow-[0_0_24px_-6px_#60A5FA]', text: 'text-defender' },
    innovator:  { border: 'border-innovator',  glow: 'shadow-[0_0_24px_-6px_#A78BFA]', text: 'text-innovator' },
  }
  const accent = accentMap[persona.color]

  const isDone = agent.status === 'done'
  const isError = agent.status === 'error'
  const isRunning = !isDone && !isError && agent.status !== 'queued'
  const hasPreview = isDone && agent.result?.previewUrl

  return (
    <div
      onClick={onSelect}
      className={`
        bg-slate-900/60 backdrop-blur border rounded-[7px] p-4 transition-all duration-200
        ${selected ? `${accent.border} ${accent.glow}` : 'border-slate-800'}
        ${isDone ? 'cursor-pointer hover:border-slate-700' : ''}
        ${isRunning ? 'animate-pulse' : ''}
      `}
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="text-2xl">{persona.icon}</span>
        <div className="flex-1">
          <div className="font-semibold text-sm">{persona.name}</div>
          <div className="text-[10px] text-slate-500 italic">
            {persona.tagline}
          </div>
        </div>
        {hasPreview && (
          <span className="text-[10px] px-2 py-0.5 bg-green-500/10 text-green-400 border border-green-500/30 rounded-full">
            🟢 Live
          </span>
        )}
      </div>

      <div className="space-y-2 text-xs">
        <div
          className={`
          ${isError ? 'text-red-400' : isDone ? 'text-green-400' : 'text-slate-400'}
        `}
        >
          {agent.message}
        </div>

        {agent.stats.filesChanged > 0 && (
          <div className="text-slate-500">
            📁 {agent.stats.filesChanged} files · +{agent.stats.linesAdded} lines
          </div>
        )}

        {isDone && agent.result?.summary && (
          <div className="mt-3 pt-3 border-t border-slate-800 text-slate-300 line-clamp-3">
            {agent.result.summary}
          </div>
        )}

        {isDone && (
          <div className={`mt-3 pt-2 text-center text-xs font-medium ${accent.text}`}>
            Click to inspect →
          </div>
        )}
      </div>
    </div>
  )
}

function ComparePanel({
  party,
  selectedPersona,
  onClose,
}: {
  party: Party
  selectedPersona: PersonaId
  onClose: () => void
}) {
  const agent = party.agents[selectedPersona]
  const persona = PERSONAS.find((p) => p.id === selectedPersona)!
  const [creatingPR, setCreatingPR] = useState(false)
  const [prUrl, setPrUrl] = useState<string | null>(null)
  const hasPreview = !!agent.result?.previewUrl
  // Default to preview view if available — that's the wow moment
  const [view, setView] = useState<'preview' | 'code'>(
    hasPreview ? 'preview' : 'code',
  )

  async function handlePickThis() {
    setCreatingPR(true)
    try {
      const res = await fetch(`/api/party/${party.id}/pr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ personaId: selectedPersona }),
      })
      const data = await res.json()
      if (data.prUrl) {
        setPrUrl(data.prUrl)
      } else {
        alert(`PR creation failed: ${data.error ?? 'unknown'}`)
      }
    } catch (e) {
      alert(`Error: ${e}`)
    } finally {
      setCreatingPR(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-slate-900 rounded-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{persona.icon}</span>
            <div>
              <div className="text-xl font-bold">{persona.name}</div>
              <div className="text-sm text-slate-500">{persona.tagline}</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        {/* View Toggle */}
        {hasPreview && (
          <div className="px-6 pt-4 flex items-center gap-2">
            <div className="flex bg-slate-800 rounded-lg p-1">
              <button
                onClick={() => setView('preview')}
                className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
                  view === 'preview'
                    ? 'bg-[#A78BFA] text-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                🖥 Live Preview
              </button>
              <button
                onClick={() => setView('code')}
                className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
                  view === 'code'
                    ? 'bg-[#A78BFA] text-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                📝 Code
              </button>
            </div>
            {view === 'preview' && agent.result?.previewUrl && (
              <a
                href={agent.result.previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto text-xs text-slate-500 hover:text-slate-300 truncate max-w-[300px]"
              >
                🟢 Live in Daytona · {agent.result.previewUrl} ↗
              </a>
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {agent.result && (
            <>
              {/* Summary always visible */}
              <div className="bg-slate-800 rounded-lg p-4">
                <div className="text-sm font-semibold mb-2">Summary</div>
                <div className="text-sm text-slate-300">
                  {agent.result.summary}
                </div>
              </div>

              {view === 'preview' && agent.result.previewUrl && (
                <div className="bg-white rounded-lg overflow-hidden border border-slate-700">
                  <iframe
                    src={`/api/preview/${encodePreviewTarget(agent.result.previewUrl, agent.result.previewToken)}/`}
                    className="w-full h-[600px]"
                    title={`${persona.name} live preview`}
                  />
                </div>
              )}

              {view === 'code' && (
                <div>
                  <div className="text-sm font-semibold mb-3">
                    {agent.result.files.length} Files Changed
                  </div>
                  <div className="space-y-3">
                    {agent.result.files.map((file, idx) => (
                      <div
                        key={idx}
                        className="bg-slate-950 rounded-lg overflow-hidden"
                      >
                        <div className="px-4 py-2 bg-slate-800 text-xs font-mono flex items-center justify-between">
                          <span>{file.path}</span>
                          <span className="text-slate-500">{file.action}</span>
                        </div>
                        <pre className="p-4 text-xs overflow-x-auto max-h-80 overflow-y-auto">
                          <code>{file.content.slice(0, 3000)}</code>
                        </pre>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer / Action */}
        <div className="p-6 border-t border-slate-800">
          {prUrl ? (
            <div className="text-center space-y-2">
              <div className="text-green-400 font-semibold">PR created! 🎉</div>
              <a
                href={prUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#A78BFA] hover:text-[#C4B5FD] underline"
              >
                {prUrl}
              </a>
            </div>
          ) : (
            <button
              onClick={handlePickThis}
              disabled={creatingPR}
              className="w-full py-3 bg-gradient-to-r from-[#E879F9] via-[#A78BFA] to-[#60A5FA] hover:brightness-110 text-black rounded-lg font-semibold disabled:opacity-50"
            >
              {creatingPR
                ? 'Creating PR...'
                : `🎉 Pick ${persona.name} — Create PR`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
