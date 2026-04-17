'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PERSONAS } from '@/lib/personas'

export default function HomePage() {
  const router = useRouter()
  const [issueUrl, setIssueUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function startParty() {
    if (!issueUrl.trim()) {
      setError('Paste a GitHub issue URL.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/party/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issueUrl }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to start party')
      }
      const { partyId } = await res.json()
      router.push(`/party/${partyId}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something broke')
      setLoading(false)
    }
  }

  const personaAccents: Record<string, string> = {
    hackfix: '#FF6B35',
    craftsman: '#14B8A6',
    'ux-king': '#E879F9',
    defender: '#60A5FA',
    innovator: '#A78BFA',
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-950 text-slate-50">
      <div className="max-w-3xl w-full space-y-10">
        {/* Hero */}
        <div className="text-center space-y-5">
          <div className="flex justify-center gap-4 text-4xl">
            {PERSONAS.map((p) => (
              <span
                key={p.id}
                className="animate-pulse-slow drop-shadow-[0_0_12px_var(--glow)]"
                style={{
                  animationDelay: `${PERSONAS.indexOf(p) * 0.3}s`,
                  ['--glow' as string]: personaAccents[p.color],
                }}
              >
                {p.icon}
              </span>
            ))}
          </div>
          <h1 className="text-6xl font-semibold tracking-tight bg-gradient-to-b from-slate-50 to-slate-400 bg-clip-text text-transparent">
            PatchParty
          </h1>
          <p className="text-xl text-slate-300">
            Choose your patch. Skip the vibe.
          </p>
          <p className="text-sm text-slate-400 max-w-xl mx-auto leading-relaxed">
            Five parallel AI agents implement your GitHub issue — each with a
            different philosophy. You pick the winner. One click to PR.
          </p>
        </div>

        {/* Input */}
        <div className="bg-slate-900/60 backdrop-blur border border-slate-800 rounded-[7px] p-6 space-y-4 shadow-linear-xl">
          <label className="block text-sm font-medium text-slate-300">
            Paste a GitHub issue URL
          </label>
          <input
            type="url"
            placeholder="https://github.com/user/repo/issues/123"
            value={issueUrl}
            onChange={(e) => setIssueUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && startParty()}
            disabled={loading}
            className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-[7px] text-slate-50 placeholder-slate-600 font-mono text-sm focus:outline-none focus:border-[#A78BFA] focus:ring-1 focus:ring-[#A78BFA]/40 transition-all ease-linear duration-200"
          />
          {error && <div className="text-red-400 text-sm">{error}</div>}
          <button
            onClick={startParty}
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-[#E879F9] via-[#A78BFA] to-[#60A5FA] hover:brightness-110 rounded-[7px] font-semibold text-black disabled:opacity-50 disabled:cursor-not-allowed transition-all ease-linear duration-200"
          >
            {loading ? 'Starting party...' : "Let's Party 🎉"}
          </button>
        </div>

        {/* Persona preview */}
        <div className="grid grid-cols-5 gap-2">
          {PERSONAS.map((p) => (
            <div
              key={p.id}
              className="group text-center p-3 bg-slate-900/60 backdrop-blur border border-slate-800 rounded-[7px] transition-all ease-linear duration-200 hover:-translate-y-0.5"
              style={{
                ['--glow' as string]: personaAccents[p.color],
              }}
            >
              <div className="text-2xl mb-1 transition-[filter] duration-200 group-hover:drop-shadow-[0_0_10px_var(--glow)]">
                {p.icon}
              </div>
              <div className="text-xs font-semibold" style={{ color: personaAccents[p.color] }}>
                {p.name}
              </div>
              <div className="text-[10px] text-slate-500 italic">
                {p.tagline}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
