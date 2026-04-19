'use client'

import { useState } from 'react'
import { Key, CheckCircle2, Loader2, Trash2, RotateCcw, ShieldCheck } from 'lucide-react'
import { Hairline } from '@/components/ui/hairline'

interface KeyInfo {
  hasKey: boolean
  fingerprint?: string
  validatedAt?: string | Date | null
  lastUsedAt?: string | Date | null
  preferredKeyMode: 'MANAGED' | 'BYOK'
}

interface ByokCardProps {
  initial: KeyInfo
}

function formatDate(d: string | Date | null | undefined): string {
  if (!d) return '—'
  const date = typeof d === 'string' ? new Date(d) : d
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function ByokCard({ initial }: ByokCardProps) {
  const [info, setInfo] = useState<KeyInfo>(initial)
  const [keyInput, setKeyInput] = useState('')
  const [status, setStatus] = useState<
    | { kind: 'idle' }
    | { kind: 'validating' }
    | { kind: 'saving' }
    | { kind: 'error'; message: string }
    | { kind: 'saved' }
  >({ kind: 'idle' })
  const [replacing, setReplacing] = useState(false)

  async function handleSave() {
    if (!keyInput.trim()) return
    setStatus({ kind: 'saving' })
    try {
      const res = await fetch('/api/byok', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          key: keyInput.trim(),
          preferredKeyMode: 'BYOK',
        }),
      })
      const data = await res.json()
      if (!res.ok || data.ok === false) {
        setStatus({
          kind: 'error',
          message: data.error ?? 'Failed to save key.',
        })
        return
      }
      setInfo({
        hasKey: true,
        fingerprint: data.fingerprint,
        validatedAt: data.validatedAt,
        lastUsedAt: data.lastUsedAt,
        preferredKeyMode: data.preferredKeyMode,
      })
      setKeyInput('')
      setReplacing(false)
      setStatus({ kind: 'saved' })
      // Keep the success banner up for 8s — long enough that the proof is
      // unmistakable, short enough to clear on its own. Before: 2.5s, which
      // users reported missing entirely.
      setTimeout(() => setStatus({ kind: 'idle' }), 8000)
    } catch (error) {
      setStatus({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Network error',
      })
    }
  }

  async function handleDelete() {
    if (!confirm('Remove your Anthropic key? You will fall back to the managed tier.'))
      return
    const res = await fetch('/api/byok', { method: 'DELETE' })
    if (res.ok) {
      setInfo({ hasKey: false, preferredKeyMode: 'MANAGED' })
    }
  }

  async function handleModeToggle(newMode: 'MANAGED' | 'BYOK') {
    if (!info.hasKey && newMode === 'BYOK') return
    const prev = info.preferredKeyMode
    setInfo({ ...info, preferredKeyMode: newMode })
    try {
      const res = await fetch('/api/byok', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ preferredKeyMode: newMode }),
      })
      if (!res.ok) setInfo({ ...info, preferredKeyMode: prev })
    } catch {
      setInfo({ ...info, preferredKeyMode: prev })
    }
  }

  const canToggleMode = info.hasKey

  return (
    <div className="mt-6 relative rounded-[10px] border border-slate-800 bg-slate-900/60 p-7 overflow-hidden">
      <Hairline className="absolute inset-x-0 top-0" />
      <div className="text-[11px] font-mono font-medium uppercase tracking-[0.18em] text-slate-400 flex items-center gap-1.5">
        <Key className="w-3.5 h-3.5" /> Anthropic API key · BYOK
      </div>

      {info.hasKey && !replacing ? (
        <div className="mt-4 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="font-semibold tracking-tight font-mono text-sm">
                sk-ant-••••{info.fingerprint?.slice(-8) ?? '••••••••'}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-400/10 border border-emerald-400/40 text-emerald-300 text-[10px] font-mono font-semibold uppercase tracking-[0.14em]">
                <CheckCircle2 className="w-3 h-3" /> Validated
              </span>
            </div>
            <div className="mt-2 text-[12px] font-mono text-slate-400 space-y-0.5">
              <div>
                <span className="text-slate-500">Tested against Anthropic API at</span>{' '}
                <span className="text-emerald-300">{formatDate(info.validatedAt)}</span>
              </div>
              <div>
                <span className="text-slate-500">Last used</span>{' '}
                {formatDate(info.lastUsedAt)}
              </div>
              <div className="flex items-center gap-1 mt-1 text-slate-500">
                <ShieldCheck className="w-3 h-3" />
                Encrypted at rest · AES-256-GCM
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setReplacing(true)}
              className="px-3 py-1.5 rounded-[7px] border border-slate-700 hover:border-slate-500 text-[12.5px] flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Replace
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="px-3 py-1.5 rounded-[7px] border border-rose-900/50 text-rose-300 hover:border-rose-700 text-[12.5px] flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" /> Remove
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <p className="text-[12.5px] text-slate-400 max-w-xl">
            Paste your Anthropic key to run parties without hitting the managed
            rate-limit. Your key is encrypted at rest with AES-256-GCM and never
            leaves the server.
          </p>
          <div className="flex gap-2 items-stretch">
            <input
              type="password"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder="sk-ant-…"
              className="flex-1 px-3 py-2 rounded-[7px] bg-slate-950 border border-slate-800 font-mono text-sm focus:outline-none focus:border-slate-600"
              autoComplete="off"
              spellCheck={false}
            />
            <button
              type="button"
              onClick={handleSave}
              disabled={status.kind === 'saving' || !keyInput.trim()}
              className="px-4 py-2 rounded-[7px] bg-white text-slate-950 font-medium text-[13px] disabled:opacity-50 flex items-center gap-1.5"
            >
              {status.kind === 'saving' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : null}
              Validate &amp; save
            </button>
            {replacing ? (
              <button
                type="button"
                onClick={() => {
                  setReplacing(false)
                  setKeyInput('')
                  setStatus({ kind: 'idle' })
                }}
                className="px-3 py-2 rounded-[7px] border border-slate-700 text-[12.5px]"
              >
                Cancel
              </button>
            ) : null}
          </div>
          {status.kind === 'saving' ? (
            <div className="text-[12.5px] text-slate-300 flex items-center gap-1.5">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Testing key against Anthropic API…
            </div>
          ) : null}
          {status.kind === 'error' ? (
            <div className="text-[12.5px] text-rose-300 flex items-start gap-1.5 p-3 rounded-[5px] bg-rose-950/40 border border-rose-900/50">
              <span className="flex-1">{status.message}</span>
            </div>
          ) : null}
          {status.kind === 'saved' ? (
            <div className="text-[13px] text-emerald-200 flex items-start gap-2 p-3 rounded-[5px] bg-emerald-950/30 border border-emerald-500/40">
              <CheckCircle2 className="w-4 h-4 mt-0.5 text-emerald-300 shrink-0" />
              <div className="space-y-0.5">
                <div className="font-semibold text-emerald-100">
                  Key validated — Anthropic confirmed it works.
                </div>
                <div className="text-[11px] text-emerald-200/80 font-mono">
                  Encrypted with AES-256-GCM · Mode set to BYOK
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {info.hasKey ? (
        <div className="mt-5 pt-5 border-t border-slate-800/80">
          <div className="text-[11px] font-mono font-medium uppercase tracking-[0.18em] text-slate-400 mb-3">
            Key mode
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!canToggleMode}
              onClick={() => handleModeToggle('MANAGED')}
              className={`px-3 py-1.5 rounded-[7px] border text-[12.5px] ${
                info.preferredKeyMode === 'MANAGED'
                  ? 'border-white bg-white/10'
                  : 'border-slate-700 hover:border-slate-500'
              }`}
            >
              Managed (rate-limited)
            </button>
            <button
              type="button"
              disabled={!canToggleMode}
              onClick={() => handleModeToggle('BYOK')}
              className={`px-3 py-1.5 rounded-[7px] border text-[12.5px] ${
                info.preferredKeyMode === 'BYOK'
                  ? 'border-white bg-white/10'
                  : 'border-slate-700 hover:border-slate-500'
              }`}
            >
              My key (unlimited)
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
