'use client'

// DiffDrawer — unified diff viewer opened from TurnCard file pills.
//
// Two hard security rules (closes S2 in 05-security-checklist.md):
//
//   1. All rendering goes through React text nodes (auto-escaped). We use
//      prism-react-renderer's `Highlight` render-prop API, which yields
//      token arrays we map into <span>{token.content}</span>. There is NO
//      `dangerouslySetInnerHTML` anywhere in the diff path.
//
//   2. Diff content is fetched from our own /api/.../diff endpoint which
//      itself validates path + resolves via commit SHA. We don't let the
//      client pass arbitrary strings to the highlighter.
//
// Interaction: the component is a modal dialog, closed by Escape or the
// backdrop click. Cached fetches keyed by (turnIndex, path) live in the
// parent component — DiffDrawer just renders.

import { useEffect, useRef } from 'react'
import { X, Loader2 } from 'lucide-react'
import { Highlight, themes } from 'prism-react-renderer'
import { classify, type DiffLineKind } from './diff-classify'

export { classify }
export type { DiffLineKind }

interface DiffDrawerProps {
  open: boolean
  onClose: () => void
  file: { path: string; added: number; removed: number } | null
  unifiedDiff: string | null
  loading: boolean
  error: string | null
  sha?: string | null
}

export function DiffDrawer({
  open,
  onClose,
  file,
  unifiedDiff,
  loading,
  error,
  sha,
}: DiffDrawerProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open || !file) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={`Diff for ${file.path}`}
        className="w-full max-w-3xl max-h-[80vh] flex flex-col bg-slate-950 border border-slate-800 rounded-[7px] overflow-hidden shadow-2xl"
      >
        <header className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
          <div className="min-w-0">
            <div className="font-mono text-[13px] text-slate-100 truncate">
              {file.path}
            </div>
            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate-500 mt-0.5">
              <span className="text-emerald-400">+{file.added}</span>
              <span className="text-slate-600 mx-1">·</span>
              <span className="text-rose-400">-{file.removed}</span>
              {sha && (
                <>
                  <span className="text-slate-600 mx-1">·</span>
                  <span>{sha.slice(0, 7)}</span>
                </>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close diff"
            className="shrink-0 inline-flex items-center justify-center h-8 w-8 rounded-[5px] text-slate-400 hover:text-slate-100 hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="flex-1 min-h-0 overflow-auto bg-slate-950 font-mono text-[12px]">
          {loading && (
            <div className="flex items-center gap-2 px-4 py-6 text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-[12px]">Loading diff…</span>
            </div>
          )}
          {error && !loading && (
            <div className="px-4 py-6 text-[12px] text-rose-300">
              {error}
            </div>
          )}
          {!loading && !error && (
            <DiffBody diff={unifiedDiff ?? ''} />
          )}
        </div>
      </div>
    </div>
  )
}

function DiffBody({ diff }: { diff: string }) {
  if (!diff.trim()) {
    return (
      <div className="px-4 py-6 text-[12px] text-slate-500">
        No diff available (file may be binary or the commit has no text
        changes for this path).
      </div>
    )
  }

  // Split into lines once; per-line we pick a background (added / removed /
  // hunk-header / context) and then hand the line text to prism-react
  // -renderer for token-level syntax highlighting. The renderer's render
  // prop yields React elements — no raw HTML strings.
  const lines = diff.split('\n')

  return (
    <div className="py-2">
      {lines.map((line, i) => (
        <DiffLine key={i} line={line} />
      ))}
    </div>
  )
}

function DiffLine({ line }: { line: string }) {
  const kind = classify(line)
  const bg =
    kind === 'added'
      ? 'bg-emerald-500/10'
      : kind === 'removed'
        ? 'bg-rose-500/10'
        : kind === 'hunk'
          ? 'bg-slate-800/60'
          : kind === 'meta'
            ? 'bg-slate-900/80'
            : 'bg-transparent'
  const marker =
    kind === 'added'
      ? '+'
      : kind === 'removed'
        ? '-'
        : kind === 'hunk'
          ? '@'
          : ' '
  const markerColor =
    kind === 'added'
      ? 'text-emerald-400'
      : kind === 'removed'
        ? 'text-rose-400'
        : 'text-slate-500'
  // Strip the leading +/-/space so syntax highlighting applies to the code
  // only, not the diff marker.
  const codePart = kind === 'added' || kind === 'removed' || kind === 'context'
    ? line.slice(1)
    : line
  return (
    <div className={`flex ${bg} px-2 leading-[1.5]`}>
      <span
        className={`select-none w-5 shrink-0 text-center ${markerColor}`}
        aria-hidden
      >
        {marker}
      </span>
      <pre className="whitespace-pre-wrap break-words min-w-0 flex-1 m-0">
        <Highlight
          theme={themes.oneDark}
          code={codePart}
          language="tsx"
        >
          {({ tokens, getTokenProps }) => (
            <>
              {tokens.map((tokenLine, lineIdx) => (
                <span key={lineIdx}>
                  {tokenLine.map((token, tokenIdx) => (
                    <span
                      key={tokenIdx}
                      {...getTokenProps({ token })}
                    />
                  ))}
                </span>
              ))}
            </>
          )}
        </Highlight>
      </pre>
    </div>
  )
}

