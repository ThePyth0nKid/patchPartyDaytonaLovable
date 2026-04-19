'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowUp,
  CheckCircle2,
  GitCommit,
  Loader2,
  Terminal,
  Wrench,
} from 'lucide-react'
import type { PersonaId } from '@/lib/personas'

const MAX_TURNS_PER_PARTY = 20

type ToolEvent =
  | { kind: 'call'; id: string; tool: string; input: unknown }
  | { kind: 'result'; id: string; output: string; isError: boolean }
  | { kind: 'commit'; sha: string; message: string }

interface ChatMessage {
  role: 'user' | 'assistant'
  text: string
  tools: ToolEvent[]
  turnIndex: number
  status?: 'pending' | 'applied' | 'failed'
  error?: string
  cost?: number
  latencyMs?: number
}

interface HistoryTurn {
  turnIndex: number
  userMessage: string
  assistantResponse: string | null
  diffApplied: string[]
  status: string
  createdAt: string
}

interface ChatPaneProps {
  partyId: string
  partyTitle: string
  personaId: PersonaId | null | undefined
  personaName: string
  personaAccent: string
  sandboxState: string
  disabled?: boolean
  onShipPR?: () => void
  shippingPr?: boolean
  prUrl?: string | null
}

export function ChatPane({
  partyId,
  partyTitle,
  personaName,
  personaAccent,
  sandboxState,
  disabled,
  onShipPR,
  shippingPr,
  prUrl,
}: ChatPaneProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const logRef = useRef<HTMLDivElement | null>(null)

  // Hydrate from history on mount.
  useEffect(() => {
    let aborted = false
    async function loadHistory() {
      try {
        const res = await fetch(`/api/party/${partyId}/chat-history`, {
          cache: 'no-store',
        })
        if (!res.ok) return
        const data = (await res.json()) as { turns: HistoryTurn[] }
        if (aborted) return
        const hydrated: ChatMessage[] = []
        for (const t of data.turns) {
          hydrated.push({
            role: 'user',
            text: t.userMessage,
            tools: [],
            turnIndex: t.turnIndex,
          })
          hydrated.push({
            role: 'assistant',
            text: t.assistantResponse ?? '',
            tools: t.diffApplied.map((p): ToolEvent => ({
              kind: 'result',
              id: `hist-${t.turnIndex}-${p}`,
              output: `Applied edit: ${p}`,
              isError: false,
            })),
            turnIndex: t.turnIndex,
            status: t.status === 'applied' ? 'applied' : 'failed',
          })
        }
        setMessages(hydrated)
      } catch {
        /* swallow — pane still works for new turns */
      }
    }
    void loadHistory()
    return () => {
      aborted = true
    }
  }, [partyId])

  // Auto-scroll on new content.
  useEffect(() => {
    const el = logRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messages])

  const canSend = useMemo(() => {
    if (sending) return false
    if (disabled) return false
    if (draft.trim().length === 0) return false
    return true
  }, [sending, disabled, draft])

  const turnCountUsed = useMemo(() => {
    const userTurns = new Set<number>()
    for (const m of messages) if (m.role === 'user') userTurns.add(m.turnIndex)
    return userTurns.size
  }, [messages])

  const atTurnCap = turnCountUsed >= MAX_TURNS_PER_PARTY

  const sendMessage = useCallback(async () => {
    if (!canSend) return
    const message = draft.trim()
    setDraft('')
    setError(null)

    // Optimistic user message. turnIndex gets finalised by server 'turn_started'.
    const tempTurnIndex = turnCountUsed
    setMessages((prev) => [
      ...prev,
      {
        role: 'user',
        text: message,
        tools: [],
        turnIndex: tempTurnIndex,
      },
      {
        role: 'assistant',
        text: '',
        tools: [],
        turnIndex: tempTurnIndex,
        status: 'pending',
      },
    ])
    setSending(true)

    try {
      const res = await fetch(`/api/party/${partyId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      })
      if (!res.ok || !res.body) {
        const text = await res.text().catch(() => '')
        throw new Error(text || `chat failed (${res.status})`)
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        // Split complete SSE records (terminated by \n\n).
        let sepIdx = buffer.indexOf('\n\n')
        while (sepIdx !== -1) {
          const raw = buffer.slice(0, sepIdx)
          buffer = buffer.slice(sepIdx + 2)
          sepIdx = buffer.indexOf('\n\n')
          handleSseRecord(raw)
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg)
      setMessages((prev) => {
        const next = [...prev]
        const last = next[next.length - 1]
        if (last?.role === 'assistant' && last.status === 'pending') {
          next[next.length - 1] = {
            ...last,
            status: 'failed',
            error: msg,
          }
        }
        return next
      })
    } finally {
      setSending(false)
    }

    function handleSseRecord(raw: string) {
      const lines = raw.split('\n')
      let eventName = 'message'
      const dataLines: string[] = []
      for (const line of lines) {
        if (line.startsWith('event: ')) eventName = line.slice(7).trim()
        else if (line.startsWith('data: ')) dataLines.push(line.slice(6))
      }
      if (dataLines.length === 0) return
      let payload: unknown
      try {
        payload = JSON.parse(dataLines.join('\n'))
      } catch {
        return
      }

      setMessages((prev) => {
        const next = [...prev]
        const lastIdx = next.length - 1
        const last = next[lastIdx]
        if (!last || last.role !== 'assistant') return prev

        if (eventName === 'turn_started') {
          const { turnIndex } = payload as { turnIndex: number }
          next[lastIdx - 1] = { ...next[lastIdx - 1], turnIndex }
          next[lastIdx] = { ...last, turnIndex }
          return next
        }
        if (eventName === 'text_delta') {
          const { content } = payload as { content: string }
          next[lastIdx] = { ...last, text: last.text + content }
          return next
        }
        if (eventName === 'tool_call') {
          const { tool, input, toolUseId } = payload as {
            tool: string
            input: unknown
            toolUseId: string
          }
          next[lastIdx] = {
            ...last,
            tools: [...last.tools, { kind: 'call', id: toolUseId, tool, input }],
          }
          return next
        }
        if (eventName === 'tool_result') {
          const { toolUseId, output, isError } = payload as {
            toolUseId: string
            output: string
            isError?: boolean
          }
          next[lastIdx] = {
            ...last,
            tools: [
              ...last.tools,
              {
                kind: 'result',
                id: toolUseId,
                output,
                isError: !!isError,
              },
            ],
          }
          return next
        }
        if (eventName === 'commit') {
          const { sha, message } = payload as { sha: string; message: string }
          next[lastIdx] = {
            ...last,
            tools: [...last.tools, { kind: 'commit', sha, message }],
          }
          return next
        }
        if (eventName === 'turn_done') {
          const { costUsd, latencyMs } = payload as {
            costUsd: number
            latencyMs: number
          }
          next[lastIdx] = {
            ...last,
            status: 'applied',
            cost: costUsd,
            latencyMs,
          }
          return next
        }
        if (eventName === 'turn_failed') {
          const { error: errMsg } = payload as { error: string }
          next[lastIdx] = { ...last, status: 'failed', error: errMsg }
          return next
        }
        return prev
      })
    }
  }, [canSend, draft, partyId, turnCountUsed])

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.metaKey) {
      e.preventDefault()
      void sendMessage()
    }
  }

  return (
    <div className="flex flex-col h-full min-h-0 bg-slate-900/60 backdrop-blur border border-slate-800 rounded-[7px] overflow-hidden">
      <div
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
      </div>

      <div ref={logRef} className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-[12px] text-slate-500 leading-relaxed max-w-md">
            The pick is in. Ask {personaName} to tweak the branch — refine
            copy, tighten a helper, run a build. Every turn commits and
            updates the preview on the right.
          </div>
        )}
        {messages.map((m, i) => (
          <MessageBubble
            key={`${m.role}-${m.turnIndex}-${i}`}
            msg={m}
            accent={personaAccent}
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
    </div>
  )
}

function MessageBubble({ msg, accent }: { msg: ChatMessage; accent: string }) {
  if (msg.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-[7px] bg-slate-800/60 border border-slate-700 px-3 py-2 text-[13px] leading-relaxed text-slate-100 whitespace-pre-wrap">
          {msg.text}
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-[92%] w-full space-y-2">
        {msg.text && (
          <div className="rounded-[7px] bg-slate-950/60 border border-slate-800 px-3 py-2 text-[13px] leading-relaxed text-slate-100 whitespace-pre-wrap">
            {msg.text}
          </div>
        )}
        {msg.tools.map((t, i) => (
          <ToolBlock key={`${t.kind}-${i}`} event={t} accent={accent} />
        ))}
        <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.16em]">
          {msg.status === 'pending' && (
            <span className="inline-flex items-center gap-1 text-slate-400">
              <Loader2 className="w-3 h-3 animate-spin" /> Working…
            </span>
          )}
          {msg.status === 'applied' && (
            <span className="inline-flex items-center gap-1 text-[#14B8A6]">
              <CheckCircle2 className="w-3 h-3" /> Applied
              {typeof msg.cost === 'number' && (
                <span className="text-slate-500 ml-2">
                  ${msg.cost.toFixed(4)}
                </span>
              )}
            </span>
          )}
          {msg.status === 'failed' && (
            <span className="text-red-300">Failed — {msg.error}</span>
          )}
        </div>
      </div>
    </div>
  )
}

function ToolBlock({
  event,
  accent,
}: {
  event: ToolEvent
  accent: string
}) {
  if (event.kind === 'commit') {
    return (
      <div className="flex items-center gap-2 text-[11px] font-mono rounded-[5px] border border-slate-800 bg-slate-950/50 px-2.5 py-1.5 text-slate-300">
        <GitCommit className="w-3.5 h-3.5" style={{ color: accent }} />
        <span className="text-slate-500">{event.sha.slice(0, 7)}</span>
        <span className="truncate">{event.message}</span>
      </div>
    )
  }

  if (event.kind === 'call') {
    return (
      <div className="flex items-start gap-2 text-[11px] font-mono rounded-[5px] border border-slate-800 bg-slate-950/50 px-2.5 py-1.5">
        <Wrench className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-400" />
        <div className="min-w-0 flex-1">
          <div className="text-slate-200">{event.tool}</div>
          <pre className="mt-1 text-[10px] text-slate-400 whitespace-pre-wrap break-words max-h-24 overflow-y-auto">
            {stringifyInput(event.input)}
          </pre>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-2 text-[11px] font-mono rounded-[5px] border border-slate-800 bg-slate-950/50 px-2.5 py-1.5">
      <Terminal
        className="w-3.5 h-3.5 shrink-0 mt-0.5"
        style={{ color: event.isError ? '#f87171' : '#14B8A6' }}
      />
      <pre
        className={`whitespace-pre-wrap break-words max-h-32 overflow-y-auto text-[11px] ${
          event.isError ? 'text-red-200' : 'text-slate-300'
        }`}
      >
        {event.output.slice(0, 2000)}
      </pre>
    </div>
  )
}

function stringifyInput(input: unknown): string {
  try {
    return JSON.stringify(input, null, 2).slice(0, 1000)
  } catch {
    return String(input).slice(0, 1000)
  }
}
