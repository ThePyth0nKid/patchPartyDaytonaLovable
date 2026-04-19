'use client'

import { useState } from 'react'
import { Loader2, Play, PauseCircle, AlertTriangle } from 'lucide-react'
import { csrfFetch } from '@/lib/client-fetch'

interface ResumeCardProps {
  partyId: string
  sandboxState: 'ACTIVE' | 'IDLE_WARN' | 'PAUSED' | 'RESUMING' | 'TERMINATED' | string
  onResumed?: () => void
}

export function ResumeCard({ partyId, sandboxState, onResumed }: ResumeCardProps) {
  const [resuming, setResuming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (sandboxState === 'ACTIVE') return null

  async function handleResume() {
    setResuming(true)
    setError(null)
    try {
      const res = await csrfFetch(`/api/party/${partyId}/resume`, {
        method: 'POST',
      })
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean
        error?: string
      }
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? `resume failed (${res.status})`)
      }
      onResumed?.()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setResuming(false)
    }
  }

  if (sandboxState === 'TERMINATED') {
    return (
      <div className="rounded-[7px] border border-red-500/40 bg-red-500/5 p-4 flex items-start gap-3">
        <AlertTriangle className="w-4 h-4 mt-0.5 text-red-300 shrink-0" />
        <div className="flex-1 text-[13px] text-red-200">
          <div className="font-semibold mb-1">Sandbox terminated</div>
          <div className="text-[12px] text-red-200/80">
            This party was idle for too long and its sandbox was reclaimed.
            The branch is still on GitHub — start a new party if you want to
            keep iterating.
          </div>
        </div>
      </div>
    )
  }

  const isIdleWarn = sandboxState === 'IDLE_WARN'
  const isResumingState = sandboxState === 'RESUMING' || resuming

  return (
    <div className="rounded-[7px] border border-amber-400/30 bg-amber-400/5 p-4 flex items-center gap-3">
      <PauseCircle className="w-5 h-5 text-amber-300 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-[13px] text-amber-100 font-semibold">
          {isIdleWarn
            ? 'Pausing sandbox soon'
            : sandboxState === 'RESUMING'
              ? 'Resuming sandbox…'
              : 'Sandbox paused to save compute'}
        </div>
        <div className="text-[11px] text-amber-100/70 mt-0.5">
          {isIdleWarn
            ? 'Send a message in the next few minutes or the sandbox will pause.'
            : 'Click resume — takes 5–10s to warm back up.'}
        </div>
        {error && (
          <div className="text-[11px] text-red-300 mt-1 font-mono">{error}</div>
        )}
      </div>
      {!isIdleWarn && (
        <button
          onClick={handleResume}
          disabled={isResumingState}
          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[5px] bg-amber-300 text-slate-950 text-[12px] font-semibold uppercase tracking-[0.14em] hover:brightness-95 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isResumingState ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Play className="w-3.5 h-3.5" />
          )}
          {isResumingState ? 'Resuming…' : 'Resume'}
        </button>
      )}
    </div>
  )
}
