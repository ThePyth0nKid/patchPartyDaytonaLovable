'use client'

// PreviewPane — the left ~55% of the iterate layout.
//
// Extracted from the old inline PreviewFrame that lived in page.tsx so we
// can compose it with the ViewportToggle + status strip. Keeps the exact
// sandbox, referrerpolicy, loader and timeout behavior from the pre-pick
// Compare view so nothing regresses visually when the user picks a persona.
//
// Viewport handling (T3.6 wires this up end-to-end):
//   - `desktop` → iframe fills the pane (w-full h-full).
//   - `mobile`  → iframe rendered inside a fixed 390×844 device frame.
// Critically: the `src` prop never changes when the viewport toggles, so
// the iframe stays mounted and HMR keeps working.

import type { LucideIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { ViewportToggle, type Viewport } from './viewport-toggle'

export function encodePreviewTarget(url: string, token?: string): string {
  const json = JSON.stringify(token ? { url, token } : { url })
  return btoa(json).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function Spinner({
  className = '',
  color = 'currentColor',
}: {
  className?: string
  color?: string
}) {
  return (
    <svg
      className={`animate-spin ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Loading"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke={color}
        strokeOpacity="0.2"
        strokeWidth="2"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

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
  icon: Icon,
  viewport,
  onViewportChange,
  lastCommitSha,
  sandboxState,
}: PreviewPaneProps) {
  const [loaded, setLoaded] = useState(false)
  const [timedOut, setTimedOut] = useState(false)

  useEffect(() => {
    setLoaded(false)
    setTimedOut(false)
    const t = setTimeout(() => setTimedOut(true), 20000)
    return () => clearTimeout(t)
  }, [src])

  const iframeEl = (
    <iframe
      src={src}
      title={title}
      onLoad={() => setLoaded(true)}
      // See page.tsx for the rationale on each permission.
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups-to-escape-sandbox"
      referrerPolicy="no-referrer"
      className={`w-full h-full bg-white transition-opacity duration-500 ease-linear ${
        loaded ? 'opacity-100' : 'opacity-0'
      }`}
    />
  )

  return (
    <div className="flex flex-col gap-3 min-h-0">
      <div className="flex items-center gap-3">
        <ViewportToggle value={viewport} onChange={onViewportChange} />
        <div className="ml-auto text-[11px] font-mono text-slate-400 truncate">
          {title}
        </div>
      </div>

      {/*
        Explicit height is load-bearing: `h-full` on the iframe resolves
        against its nearest ancestor with a concrete height, and a grid
        cell with `items-start` + a flex parent with only `min-height`
        leaves the iframe at its HTML default (≈150 px). Using svh
        (small-viewport-height) so mobile-browser chrome doesn't crop
        us. `min-h-[520px]` is the floor for short viewports.
      */}
      <div className="relative bg-slate-950 rounded-[7px] overflow-hidden border border-slate-800 h-[calc(100svh-9rem)] min-h-[520px]">
        {viewport === 'desktop' ? (
          <div className="w-full h-full">{iframeEl}</div>
        ) : (
          <div className="w-full h-full flex items-center justify-center p-4 bg-slate-950">
            <div className="w-[390px] h-[780px] max-h-full rounded-[24px] border-[6px] border-slate-700 overflow-hidden shadow-[0_0_40px_-12px_rgba(167,139,250,0.4)]">
              {iframeEl}
            </div>
          </div>
        )}
        {!loaded && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-slate-950 pointer-events-none">
            <div
              aria-hidden
              className="absolute inset-0"
              style={{
                background: `radial-gradient(ellipse 60% 40% at 50% 50%, ${accent}25, transparent 60%)`,
              }}
            />
            <Icon
              className="w-12 h-12 relative animate-pulse-slow"
              strokeWidth={1.5}
              style={{
                color: accent,
                filter: `drop-shadow(0 0 20px ${accent})`,
              }}
            />
            <div className="relative flex items-center gap-2 text-[12px] font-mono uppercase tracking-[0.2em] text-slate-200">
              <Spinner className="w-3.5 h-3.5" color={accent} />
              {timedOut ? 'Sandbox taking its time…' : 'Warming up sandbox'}
            </div>
            {timedOut && (
              <div className="relative text-[11px] font-mono text-slate-400 max-w-xs text-center px-4">
                Preview takes ~15–30s on first load — Next.js installs deps
                inside the sandbox.
              </div>
            )}
          </div>
        )}
      </div>

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
