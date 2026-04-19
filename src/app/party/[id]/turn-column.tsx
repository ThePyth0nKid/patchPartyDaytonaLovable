'use client'

// TurnColumn — the right-hand side of IteratePage. Replaces ChatPane by
// rendering a list of TurnCard primitives plus an input area. SSE handling
// (text_delta / tool_call / tool_result / commit / diff_stats / turn_done /
// turn_failed) stays here because that's where turn state lives.
//
// The file-pill → DiffDrawer path closes S2 (no dangerouslySetInnerHTML).
// Diff fetches are cached per (turnIndex, path) in a plain Map so a user
// can reopen without re-hitting the endpoint.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowUp, Loader2 } from 'lucide-react'
import type { FileDiffStat } from '@/lib/diff-stats'
import { csrfFetch } from '@/lib/client-fetch'
import { MAX_TURNS_PER_PARTY } from '@/lib/chat-constants'
import { TurnCard, type TurnCardData } from './turn-card'
import { DiffDrawer } from './diff-drawer'

interface HistoryTurn {
  turnIndex: number
  userMessage: string
  assistantResponse: string | null
  diffApplied: string[]
  diffStats: unknown
  commitSha: string | null
  revertedByTurnIndex: number | null
  costUsd: string | number | null
  latencyMs: number | null
  status: string
  error: string | null
  createdAt: string
}

interface TurnColumnProps {
  partyId: string
  partyTitle: string
  personaName: string
  personaAccent: string
  sandboxState: string
  disabled?: boolean
  onShipPR?: () => void
  shippingPr?: boolean
  prUrl?: string | null
}

interface DiffCache {
  sha: string | null
  unifiedDiff: string | null
  loading: boolean
  error: string | null
}

export function TurnColumn({
  partyId,
  partyTitle,
  personaName,
  personaAccent,
  sandboxState,
  disabled,
  onShipPR,
  shippingPr,
  prUrl,
}: TurnColumnProps) {
  const [turns, setTurns] = useState<TurnCardData[]>([])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const logRef = useRef<HTMLDivElement | null>(null)

  const [openDiff, setOpenDiff] = useState<
    { turnIndex: number; file: FileDiffStat } | null
  >(null)
  const [diffCache, setDiffCache] = useState<Map<string, DiffCache>>(
    () => new Map(),
  )
  // Mirror diffCache in a ref so onOpenDiff can dedupe fetches without
  // listing diffCache in its deps — which would memo-bust every TurnCard
  // on every cache write. Ref stays in sync via the effect below.
  const diffCacheRef = useRef(diffCache)
  useEffect(() => {
    diffCacheRef.current = diffCache
  }, [diffCache])

  useEffect(() => {
    let aborted = false
    async function load() {
      try {
        const res = await fetch(`/api/party/${partyId}/chat-history`, {
          cache: 'no-store',
        })
        if (!res.ok) return
        const data = (await res.json()) as { turns: HistoryTurn[] }
        if (aborted) return
        setTurns(data.turns.map(historyToCard))
      } catch {
        /* swallow — pane still works for new turns */
      }
    }
    void load()
    return () => {
      aborted = true
    }
  }, [partyId])

  useEffect(() => {
    const el = logRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [turns])

  const turnCountUsed = useMemo(
    () => turns.filter((t) => t.status === 'applied' || t.status === 'pending').length,
    [turns],
  )
  const atTurnCap = turnCountUsed >= MAX_TURNS_PER_PARTY

  const latestAppliedIndex = useMemo(() => {
    for (let i = turns.length - 1; i >= 0; i--) {
      const t = turns[i]
      if (
        t.status === 'applied' &&
        t.revertedByTurnIndex === null &&
        t.commitSha
      ) {
        return t.turnIndex
      }
    }
    return null
  }, [turns])

  const canSend =
    !sending && !disabled && !atTurnCap && draft.trim().length > 0

  const sendMessage = useCallback(async () => {
    if (!canSend) return
    const message = draft.trim()
    setDraft('')
    setError(null)

    // Optimistic pending row. Real turnIndex replaces tempIndex on
    // 'turn_started'.
    const tempIndex = -1 - Date.now() // unique sentinel
    setTurns((prev) => [
      ...prev,
      {
        turnIndex: tempIndex,
        userMessage: message,
        assistantResponse: null,
        status: 'pending',
        diffStats: [],
        commitSha: null,
        costUsd: null,
        latencyMs: null,
        error: null,
        revertedByTurnIndex: null,
        createdAtMs: Date.now(),
      },
    ])
    setSending(true)

    try {
      const res = await csrfFetch(`/api/party/${partyId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      })
      if (!res.ok || !res.body) {
        const text = await res.text().catch(() => '')
        throw new Error(text || `chat failed (${res.status})`)
      }
      await consumeSse(res.body, (event, payload) => {
        applySseEvent(setTurns, tempIndex, event, payload)
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg)
      setTurns((prev) => {
        const next = [...prev]
        for (let i = next.length - 1; i >= 0; i--) {
          if (next[i].status === 'pending') {
            next[i] = { ...next[i], status: 'failed', error: msg }
            break
          }
        }
        return next
      })
    } finally {
      setSending(false)
    }
  }, [canSend, draft, partyId])

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.metaKey) {
      e.preventDefault()
      void sendMessage()
    }
  }

  const onOpenDiff = useCallback(
    async (turnIndex: number, file: FileDiffStat) => {
      setOpenDiff({ turnIndex, file })
      const cacheKey = `${turnIndex}:${file.path}`
      if (diffCacheRef.current.has(cacheKey)) return
      setDiffCache((prev) => {
        const next = new Map(prev)
        next.set(cacheKey, {
          sha: null,
          unifiedDiff: null,
          loading: true,
          error: null,
        })
        return next
      })
      try {
        const qs = new URLSearchParams({ path: file.path }).toString()
        const res = await fetch(
          `/api/party/${partyId}/turns/${turnIndex}/diff?${qs}`,
          { cache: 'no-store' },
        )
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string }
          throw new Error(body.error ?? `diff failed (${res.status})`)
        }
        const data = (await res.json()) as {
          sha: string
          path: string
          unifiedDiff: string
        }
        setDiffCache((prev) => {
          const next = new Map(prev)
          next.set(cacheKey, {
            sha: data.sha,
            unifiedDiff: data.unifiedDiff,
            loading: false,
            error: null,
          })
          return next
        })
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        setDiffCache((prev) => {
          const next = new Map(prev)
          next.set(cacheKey, {
            sha: null,
            unifiedDiff: null,
            loading: false,
            error: msg,
          })
          return next
        })
      }
    },
    [partyId],
  )

  const activeDiff = openDiff
    ? diffCache.get(`${openDiff.turnIndex}:${openDiff.file.path}`) ?? null
    : null

  return (
    <div className="flex flex-col h-full min-h-0 bg-slate-900/60 backdrop-blur border border-slate-800 rounded-[7px] overflow-hidden">
      <header
        className="px-4 py-3 border-b border-slate-800/80 flex items-center justify-between"
        style={{ borderTopColor: personaAccent, borderTopWidth: 0 }}
      >
        <div className="min-w-0">
          <div className="text-[11px] font-mono font-semibold uppercase tracking-[0.18em] text-slate-300">
            Iterate with {personaName}
          </div>
          <div className="text-[11px] font-mono text-slate-500 truncate">
            {partyTitle}
          </div>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.16em] text-slate-400">
          <span>
            {turnCountUsed}/{MAX_TURNS_PER_PARTY}
          </span>
          {onShipPR && (
            <button
              onClick={onShipPR}
              disabled={shippingPr || !!prUrl}
              className="px-2.5 py-1 rounded-[5px] bg-slate-50 text-slate-950 text-[10px] font-semibold uppercase tracking-[0.16em] hover:brightness-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {prUrl ? 'PR open' : shippingPr ? 'Shipping…' : 'Ship PR'}
            </button>
          )}
        </div>
      </header>

      <div
        ref={logRef}
        className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-3"
      >
        {turns.length === 0 && (
          <div className="text-[12px] text-slate-500 leading-relaxed max-w-md">
            The pick is in. Ask {personaName} to tweak the branch — refine
            copy, tighten a helper, run a build. Every turn commits and
            updates the preview on the left.
          </div>
        )}
        {turns.map((t) => (
          <TurnCard
            key={t.turnIndex}
            turn={t}
            accent={personaAccent}
            isLatestApplied={t.turnIndex === latestAppliedIndex}
            undoing={false}
            onOpenDiff={onOpenDiff}
            onUndo={() => {
              /* wired up in T3.4 */
            }}
          />
        ))}
      </div>

      {error && (
        <div className="px-4 py-2 text-[11px] font-mono text-red-300 border-t border-red-500/20 bg-red-500/5">
          {error}
        </div>
      )}

      <div className="border-t border-slate-800/80 p-3">
        {atTurnCap ? (
          <div className="text-[12px] text-amber-300 font-mono">
            Chat cap of {MAX_TURNS_PER_PARTY} turns reached. Ship the PR to
            finalise — or start a fresh party.
          </div>
        ) : sandboxState === 'PAUSED' || sandboxState === 'TERMINATED' ? (
          <div className="text-[12px] text-slate-400 font-mono">
            {sandboxState === 'PAUSED'
              ? 'Sandbox paused. Resume it above to keep chatting.'
              : 'Sandbox terminated. Start a new party to iterate.'}
          </div>
        ) : (
          <div className="flex items-end gap-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onKeyDown}
              disabled={!!disabled || sending}
              rows={2}
              placeholder={`Ask ${personaName} to refine the branch…`}
              className="flex-1 resize-none bg-slate-950 border border-slate-800 rounded-[7px] px-3 py-2 text-[13px] text-slate-100 placeholder-slate-600 focus:outline-none focus:border-slate-600 disabled:opacity-60"
            />
            <button
              onClick={() => void sendMessage()}
              disabled={!canSend}
              aria-label="Send message"
              className="shrink-0 h-9 w-9 inline-flex items-center justify-center rounded-[7px] bg-slate-50 text-slate-950 hover:brightness-95 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ArrowUp className="w-4 h-4" strokeWidth={2.5} />
              )}
            </button>
          </div>
        )}
      </div>

      <DiffDrawer
        open={!!openDiff}
        onClose={() => setOpenDiff(null)}
        file={openDiff?.file ?? null}
        unifiedDiff={activeDiff?.unifiedDiff ?? null}
        loading={!!activeDiff?.loading}
        error={activeDiff?.error ?? null}
        sha={activeDiff?.sha}
      />
    </div>
  )
}

async function consumeSse(
  body: ReadableStream<Uint8Array>,
  onEvent: (event: string, payload: unknown) => void,
): Promise<void> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    let sepIdx = buffer.indexOf('\n\n')
    while (sepIdx !== -1) {
      const raw = buffer.slice(0, sepIdx)
      buffer = buffer.slice(sepIdx + 2)
      sepIdx = buffer.indexOf('\n\n')
      const lines = raw.split('\n')
      let eventName = 'message'
      const dataLines: string[] = []
      for (const line of lines) {
        if (line.startsWith('event: ')) eventName = line.slice(7).trim()
        else if (line.startsWith('data: ')) dataLines.push(line.slice(6))
      }
      if (dataLines.length === 0) continue
      let payload: unknown
      try {
        payload = JSON.parse(dataLines.join('\n'))
      } catch {
        continue
      }
      onEvent(eventName, payload)
    }
  }
}

function applySseEvent(
  setTurns: React.Dispatch<React.SetStateAction<TurnCardData[]>>,
  tempIndex: number,
  event: string,
  payload: unknown,
): void {
  setTurns((prev) => {
    // Find the pending turn (matched by tempIndex on first event, by real
    // turnIndex thereafter).
    const findPending = () => {
      for (let i = prev.length - 1; i >= 0; i--) {
        if (prev[i].status === 'pending') return i
      }
      return -1
    }

    if (event === 'turn_started') {
      const { turnIndex } = payload as { turnIndex: number }
      const idx = findPending()
      if (idx < 0) return prev
      const next = [...prev]
      next[idx] = { ...next[idx], turnIndex }
      return next
    }

    const idx = findPending()
    if (idx < 0) return prev
    const current = prev[idx]

    if (event === 'text_delta') {
      const { content } = payload as { content: string }
      const next = [...prev]
      next[idx] = {
        ...current,
        assistantResponse: (current.assistantResponse ?? '') + content,
      }
      return next
    }
    if (event === 'commit') {
      const { sha } = payload as { sha: string; message: string }
      const next = [...prev]
      next[idx] = { ...current, commitSha: sha }
      return next
    }
    if (event === 'diff_stats') {
      const { files } = payload as { files: FileDiffStat[] }
      const next = [...prev]
      next[idx] = { ...current, diffStats: files }
      return next
    }
    if (event === 'turn_done') {
      const { costUsd, latencyMs } = payload as {
        costUsd: number
        latencyMs: number
      }
      const next = [...prev]
      next[idx] = {
        ...current,
        status: 'applied',
        costUsd,
        latencyMs,
      }
      return next
    }
    if (event === 'turn_failed') {
      const { error: errMsg } = payload as { error: string }
      const next = [...prev]
      next[idx] = { ...current, status: 'failed', error: errMsg }
      return next
    }
    return prev
  })
  void tempIndex // tempIndex only needed for initial optimistic row
}

function historyToCard(h: HistoryTurn): TurnCardData {
  const diffStats: FileDiffStat[] = Array.isArray(h.diffStats)
    ? (h.diffStats as FileDiffStat[]).filter(
        (s) => s && typeof s === 'object' && typeof s.path === 'string',
      )
    : []
  const cost =
    typeof h.costUsd === 'string'
      ? Number.parseFloat(h.costUsd)
      : typeof h.costUsd === 'number'
        ? h.costUsd
        : null
  const status: TurnCardData['status'] =
    h.status === 'applied' || h.status === 'failed' || h.status === 'undone'
      ? h.status
      : 'pending'
  return {
    turnIndex: h.turnIndex,
    userMessage: h.userMessage,
    assistantResponse: h.assistantResponse,
    status,
    diffStats,
    commitSha: h.commitSha,
    costUsd: Number.isFinite(cost) ? cost : null,
    latencyMs: h.latencyMs,
    error: h.error,
    revertedByTurnIndex: h.revertedByTurnIndex,
    createdAtMs: Date.parse(h.createdAt) || null,
  }
}
