'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Lock, Search, Star, Unlock } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'
import type { RepoSummary } from '@/app/api/github/repos/route'

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

export function AddRepoPicker() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const debounced = useDebouncedValue(query, 220)
  const [repos, setRepos] = useState<RepoSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [activating, setActivating] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    const qs = debounced ? `?search=${encodeURIComponent(debounced)}` : ''
    fetch(`/api/github/repos${qs}`)
      .then(async (r) => {
        if (!r.ok) {
          const data = (await r.json().catch(() => ({}))) as { error?: string }
          throw new Error(data.error ?? `Failed (${r.status})`)
        }
        return r.json() as Promise<{ repos: RepoSummary[] }>
      })
      .then((data) => {
        if (cancelled) return
        setRepos(data.repos)
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setError(e instanceof Error ? e.message : 'Failed to load repos')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [debounced])

  async function activate(repo: RepoSummary) {
    setActivating(repo.fullName)
    setError(null)
    try {
      const res = await fetch('/api/repos/active', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ owner: repo.owner, name: repo.name }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string; detail?: string }
        throw new Error(data.detail ?? data.error ?? `Failed (${res.status})`)
      }
      router.push(`/app/repos/${repo.owner}/${repo.name}`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Activation failed')
      setActivating(null)
    }
  }

  return (
    <div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search your repos…"
          className="w-full pl-10 pr-4 py-3 rounded-[10px] border border-slate-800 bg-slate-900/60 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-slate-600"
        />
      </div>

      {error && (
        <div className="mt-6 rounded-[10px] border border-rose-900/60 bg-rose-950/30 p-4 text-[13px] text-rose-200">
          {error}
        </div>
      )}

      <div className="mt-5 rounded-[10px] border border-slate-800 bg-slate-900/40 overflow-hidden divide-y divide-slate-800/60">
        {loading && !repos && (
          <>
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="px-5 py-4 flex items-center gap-4">
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-1/3 bg-slate-800/80 rounded animate-pulse" />
                  <div className="h-2.5 w-2/3 bg-slate-800/60 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </>
        )}
        {repos && repos.length === 0 && !loading && (
          <div className="p-8 text-center text-slate-400">No repos match. Try a different search.</div>
        )}
        {repos?.map((r) => (
          <button
            key={r.id}
            type="button"
            disabled={activating !== null}
            onClick={() => activate(r)}
            className="w-full text-left px-5 py-4 hover:bg-slate-900/70 transition-colors flex items-center justify-between gap-4 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                {r.private ? (
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                ) : (
                  <Unlock className="w-3.5 h-3.5 text-slate-500" />
                )}
                <span className="font-mono text-[13px] text-slate-100 truncate">{r.fullName}</span>
                {r.private && (
                  <span className="text-[10px] font-mono uppercase tracking-[0.14em] px-1.5 py-0.5 rounded border border-slate-700 text-slate-400">
                    Private
                  </span>
                )}
              </div>
              {r.description && (
                <div className="mt-1 text-[13px] text-slate-400 truncate">{r.description}</div>
              )}
            </div>
            <div className="flex items-center gap-4 text-[12px] font-mono text-slate-500 whitespace-nowrap">
              {r.language && (
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-slate-500" />
                  {r.language}
                </span>
              )}
              {r.stars > 0 && (
                <span className="flex items-center gap-1">
                  <Star className="w-3 h-3" />
                  {r.stars}
                </span>
              )}
              {activating === r.fullName ? (
                <Spinner className="w-4 h-4 text-[#A78BFA]" />
              ) : (
                <ArrowRight className="w-4 h-4 text-slate-600" />
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
