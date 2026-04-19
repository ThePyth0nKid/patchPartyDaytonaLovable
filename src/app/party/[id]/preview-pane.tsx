'use client'

// PreviewPane — the preview column of the iterate layout.
//
// Composition:
//   <header> ViewportToggle + truncated title
//   <body>   PreviewFrame (desktop) | phone-frame > PreviewFrame (mobile)
//   <footer> sandbox-state dot + last-commit pill
//
// History: this file used to carry its own iframe + loading overlay +
// encodePreviewTarget + Spinner. Extracted in the wide-screen refactor:
//   - iframe/overlay/border → <PreviewFrame> (`./preview-frame.tsx`)
//   - encodePreviewTarget   → `@/lib/preview-target`
//   - Spinner               → `@/components/ui/spinner`
// ComparePanel on the party page now reuses PreviewFrame too — one
// codepath for iframe chrome.

import type { LucideIcon } from 'lucide-react'
import { PreviewFrame } from './preview-frame'
import { ViewportToggle, type Viewport } from './viewport-toggle'

interface PreviewPaneProps {
  src: string
  title: string
  accent: string
  icon: LucideIcon
  viewport: Viewport
  onViewportChange: (v: Viewport) => void
  /** Optional 7-char commit SHA shown in the status strip. */
  lastCommitSha?: string | null
  /** Sandbox lifecycle state for the status dot. */
  sandboxState?: string
}

export function PreviewPane({
  src,
  title,
  accent,
  icon,
  viewport,
  onViewportChange,
  lastCommitSha,
  sandboxState,
}: PreviewPaneProps) {
  // Explicit body height is load-bearing: `h-full` inside children
  // resolves against the nearest ancestor with a concrete height. `svh`
  // (small-viewport-height) so mobile-browser chrome doesn't crop the
  // iframe; `min-h-[520px]` is the floor for short viewports.
  const bodyHeight = 'h-[calc(100svh-9rem)] min-h-[520px]'

  return (
    <div className="flex flex-col gap-3 min-h-0">
      <div className="flex items-center gap-3">
        <ViewportToggle value={viewport} onChange={onViewportChange} />
        <div className="ml-auto text-[11px] font-mono text-slate-400 truncate">
          {title}
        </div>
      </div>

      {viewport === 'desktop' ? (
        <PreviewFrame
          src={src}
          title={title}
          accent={accent}
          icon={icon}
          className={bodyHeight}
        />
      ) : (
        <div
          className={`relative flex items-center justify-center w-full bg-slate-950 rounded-[7px] overflow-hidden border border-slate-800 p-4 ${bodyHeight}`}
        >
          <div className="w-[390px] h-[780px] max-h-full rounded-[24px] border-[6px] border-slate-700 overflow-hidden shadow-[0_0_40px_-12px_rgba(167,139,250,0.4)]">
            <PreviewFrame
              src={src}
              title={title}
              accent={accent}
              icon={icon}
              className="w-full h-full rounded-none border-0"
            />
          </div>
        </div>
      )}

      {(lastCommitSha || sandboxState) && (
        <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400">
          {sandboxState && (
            <span className="inline-flex items-center gap-1.5">
              <span
                className={`inline-flex h-1.5 w-1.5 rounded-full ${
                  sandboxState === 'ACTIVE'
                    ? 'bg-[#14B8A6] shadow-[0_0_6px_#14B8A6]'
                    : sandboxState === 'IDLE_WARN'
                      ? 'bg-amber-300 shadow-[0_0_6px_#fbbf24]'
                      : 'bg-slate-500'
                }`}
              />
              {sandboxState.toLowerCase()}
            </span>
          )}
          {lastCommitSha && (
            <span className="inline-flex items-center gap-1.5">
              <span className="text-slate-500">commit</span>
              {lastCommitSha.slice(0, 7)}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
