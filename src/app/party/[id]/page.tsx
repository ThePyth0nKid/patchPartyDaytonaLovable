'use client'

import { use, useEffect, useRef, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import { ArrowLeft, ExternalLink, X, Code2, Monitor, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react'
import { PERSONAS, PHILOSOPHY_PERSONAS, PersonaId } from '@/lib/personas'
import { Party, AgentState, PartyStreamEvent } from '@/lib/types'

const PERSONA_ACCENTS: Record<string, string> = {
  hackfix: '#FF6B35',
  craftsman: '#14B8A6',
  'ux-king': '#E879F9',
  defender: '#60A5FA',
  innovator: '#A78BFA',
}

function Spinner({ className = '', color = 'currentColor' }: { className?: string; color?: string }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Loading"
    >
      <circle cx="12" cy="12" r="9" stroke={color} strokeOpacity="0.2" strokeWidth="2" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function PreviewFrame({
  src,
  title,
  accent,
  icon: Icon,
}: {
  src: string
  title: string
  accent: string
  icon: LucideIcon
}) {
  const [loaded, setLoaded] = useState(false)
  const [timedOut, setTimedOut] = useState(false)

  useEffect(() => {
    setLoaded(false)
    setTimedOut(false)
    const t = setTimeout(() => setTimedOut(true), 20000)
    return () => clearTimeout(t)
  }, [src])

  return (
    <div className="relative bg-slate-950 rounded-[7px] overflow-hidden border border-slate-800 h-[600px]">
      <iframe
        src={src}
        title={title}
        onLoad={() => setLoaded(true)}
        className={`w-full h-full bg-white transition-opacity duration-500 ease-linear ${
          loaded ? 'opacity-100' : 'opacity-0'
        }`}
      />
      {!loaded && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-slate-950">
          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `radial-gradient(ellipse 60% 40% at 50% 50%, ${accent}25, transparent 60%)`,
            }}
          />
          <Icon
            className="w-12 h-12 relative animate-pulse-slow"
            strokeWidth={1.5}
            style={{ color: accent, filter: `drop-shadow(0 0 20px ${accent})` }}
          />
          <div className="relative flex items-center gap-2 text-[12px] font-mono uppercase tracking-[0.2em] text-slate-200">
            <Spinner className="w-3.5 h-3.5" color={accent} />
            {timedOut ? 'Sandbox taking its time…' : 'Warming up sandbox'}
          </div>
          <div className="relative flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="h-1 w-6 rounded-full animate-pulse"
                style={{
                  background: accent,
                  opacity: 0.25,
                  animationDelay: `${i * 0.15}s`,
                }}
              />
            ))}
          </div>
          {timedOut && (
            <div className="relative text-[11px] font-mono text-slate-400 max-w-xs text-center px-4">
              Preview takes ~15–30s on first load — Next.js needs to install deps inside the sandbox.
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function BrandMark() {
  return (
    <span
      aria-hidden
      className="relative inline-flex w-7 h-7 items-center justify-center rounded-[7px] border border-slate-800 bg-slate-900/60 backdrop-blur overflow-hidden"
    >
      <span
        className="absolute inset-0 opacity-70"
        style={{
          background:
            'conic-gradient(from 210deg at 50% 50%, #FF6B35, #E879F9, #A78BFA, #60A5FA, #14B8A6, #FF6B35)',
          filter: 'blur(6px)',
        }}
      />
      <span className="relative text-[11px] font-bold tracking-tighter text-slate-50">
        PP
      </span>
    </span>
  )
}

function encodePreviewTarget(url: string, token?: string): string {
  const json = JSON.stringify(token ? { url, token } : { url })
  return btoa(json).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function collectSandboxIds(party: Party | null): string[] {
  if (!party) return []
  return Object.values(party.agents)
    .map((a) => a?.result?.sandboxId)
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
          | PartyStreamEvent
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
      <main className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-50">
        <div className="flex flex-col items-center gap-5">
          <div className="flex gap-2">
            {PHILOSOPHY_PERSONAS.map((p, i) => {
              const Icon = p.icon
              const accent = PERSONA_ACCENTS[p.color]
              return (
                <Icon
                  key={p.id}
                  className="w-7 h-7 animate-pulse-slow"
                  strokeWidth={1.5}
                  style={{
                    color: accent,
                    animationDelay: `${i * 0.18}s`,
                    filter: `drop-shadow(0 0 10px ${accent})`,
                  }}
                />
              )
            })}
          </div>
          <div className="text-[11px] font-mono uppercase tracking-[0.2em] text-slate-500">
            Booting party…
          </div>
        </div>
      </main>
    )
  }

  const activeAgents = Object.values(party.agents).filter(
    (a): a is AgentState => !!a,
  )
  const teamSize = activeAgents.length || 5
  const doneCount = activeAgents.filter((a) => a.status === 'done').length
  const teamPersonas = (party.classification?.selectedPersonas ?? []).map(
    (id) => PERSONAS.find((p) => p.id === id)!,
  ).filter(Boolean)

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      {/* Top Nav */}
      <header className="sticky top-0 z-40 border-b border-slate-800/60 bg-slate-950/70 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2.5 group">
            <ArrowLeft className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-50 transition-colors" />
            <BrandMark />
            <span className="font-semibold tracking-tight text-[15px]">PatchParty</span>
          </a>
          <div className="flex items-center gap-4 text-[12px] font-mono uppercase tracking-[0.15em]">
            <span className="flex items-center gap-1.5 text-slate-500">
              <span className={`relative flex h-1.5 w-1.5`}>
                {connected && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#14B8A6] opacity-75" />
                )}
                <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${connected ? 'bg-[#14B8A6]' : 'bg-slate-600'}`} />
              </span>
              {connected ? 'Live' : 'Disconnected'}
            </span>
          </div>
        </div>
      </header>

      {/* Header / Progress */}
      <section className="border-b border-slate-800/60">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-[12px] font-mono font-semibold uppercase tracking-[0.2em] text-[#A78BFA] drop-shadow-[0_0_8px_#A78BFA80]">
              Party in progress
            </span>
            <span className="h-px flex-1 bg-gradient-to-r from-[#A78BFA40] via-slate-700 to-transparent" />
            <span className="text-[12px] font-mono font-semibold uppercase tracking-[0.2em] text-slate-200">
              {doneCount} / {teamSize} done
            </span>
          </div>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5">
            <div className="min-w-0">
              <h1 className="text-2xl md:text-3xl font-semibold tracking-[-0.02em] truncate text-slate-50">
                {party.issueTitle}
              </h1>
              <a
                href={party.issueUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1.5 inline-flex items-center gap-1.5 text-[12px] font-mono text-slate-300 hover:text-slate-50 transition-colors"
              >
                {party.repoOwner}/{party.repoName}
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="w-full md:w-72">
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden shadow-[inset_0_1px_2px_rgba(0,0,0,0.4)]">
                <div
                  className="h-full bg-gradient-to-r from-[#E879F9] via-[#A78BFA] to-[#60A5FA] transition-all duration-700 ease-linear shadow-[0_0_12px_rgba(167,139,250,0.6)]"
                  style={{ width: `${(doneCount / teamSize) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Orchestrator banner — visible for every party that was classified */}
      {party.classification && teamPersonas.length > 0 && (
        <section className="border-b border-slate-800/60">
          <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col md:flex-row md:items-center gap-3 md:gap-6">
            <div className="flex items-center gap-2 text-[12px] font-mono font-semibold uppercase tracking-[0.2em] text-[#A78BFA]">
              <Sparkles className="w-3.5 h-3.5 drop-shadow-[0_0_6px_#A78BFA]" />
              {party.classification.squadId
                ? `${party.classification.squadId} squad`
                : 'Orchestrator'}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[12px] text-slate-100">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900/80 border border-slate-700 font-mono font-medium">
                {party.classification.type}
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900/80 border border-slate-700 font-mono font-medium">
                {party.classification.complexity}
              </span>
              {party.classification.concerns.slice(0, 3).map((c) => (
                <span
                  key={c}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900/80 border border-slate-700 font-mono font-medium"
                >
                  {c}
                </span>
              ))}
              <span className="text-slate-300 italic hidden md:inline">
                · {party.classification.reason}
              </span>
            </div>
            <div className="md:ml-auto flex items-center gap-1.5">
              {teamPersonas.map((p) => {
                const Icon = p.icon
                const accent = PERSONA_ACCENTS[p.color]
                return (
                  <Icon
                    key={p.id}
                    aria-label={`${p.name} — ${p.tagline}`}
                    className="w-5 h-5"
                    strokeWidth={1.75}
                    style={{ color: accent, filter: `drop-shadow(0 0 6px ${accent})` }}
                  />
                )
              })}
            </div>
          </div>
          {/* Classifier reason on small screens */}
          <div className="md:hidden max-w-7xl mx-auto px-6 pb-3 text-[12px] text-slate-300 italic">
            {party.classification.reason}
          </div>
        </section>
      )}

      {/* Agents grid — renders exactly the team the orchestrator picked */}
      <section className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          {activeAgents.map((agent) => {
            const persona = PERSONAS.find((p) => p.id === agent.persona)
            if (!persona) return null
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
      </section>

      {/* Compare modal — open as soon as the clicked agent is done */}
      {selectedPersona && (
        <ComparePanel
          party={party}
          selectedPersona={selectedPersona}
          onClose={() => setSelectedPersona(null)}
        />
      )}
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
  const accent = PERSONA_ACCENTS[persona.color]
  const PersonaIcon = persona.icon

  const isDone = agent.status === 'done'
  const isError = agent.status === 'error'
  const isRunning = !isDone && !isError && agent.status !== 'queued'
  const hasPreview = isDone && agent.result?.previewUrl

  return (
    <div
      onClick={onSelect}
      className={`
        group relative bg-slate-900/70 backdrop-blur border rounded-[7px] p-5 transition-all duration-200 ease-linear overflow-hidden
        ${selected ? 'border-transparent' : 'border-slate-700/80 hover:border-slate-600'}
        ${isDone ? 'cursor-pointer hover:-translate-y-1' : ''}
      `}
      style={{
        boxShadow: selected
          ? `0 0 0 1px ${accent}, 0 0 48px -8px ${accent}, inset 0 1px 0 rgba(255,255,255,0.04)`
          : 'inset 0 1px 0 rgba(255,255,255,0.03)',
        ['--glow' as string]: accent,
      }}
    >
      {/* accent hairline */}
      <div
        className="absolute inset-x-0 top-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }}
      />
      {/* hover orb */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{ background: `radial-gradient(circle at 50% 0%, ${accent}22, transparent 60%)` }}
      />

      <div className="flex items-start gap-3 mb-4 relative">
        <PersonaIcon
          className={`w-6 h-6 shrink-0 transition-[filter] duration-200 ${isRunning ? 'animate-pulse' : ''}`}
          strokeWidth={1.75}
          style={{
            color: accent,
            filter: `drop-shadow(0 0 ${isRunning || selected ? 14 : 6}px ${accent})`,
          }}
        />
        <div className="flex-1 min-w-0">
          <div
            className="font-semibold text-[14px] tracking-[-0.01em]"
            style={{ color: accent, textShadow: `0 0 20px ${accent}40` }}
          >
            {persona.name}
          </div>
          <div className="text-[10px] font-mono font-semibold uppercase tracking-[0.16em] text-slate-300 mt-0.5">
            {persona.tagline}
          </div>
        </div>
        {hasPreview && (
          <span className="text-[9px] font-mono font-semibold uppercase tracking-[0.15em] px-2 py-0.5 bg-[#14B8A6]/15 text-[#14B8A6] border border-[#14B8A6]/40 rounded-full shadow-[0_0_12px_-2px_#14B8A6]">
            Live
          </span>
        )}
      </div>

      {/* status strip */}
      <div className="flex items-start gap-2 text-[12px] mb-2 relative">
        {isError ? (
          <AlertCircle className="w-3.5 h-3.5 text-red-400 mt-0.5 shrink-0 drop-shadow-[0_0_6px_#f87171]" />
        ) : isDone ? (
          <CheckCircle2 className="w-3.5 h-3.5 text-[#14B8A6] mt-0.5 shrink-0 drop-shadow-[0_0_6px_#14B8A6]" />
        ) : isRunning ? (
          <Spinner className="w-3.5 h-3.5 mt-0.5 shrink-0" color={accent} />
        ) : (
          <span className="relative flex h-1.5 w-1.5 mt-1.5 shrink-0 opacity-60">
            <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: accent }} />
          </span>
        )}
        <span
          className={
            isError ? 'text-red-300' : isDone ? 'text-slate-100' : 'text-slate-200'
          }
        >
          {agent.message}
        </span>
      </div>

      {isError && agent.error && (
        <details className="mt-2 mb-2 text-[11px] text-slate-400 relative group/details">
          <summary className="cursor-pointer select-none text-[10px] font-mono uppercase tracking-[0.16em] text-red-300/80 hover:text-red-300">
            Show technical details
          </summary>
          <pre className="mt-2 p-3 bg-slate-950/60 border border-red-400/20 rounded-[5px] text-[11px] font-mono text-red-200/90 whitespace-pre-wrap break-words max-h-48 overflow-auto">
            {agent.error}
          </pre>
        </details>
      )}

      {agent.stats.filesChanged > 0 && (
        <div className="text-[11px] font-mono text-slate-400 relative">
          {agent.stats.filesChanged} files · <span className="text-[#14B8A6]">+{agent.stats.linesAdded}</span> / <span className="text-red-300">−{agent.stats.linesRemoved}</span>
        </div>
      )}

      {isDone && agent.result?.summary && (
        <div className="mt-4 pt-4 border-t border-slate-800 text-[12px] text-slate-200 leading-relaxed line-clamp-3 relative">
          {agent.result.summary}
        </div>
      )}

      {isDone && (
        <div
          className="mt-4 pt-3 border-t border-slate-800 text-[11px] font-mono font-semibold uppercase tracking-[0.18em] flex items-center justify-between relative"
          style={{ color: accent }}
        >
          <span>Inspect</span>
          <span className="transition-transform group-hover:translate-x-0.5">→</span>
        </div>
      )}
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
  const PersonaIcon = persona.icon
  const team = party.classification?.selectedPersonas ?? []
  const candidateIndex = Math.max(0, team.indexOf(selectedPersona)) + 1
  const teamSize = team.length || Object.keys(party.agents).length
  const [creatingPR, setCreatingPR] = useState(false)
  const [prUrl, setPrUrl] = useState<string | null>(null)
  if (!agent) return null
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

  const accent = PERSONA_ACCENTS[persona.color]

  return (
    <div
      className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="relative bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-[7px] max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-linear-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Accent hairline */}
        <div
          className="absolute inset-x-0 top-0 h-px"
          style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }}
        />

        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800/60 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <PersonaIcon
              className="w-7 h-7 shrink-0"
              strokeWidth={1.75}
              style={{ color: accent, filter: `drop-shadow(0 0 18px ${accent})` }}
            />
            <div>
              <div className="flex items-baseline gap-2">
                <div
                  className="text-xl font-semibold tracking-[-0.01em]"
                  style={{ color: accent, textShadow: `0 0 24px ${accent}60` }}
                >
                  {persona.name}
                </div>
                <span className="text-[11px] font-mono font-semibold uppercase tracking-[0.18em] text-slate-200">
                  {persona.tagline}
                </span>
              </div>
              <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                Candidate #{candidateIndex} / {teamSize}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-[7px] border border-slate-700 text-slate-300 hover:text-slate-50 hover:border-slate-600 hover:bg-slate-800/50 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* View Toggle */}
        {hasPreview && (
          <div className="px-6 pt-4 flex items-center gap-3 flex-wrap">
            <div className="flex bg-slate-950 border border-slate-700 rounded-[7px] p-0.5">
              <button
                onClick={() => setView('preview')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] rounded-[5px] transition-colors ease-linear ${
                  view === 'preview'
                    ? 'bg-slate-50 text-slate-950 font-semibold'
                    : 'text-slate-200 hover:text-slate-50 hover:bg-slate-800/50'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                Live Preview
              </button>
              <button
                onClick={() => setView('code')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] rounded-[5px] transition-colors ease-linear ${
                  view === 'code'
                    ? 'bg-slate-50 text-slate-950 font-semibold'
                    : 'text-slate-200 hover:text-slate-50 hover:bg-slate-800/50'
                }`}
              >
                <Code2 className="w-3.5 h-3.5" />
                Code
              </button>
            </div>
            {view === 'preview' && agent.result?.previewUrl && (
              <a
                href={agent.result.previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto inline-flex items-center gap-1.5 text-[11px] font-mono text-slate-300 hover:text-slate-50 truncate max-w-[360px] transition-colors"
              >
                <span className="inline-flex h-1.5 w-1.5 rounded-full bg-[#14B8A6] shadow-[0_0_8px_#14B8A6]" />
                Live in Daytona
                <span className="truncate text-slate-400">· {agent.result.previewUrl}</span>
                <ExternalLink className="w-3 h-3 shrink-0" />
              </a>
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {agent.result && (
            <>
              {/* Summary always visible */}
              <div className="bg-slate-950/80 border border-slate-700 rounded-[7px] p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-3.5 h-3.5" style={{ color: accent, filter: `drop-shadow(0 0 6px ${accent})` }} />
                  <div className="text-[11px] font-mono font-semibold uppercase tracking-[0.18em] text-slate-200">
                    Summary
                  </div>
                </div>
                <div className="text-[14px] text-slate-100 leading-relaxed">
                  {agent.result.summary}
                </div>
              </div>

              {view === 'preview' && agent.result.previewUrl && (
                <PreviewFrame
                  src={`/api/preview/${encodePreviewTarget(agent.result.previewUrl, agent.result.previewToken)}/`}
                  title={`${persona.name} live preview`}
                  accent={accent}
                  icon={persona.icon}
                />
              )}

              {view === 'code' && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="text-[11px] font-mono font-semibold uppercase tracking-[0.18em] text-slate-200">
                      {agent.result.files.length} files changed
                    </div>
                    <span className="h-px flex-1 bg-slate-700" />
                  </div>
                  <div className="space-y-2">
                    {agent.result.files.map((file, idx) => (
                      <div
                        key={idx}
                        className="bg-slate-950/80 border border-slate-700 rounded-[7px] overflow-hidden"
                      >
                        <div className="px-4 py-2 border-b border-slate-700 text-[12px] font-mono flex items-center justify-between">
                          <span className="text-slate-100 truncate font-medium">{file.path}</span>
                          <span
                            className="text-[10px] font-semibold uppercase tracking-[0.18em] px-2 py-0.5 rounded-full border"
                            style={{
                              color: file.action === 'create' ? '#14B8A6' : '#A78BFA',
                              borderColor: file.action === 'create' ? 'rgba(20,184,166,0.4)' : 'rgba(167,139,250,0.4)',
                              background: file.action === 'create' ? 'rgba(20,184,166,0.12)' : 'rgba(167,139,250,0.12)',
                              boxShadow: file.action === 'create' ? '0 0 12px -4px #14B8A6' : '0 0 12px -4px #A78BFA',
                            }}
                          >
                            {file.action}
                          </span>
                        </div>
                        <pre className="p-4 text-[12px] font-mono leading-relaxed overflow-x-auto max-h-80 overflow-y-auto text-slate-200">
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
        <div className="px-6 py-5 border-t border-slate-800/60">
          {prUrl ? (
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-2 text-[#14B8A6]">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-[13px] font-semibold">Pull request opened</span>
              </div>
              <a
                href={prUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[13px] font-mono text-[#A78BFA] hover:text-[#C4B5FD] transition-colors"
              >
                {prUrl}
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          ) : (
            <button
              onClick={handlePickThis}
              disabled={creatingPR}
              className="w-full py-3.5 bg-gradient-to-r from-[#E879F9] via-[#A78BFA] to-[#60A5FA] hover:brightness-110 text-black rounded-[7px] font-semibold text-[14px] disabled:opacity-70 disabled:cursor-not-allowed transition-all ease-linear duration-200 shadow-[0_8px_32px_-8px_rgba(167,139,250,0.6)] hover:shadow-[0_12px_40px_-8px_rgba(167,139,250,0.8)] inline-flex items-center justify-center gap-2"
            >
              {creatingPR ? (
                <>
                  <Spinner className="w-4 h-4" color="#000" />
                  Opening pull request…
                </>
              ) : (
                `Pick ${persona.name} — open PR`
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
