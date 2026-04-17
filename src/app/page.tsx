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

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-950 text-white">
      <div className="max-w-3xl w-full space-y-8">
        {/* Hero */}
        <div className="text-center space-y-4">
          <div className="flex justify-center gap-3 text-4xl">
            {PERSONAS.map((p) => (
              <span
                key={p.id}
                className="animate-pulse-slow"
                style={{ animationDelay: `${PERSONAS.indexOf(p) * 0.3}s` }}
              >
                {p.icon}
              </span>
            ))}
          </div>
          <h1 className="text-5xl font-bold tracking-tight">PatchParty</h1>
          <p className="text-xl text-slate-400">
            Choose your patch. Skip the vibe.
          </p>
          <p className="text-sm text-slate-500 max-w-xl mx-auto">
            Five parallel AI agents implement your GitHub issue — each with a
            different philosophy. You pick the winner. One click to PR.
          </p>
        </div>

        {/* Input */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
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
            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
          />
          {error && <div className="text-red-400 text-sm">{error}</div>}
          <button
            onClick={startParty}
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? 'Starting party...' : "Let's Party 🎉"}
          </button>
        </div>

        {/* Persona preview */}
        <div className="grid grid-cols-5 gap-2">
          {PERSONAS.map((p) => (
            <div
              key={p.id}
              className="text-center p-3 bg-slate-900 border border-slate-800 rounded-lg"
            >
              <div className="text-2xl mb-1">{p.icon}</div>
              <div className="text-xs font-semibold">{p.name}</div>
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
