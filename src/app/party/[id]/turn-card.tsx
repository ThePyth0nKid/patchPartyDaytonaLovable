'use client'

// TurnCard — one card per ChatTurn row in the iterate flow.
//
// Layout (see planning/v2.1-iterate-ux/01-ux-spec.md §3):
//
//   ┌── TurnCard ───────────────────────────────────────┐
//   │ [you · 2m ago] user message                       │
//   │ [✓ Applied · 4.2s · $0.0032]                       │
//   │ assistant response (line-clamp)                   │
//   │ [file.tsx +4 -1] [globals.css +2 -0]              │
//   │ [git] 3a8f2c1  chat: …                             │
//   │                                           ↩ Undo │  (latest applied only)
//   └────────────────────────────────────────────────────┘
//
// Pending / failed / reverted states override the applied look. File pills
// are clickable buttons that call the parent's onOpenDiff with (turnIndex,
// fileStat). DiffDrawer itself is rendered once at the TurnColumn level.

import { memo } from 'react'
import {
  CheckCircle2,
  GitCommit,
  Loader2,
  AlertCircle,
  RotateCcw,
} from 'lucide-react'
import type { FileDiffStat } from '@/lib/diff-stats'

export interface TurnCardData {
  turnIndex: number
  userMessage: string
  assistantResponse: string | null
  status: 'pending' | 'applied' | 'failed' | 'undone'
  diffStats: FileDiffStat[]
  commitSha: string | null
  costUsd: number | null
  latencyMs: number | null
  error: string | null
  revertedByTurnIndex: number | null
  createdAtMs: number | null
}

interface TurnCardProps {
  turn: TurnCardData
  accent: string
  isLatestApplied: boolean
  undoing: boolean
  onOpenDiff: (turnIndex: number, file: FileDiffStat) => void
  onUndo: (turnIndex: number) => void
}

function TurnCardComponent({
  turn,
  accent,
  isLatestApplied,
  undoing,
  onOpenDiff,
  onUndo,
}: TurnCardProps) {
  const reverted = turn.revertedByTurnIndex !== null || turn.status === 'undone'
  return (
    <article
      className={`rounded-[7px] border bg-slate-900/60 overflow-hidden ${
        turn.status === 'failed'
          ? 'border-rose-500/40'
          : reverted
            ? 'border-slate-800 opacity-70'
            : 'border-slate-800'
      }`}
    >
      <header className="px-3 py-2 border-b border-slate-800/80 text-[11px] font-mono uppercase tracking-[0.16em] text-slate-500 flex items-center justify-between">
        <span>you · turn {turn.turnIndex + 1}</span>
        <TimeAgo ms={turn.createdAtMs} />
      </header>

      <div className="px-3 py-2 text-[13px] leading-relaxed text-slate-100 whitespace-pre-wrap break-words">
        {turn.userMessage}
      </div>

      <div className="px-3 pb-3 space-y-2">
        <StatusRow turn={turn} />

        {turn.assistantResponse && (
          <p
            className={`text-[13px] leading-relaxed text-slate-300 whitespace-pre-wrap break-words ${
              reverted ? 'line-through text-slate-500' : ''
            }`}
          >
            {turn.assistantResponse}
          </p>
        )}

        {turn.diffStats.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {turn.diffStats.map((stat) => (
              <button
                key={stat.path}
                type="button"
                onClick={() => onOpenDiff(turn.turnIndex, stat)}
                title={`Open diff for ${stat.path}`}
                className="inline-flex items-center gap-1.5 rounded-[5px] border border-slate-700 bg-slate-950/50 px-2 py-1 text-[11px] font-mono text-slate-300 hover:border-slate-500 hover:bg-slate-900 transition-colors max-w-full"
              >
                <span className="truncate max-w-[240px]">{stat.path}</span>
                <span className="text-emerald-400 shrink-0">+{stat.added}</span>
                <span className="text-rose-400 shrink-0">-{stat.removed}</span>
              </button>
            ))}
          </div>
        )}

        {turn.commitSha && (
          <div className="flex items-center gap-2 text-[11px] font-mono rounded-[5px] border border-slate-800 bg-slate-950/50 px-2.5 py-1.5 text-slate-300">
            <GitCommit className="w-3.5 h-3.5" style={{ color: accent }} />
            <span className="text-slate-500 shrink-0">
              {turn.commitSha.slice(0, 7)}
            </span>
            <span className="truncate">
              chat: {turn.userMessage.slice(0, 80)}
            </span>
          </div>
        )}

        {turn.status === 'failed' && turn.error && (
          <div className="flex items-start gap-2 text-[11px] font-mono rounded-[5px] border border-rose-500/30 bg-rose-500/5 px-2.5 py-1.5 text-rose-200">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span className="break-words">{turn.error}</span>
          </div>
        )}

        {reverted && turn.revertedByTurnIndex !== null && (
          <div className="text-[11px] font-mono text-slate-500">
            reverted by turn {turn.revertedByTurnIndex + 1}
          </div>
        )}

        {isLatestApplied && !reverted && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => onUndo(turn.turnIndex)}
              disabled={undoing}
              className="inline-flex items-center gap-1 text-[11px] font-mono uppercase tracking-[0.16em] text-slate-400 hover:text-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {undoing ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <RotateCcw className="w-3 h-3" />
              )}
              Undo
            </button>
          </div>
        )}
      </div>
    </article>
  )
}

function StatusRow({ turn }: { turn: TurnCardData }) {
  if (turn.status === 'pending') {
    return (
      <div className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-[0.16em] text-slate-400">
        <Loader2 className="w-3 h-3 animate-spin" />
        Working…
      </div>
    )
  }
  if (turn.status === 'applied') {
    return (
      <div className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-[0.16em] text-emerald-400">
        <CheckCircle2 className="w-3 h-3" />
        Applied
        {typeof turn.latencyMs === 'number' && turn.latencyMs > 0 && (
          <span className="text-slate-500 normal-case tracking-normal">
            · {(turn.latencyMs / 1000).toFixed(1)}s
          </span>
        )}
        {typeof turn.costUsd === 'number' && turn.costUsd > 0 && (
          <span className="text-slate-500 normal-case tracking-normal">
            · ${turn.costUsd.toFixed(4)}
          </span>
        )}
      </div>
    )
  }
  if (turn.status === 'undone') {
    return (
      <div className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-[0.16em] text-slate-500">
        <RotateCcw className="w-3 h-3" />
        Reverted
      </div>
    )
  }
  return (
    <div className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-[0.16em] text-rose-400">
      <AlertCircle className="w-3 h-3" />
      Failed
    </div>
  )
}

function TimeAgo({ ms }: { ms: number | null }) {
  if (!ms) return null
  const diff = Date.now() - ms
  const mins = Math.floor(diff / 60000)
  const label =
    mins < 1 ? 'just now' : mins < 60 ? `${mins}m ago` : `${Math.floor(mins / 60)}h ago`
  return <span>{label}</span>
}

export const TurnCard = memo(TurnCardComponent)
