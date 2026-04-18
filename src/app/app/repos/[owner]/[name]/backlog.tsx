'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CircleDot, MessageSquare, Rocket, Search, Trash2, X } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'
import type { IssueSummary } from '@/app/api/github/repos/[owner]/[repo]/issues/route'

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

export function RepoBacklog({ owner, name }: { owner: string; name: string }) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const debounced = useDebouncedValue(query, 220)
  const [issues, setIssues] = useState<IssueSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [launching, setLaunching] = useState<number | null>(null)
  const [deactivating, setDeactivating] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    const qs = new URLSearchParams({ state: 'open' })
    if (debounced) qs.set('search', debounced)
    fetch(`/api/github/repos/${owner}/${name}/issues?${qs.toString()}`)
      .then(async (r) => {
        if (!r.ok) {
          const data = (await r.json().catch(() => ({}))) as { error?: string }
          throw new Error(data.error ?? `Failed (${r.status})`)
        }
        return r.json() as Promise<{ issues: IssueSummary[] }>
      })
      .then((data) => {
        if (cancelled) return
        setIssues(data.issues)
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setError(e instanceof Error ? e.message : 'Failed to load issues')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [debounced, owner, name])

  async function launch(issue: IssueSummary) {
    setLaunching(issue.number)
    setError(null)
    try {
      const res = await fetch('/api/party/start', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ issueUrl: issue.htmlUrl }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string; detail?: string }
        throw new Error(data.detail ?? data.error ?? `Failed (${res.status})`)
      }
      const data = (await res.json()) as { partyId: string }
      router.push(`/party/${data.partyId}`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to launch')
      setLaunching(null)
    }
  }

  async function deactivate() {
    if (!confirm(`Remove ${owner}/${name} from active repos? Your parties stay.`)) return
    setDeactivating(true)
    try {
      const res = await fetch(`/api/repos/active/${owner}/${name}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed')
      router.push('/app/repos')
    } catch {
      setError('Deactivation failed')
      setDeactivating(false)
    }
  }

  return (
    <div className="mt-10">
      <div className="flex items-center justify-between gap-3 mb-5">
        <h2 className="text-xl font-semibold tracking-tight">Open issues</h2>
        <button
          type="button"
          onClick={deactivate}
          disabled={deactivating}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[5px] border border-slate-800 hover:border-rose-500/50 hover:text-rose-300 text-[11px] font-mono uppercase tracking-[0.14em] text-slate-400 disabled:opacity-50"
        >
          <Trash2 className="w-3 h-3" />
          Remove from active
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter issues by title or body…"
          className="w-full pl-10 pr-4 py-3 rounded-[10px] border border-slate-800 bg-slate-900/60 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-slate-600"
        />
      </div>

      {error && (
        <div className="mt-5 rounded-[10px] border border-rose-900/60 bg-rose-950/30 p-4 text-[13px] text-rose-200 flex items-start justify-between gap-3">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="mt-5 rounded-[10px] border border-slate-800 bg-slate-900/40 overflow-hidden divide-y divide-slate-800/60">
        {loading && !issues && (
          <>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="px-5 py-4">
                <div className="h-3 w-2/3 bg-slate-800/80 rounded animate-pulse" />
                <div className="mt-2 h-2.5 w-1/2 bg-slate-800/60 rounded animate-pulse" />
              </div>
            ))}
          </>
        )}
        {issues && issues.length === 0 && !loading && (
          <div className="p-10 text-center text-slate-400 text-[13px]">
            No open issues. Nothing to party about here yet.
          </div>
        )}
        {issues?.map((issue) => (
          <div
            key={issue.number}
            className="px-5 py-4 flex items-start justify-between gap-4 hover:bg-slate-900/70 transition-colors"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <CircleDot className="w-3.5 h-3.5 text-[#14B8A6] shrink-0" />
                <span className="font-mono text-[11px] text-slate-500">#{issue.number}</span>
                <h3 className="text-[14px] text-slate-100 truncate font-medium">{issue.title}</h3>
              </div>
              <div className="mt-1.5 flex items-center gap-3 text-[11px] font-mono text-slate-500">
                {issue.author && <span>by {issue.author}</span>}
                {issue.commentsCount > 0 && (
                  <span className="flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" />
                    {issue.commentsCount}
                  </span>
                )}
                {issue.labels.slice(0, 3).map((l) => (
                  <span
                    key={l.name}
                    className="px-1.5 py-0.5 rounded-full border text-[10px]"
                    style={{
                      borderColor: `#${l.color}80`,
                      color: `#${l.color}`,
                      background: `#${l.color}15`,
                    }}
                  >
                    {l.name}
                  </span>
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={() => launch(issue)}
              disabled={launching !== null}
              className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[7px] bg-gradient-to-r from-[#E879F9] via-[#A78BFA] to-[#60A5FA] text-black font-semibold text-[12px] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {launching === issue.number ? (
                <>
                  <Spinner className="w-3.5 h-3.5 text-black" />
                  Launching
                </>
              ) : (
                <>
                  <Rocket className="w-3.5 h-3.5" />
                  Party
                </>
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
