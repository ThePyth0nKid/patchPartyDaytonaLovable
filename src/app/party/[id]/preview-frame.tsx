'use client'

// PreviewFrame — the dumb iframe primitive.
//
// Extracted from the old inline duplicates in page.tsx and preview-pane.tsx
// so PreviewPane (post-pick iterate view) and ComparePanel (pre-pick
// candidate modal) both reuse the same sandbox attrs, loader, timeout, and
// accent-pulse styling. The outer wrapper's height comes from the caller
// via `className` — this primitive has no layout opinion beyond "fill me".

import type { LucideIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Spinner } from '@/components/ui/spinner'

interface PreviewFrameProps {
  src: string
  title: string
  accent: string
  icon: LucideIcon
  /** Tailwind classes merged into the outer wrapper (height etc.). */
  className?: string
}

export function PreviewFrame({
  src,
  title,
  accent,
  icon: Icon,
  className = '',
}: PreviewFrameProps) {
  const [loaded, setLoaded] = useState(false)
  const [timedOut, setTimedOut] = useState(false)

  useEffect(() => {
    setLoaded(false)
    setTimedOut(false)
    const t = setTimeout(() => setTimedOut(true), 20000)
    return () => clearTimeout(t)
  }, [src])

  return (
    <div
      className={`relative bg-slate-950 rounded-[7px] overflow-hidden border border-slate-800 ${className}`}
    >
      <iframe
        src={src}
        title={title}
        onLoad={() => setLoaded(true)}
        // allow-scripts + allow-same-origin: the preview app runs its own
        //   JS and XHRs to its own origin (HMR, in-app fetches).
        // allow-forms: the preview is a live app — forms should submit.
        // allow-popups-to-escape-sandbox: an `<a target="_blank">` inside
        //   the preview opens a normal window, not a nested sandbox.
        // allow-top-navigation is absent on purpose — a compromised preview
        //   must not be able to navigate the parent frame away.
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups-to-escape-sandbox"
        referrerPolicy="no-referrer"
        className={`w-full h-full bg-white transition-opacity duration-500 ease-linear ${
          loaded ? 'opacity-100' : 'opacity-0'
        }`}
      />
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
          <div className="relative flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="h-1 w-6 rounded-full animate-pulse"
                style={{
                  background: accent,
                  opacity: 0.25,
                  animationDelay: `${i * 0.15}s`,
                }}
              />
            ))}
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
  )
}
