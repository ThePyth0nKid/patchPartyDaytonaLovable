'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  ArrowRight,
  CircleDot,
  GitBranch,
  Lock,
  MessageSquare,
  Rocket,
  Search,
  Star,
  Unlock,
} from 'lucide-react'
import { Hairline } from '@/components/ui/hairline'
import { Spinner } from '@/components/ui/spinner'
import type { RepoSummary } from '@/app/api/github/repos/route'
import type { IssueSummary } from '@/app/api/github/repos/[owner]/[repo]/issues/route'

type Step = 'repo' | 'issue' | 'confirm'

interface WizardProps {
  remaining: number
  dailyLimit: number
  unlimited?: boolean
}

export function NewPartyWizard({
  remaining,
  dailyLimit,
  unlimited = false,
}: WizardProps) {
  const [step, setStep] = useState<Step>('repo')
  const [repo, setRepo] = useState<RepoSummary | null>(null)
  const [issue, setIssue] = useState<IssueSummary | null>(null)

  return (
    <div className="mt-10">
      <Stepper step={step} />

      <div className="mt-8">
        {step === 'repo' && (
          <RepoStep
            onSelect={(r) => {
              setRepo(r)
              setIssue(null)
              setStep('issue')
            }}
          />
        )}

        {step === 'issue' && repo && (
          <IssueStep
            repo={repo}
            onBack={() => setStep('repo')}
            onSelect={(i) => {
              setIssue(i)
              setStep('confirm')
            }}
          />
        )}

        {step === 'confirm' && repo && issue && (
          <ConfirmStep
            repo={repo}
            issue={issue}
            remaining={remaining}
            dailyLimit={dailyLimit}
            unlimited={unlimited}
            onBack={() => setStep('issue')}
          />
        )}
      </div>
    </div>
  )
}

function Stepper({ step }: { step: Step }) {
  const steps: { id: Step; label: string }[] = [
    { id: 'repo', label: 'Repo' },
    { id: 'issue', label: 'Issue' },
    { id: 'confirm', label: 'Launch' },
  ]
  const activeIdx = steps.findIndex((s) => s.id === step)

  return (
    <div className="flex items-center gap-3">
      {steps.map((s, i) => {
        const isActive = i === activeIdx
        const isDone = i < activeIdx
        return (
          <div key={s.id} className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-mono ${
                  isActive
                    ? 'border-[#A78BFA] text-[#A78BFA] bg-[#A78BFA]/10'
                    : isDone
                      ? 'border-[#14B8A6] text-[#14B8A6] bg-[#14B8A6]/10'
                      : 'border-slate-700 text-slate-500'
                }`}
              >
                {i + 1}
              </span>
              <span
                className={`text-[12px] font-mono uppercase tracking-[0.18em] ${
                  isActive
                    ? 'text-slate-100'
                    : isDone
                      ? 'text-slate-300'
                      : 'text-slate-500'
                }`}
              >
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <span
                className={`inline-block h-px w-12 ${
                  i < activeIdx ? 'bg-[#14B8A6]/60' : 'bg-slate-800'
                }`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

function RepoStep({ onSelect }: { onSelect: (r: RepoSummary) => void }) {
  const [query, setQuery] = useState('')
  const debounced = useDebouncedValue(query, 220)
  const [repos, setRepos] = useState<RepoSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

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
        {loading && !repos && <RepoSkeletons />}
        {repos && repos.length === 0 && !loading && (
          <div className="p-8 text-center text-slate-400">
            No repos match. Try a different search.
          </div>
        )}
        {repos?.map((r) => <RepoRow key={r.id} repo={r} onSelect={onSelect} />)}
      </div>
    </div>
  )
}

function RepoRow({
  repo,
  onSelect,
}: {
  repo: RepoSummary
  onSelect: (r: RepoSummary) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(repo)}
      className="w-full text-left px-5 py-4 hover:bg-slate-900/70 transition-colors flex items-center justify-between gap-4"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {repo.private ? (
            <Lock className="w-3.5 h-3.5 text-slate-400" />
          ) : (
            <Unlock className="w-3.5 h-3.5 text-slate-500" />
          )}
          <span className="font-mono text-[13px] text-slate-100 truncate">
            {repo.fullName}
          </span>
          {repo.private && (
            <span className="text-[10px] font-mono uppercase tracking-[0.14em] px-1.5 py-0.5 rounded border border-slate-700 text-slate-400">
              Private
            </span>
          )}
        </div>
        {repo.description && (
          <div className="mt-1 text-[13px] text-slate-400 truncate">
            {repo.description}
          </div>
        )}
      </div>
      <div className="flex items-center gap-4 text-[12px] font-mono text-slate-500 whitespace-nowrap">
        {repo.language && (
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-slate-500" />
            {repo.language}
          </span>
        )}
        {repo.stars > 0 && (
          <span className="flex items-center gap-1">
            <Star className="w-3 h-3" />
            {repo.stars}
          </span>
        )}
        <ArrowRight className="w-4 h-4 text-slate-600" />
      </div>
    </button>
  )
}

function RepoSkeletons() {
  return (
    <>
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="px-5 py-4 flex items-center gap-4">
          <div className="flex-1 space-y-2">
            <div className="h-3 w-1/3 bg-slate-800/80 rounded animate-pulse" />
            <div className="h-2.5 w-2/3 bg-slate-800/60 rounded animate-pulse" />
          </div>
          <div className="h-2.5 w-10 bg-slate-800/60 rounded animate-pulse" />
        </div>
      ))}
    </>
  )
}

function IssueStep({
  repo,
  onBack,
  onSelect,
}: {
  repo: RepoSummary
  onBack: () => void
  onSelect: (i: IssueSummary) => void
}) {
  const [query, setQuery] = useState('')
  const debounced = useDebouncedValue(query, 220)
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null)
  const [issues, setIssues] = useState<IssueSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    const params = new URLSearchParams()
    params.set('state', 'open')
    if (debounced) params.set('search', debounced)
    if (selectedLabel) params.set('labels', selectedLabel)
    fetch(
      `/api/github/repos/${repo.owner}/${repo.name}/issues?${params.toString()}`,
    )
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
  }, [debounced, selectedLabel, repo.owner, repo.name])

  const availableLabels = useMemo(() => {
    if (!issues) return [] as { name: string; color: string }[]
    const seen = new Map<string, string>()
    for (const i of issues) {
      for (const l of i.labels) {
        if (!seen.has(l.name)) seen.set(l.name, l.color)
      }
    }
    return Array.from(seen.entries())
      .map(([name, color]) => ({ name, color }))
      .slice(0, 16)
  }, [issues])

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-[12px] font-mono text-slate-400 hover:text-slate-100"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Change repo
        </button>
        <div className="text-[12px] font-mono text-slate-400 truncate">
          {repo.fullName}
        </div>
      </div>

      <div className="mt-4 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search open issues by title or number…"
          className="w-full pl-10 pr-4 py-3 rounded-[10px] border border-slate-800 bg-slate-900/60 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-slate-600"
        />
      </div>

      {availableLabels.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setSelectedLabel(null)}
            className={`px-2 py-1 rounded-full border text-[11px] font-mono uppercase tracking-[0.14em] transition-colors ${
              selectedLabel === null
                ? 'border-slate-400 text-slate-100 bg-slate-800/60'
                : 'border-slate-800 text-slate-500 hover:text-slate-200'
            }`}
          >
            All
          </button>
          {availableLabels.map((l) => (
            <button
              key={l.name}
              type="button"
              onClick={() => setSelectedLabel(l.name)}
              className={`px-2 py-1 rounded-full border text-[11px] font-mono transition-colors ${
                selectedLabel === l.name
                  ? 'border-slate-400 text-slate-100 bg-slate-800/60'
                  : 'border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
              style={{
                color: selectedLabel === l.name ? '#f1f5f9' : `#${l.color}`,
              }}
            >
              {l.name}
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="mt-6 rounded-[10px] border border-rose-900/60 bg-rose-950/30 p-4 text-[13px] text-rose-200">
          {error}
        </div>
      )}

      <div className="mt-5 rounded-[10px] border border-slate-800 bg-slate-900/40 overflow-hidden divide-y divide-slate-800/60">
        {loading && !issues && <RepoSkeletons />}
        {issues && issues.length === 0 && !loading && (
          <div className="p-8 text-center text-slate-400">
            No open issues match. Try a different search or label.
          </div>
        )}
        {issues?.map((i) => (
          <button
            key={i.number}
            type="button"
            onClick={() => onSelect(i)}
            className="w-full text-left px-5 py-4 hover:bg-slate-900/70 transition-colors flex items-center justify-between gap-4"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <CircleDot className="w-3.5 h-3.5 text-[#14B8A6]" />
                <span className="font-mono text-[12px] text-slate-500">
                  #{i.number}
                </span>
                <span className="text-[14px] text-slate-100 truncate">
                  {i.title}
                </span>
              </div>
              {i.labels.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {i.labels.slice(0, 5).map((l) => (
                    <span
                      key={l.name}
                      className="text-[10px] font-mono uppercase tracking-[0.12em] px-1.5 py-0.5 rounded-full border"
                      style={{
                        color: `#${l.color}`,
                        borderColor: `#${l.color}55`,
                        background: `#${l.color}10`,
                      }}
                    >
                      {l.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-3 text-[12px] font-mono text-slate-500 whitespace-nowrap">
              {i.commentsCount > 0 && (
                <span className="flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" />
                  {i.commentsCount}
                </span>
              )}
              <ArrowRight className="w-4 h-4 text-slate-600" />
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

interface ClassificationPreview {
  type: string
  complexity: string
  concerns: string[]
  reason: string
  squadId: string
  squadName: string
  personaIds: string[]
}

function ConfirmStep({
  repo,
  issue,
  remaining,
  dailyLimit,
  unlimited,
  onBack,
}: {
  repo: RepoSummary
  issue: IssueSummary
  remaining: number
  dailyLimit: number
  unlimited: boolean
  onBack: () => void
}) {
  const router = useRouter()
  const [launching, setLaunching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const overLimit = !unlimited && remaining <= 0

  async function handleLaunch() {
    setLaunching(true)
    setError(null)
    try {
      const resp = await fetch('/api/party/start', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ issueUrl: issue.htmlUrl }),
      })
      if (!resp.ok) {
        const data = (await resp.json().catch(() => ({}))) as { error?: string }
        throw new Error(data.error ?? `Failed (${resp.status})`)
      }
      const data = (await resp.json()) as { partyId: string }
      router.push(`/party/${data.partyId}`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to launch')
      setLaunching(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-[12px] font-mono text-slate-400 hover:text-slate-100"
          disabled={launching}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Change issue
        </button>
        <div className="text-[12px] font-mono text-slate-400">
          {unlimited ? (
            <span className="text-[#14B8A6]">∞ maintainer · no cap</span>
          ) : (
            <>
              {remaining} / {dailyLimit} parties left today
            </>
          )}
        </div>
      </div>

      <div className="mt-6 relative rounded-[12px] border border-slate-800 bg-slate-900/60 p-7 overflow-hidden">
        <Hairline className="absolute inset-x-0 top-0" />
        <div className="flex items-center gap-2 text-[11px] font-mono font-medium uppercase tracking-[0.18em] text-slate-400">
          <GitBranch className="w-3.5 h-3.5" />
          {repo.fullName} #{issue.number}
        </div>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight">
          {issue.title}
        </h2>
        {issue.body && (
          <p className="mt-3 text-[13.5px] text-slate-400 whitespace-pre-wrap line-clamp-6">
            {issue.body}
          </p>
        )}
        {issue.labels.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1">
            {issue.labels.map((l) => (
              <span
                key={l.name}
                className="text-[10px] font-mono uppercase tracking-[0.12em] px-1.5 py-0.5 rounded-full border"
                style={{
                  color: `#${l.color}`,
                  borderColor: `#${l.color}55`,
                  background: `#${l.color}10`,
                }}
              >
                {l.name}
              </span>
            ))}
          </div>
        )}
      </div>

      <SquadPreview repo={repo} issue={issue} />

      {error && (
        <div className="mt-6 rounded-[10px] border border-rose-900/60 bg-rose-950/30 p-4 text-[13px] text-rose-200">
          {error}
        </div>
      )}

      {overLimit && (
        <div className="mt-6 rounded-[10px] border border-amber-900/60 bg-amber-950/30 p-4 text-[13px] text-amber-200">
          You&apos;ve hit today&apos;s free-tier limit of {dailyLimit} parties.
          Resets at midnight UTC.
        </div>
      )}

      <div className="mt-8 flex items-center gap-3">
        <button
          type="button"
          onClick={handleLaunch}
          disabled={launching || overLimit}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[8px] bg-gradient-to-r from-[#E879F9] via-[#A78BFA] to-[#60A5FA] text-black font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {launching ? (
            <>
              <Spinner className="w-4 h-4" />
              Launching…
            </>
          ) : (
            <>
              <Rocket className="w-4 h-4" />
              Let&apos;s party
            </>
          )}
        </button>
        <span className="text-[12px] font-mono text-slate-500">
          Five agents, one race. ~2 min to first preview.
        </span>
      </div>
    </div>
  )
}

function SquadPreview({
  repo,
  issue,
}: {
  repo: RepoSummary
  issue: IssueSummary
}) {
  const [preview, setPreview] = useState<ClassificationPreview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetch('/api/party/preview', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        title: issue.title,
        body: issue.body,
      }),
    })
      .then(async (r) => {
        if (!r.ok) {
          const data = (await r.json().catch(() => ({}))) as { error?: string }
          throw new Error(data.error ?? `Failed (${r.status})`)
        }
        return r.json() as Promise<ClassificationPreview>
      })
      .then((data) => {
        if (cancelled) return
        setPreview(data)
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setError(e instanceof Error ? e.message : 'Preview unavailable')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [repo.fullName, issue.number, issue.title, issue.body])

  return (
    <div className="mt-6 rounded-[12px] border border-slate-800 bg-slate-900/40 p-6">
      <div className="text-[11px] font-mono font-medium uppercase tracking-[0.18em] text-slate-400">
        The squad we&apos;ll send
      </div>

      {loading && (
        <div className="mt-4 flex items-center gap-2 text-[13px] text-slate-400">
          <Spinner className="w-3.5 h-3.5" />
          Reading the issue…
        </div>
      )}

      {error && !loading && (
        <div className="mt-3 text-[13px] text-slate-400">
          Classification unavailable — we&apos;ll pick the All-Trades squad as a
          safe default.
        </div>
      )}

      {preview && (
        <>
          <div className="mt-3 flex items-baseline gap-2 flex-wrap">
            <span className="text-2xl font-semibold tracking-tight">
              {preview.squadName}
            </span>
            <span className="text-[12px] font-mono uppercase tracking-[0.14em] text-slate-400">
              · {preview.type} · {preview.complexity}
            </span>
          </div>
          <p className="mt-2 text-[13.5px] text-slate-400 max-w-xl">
            {preview.reason}
          </p>
          {preview.concerns.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {preview.concerns.map((c) => (
                <span
                  key={c}
                  className="text-[10px] font-mono uppercase tracking-[0.14em] px-1.5 py-0.5 rounded-full border border-slate-700 text-slate-400"
                >
                  {c}
                </span>
              ))}
            </div>
          )}
          <div className="mt-5 flex flex-wrap gap-2">
            {preview.personaIds.map((id) => (
              <span
                key={id}
                className="px-2.5 py-1 rounded-full border border-slate-700 bg-slate-900/60 text-[11px] font-mono text-slate-200"
              >
                {id}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
