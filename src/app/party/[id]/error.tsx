'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, RotateCw } from 'lucide-react'

interface ErrorPageProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function PartyErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error('[party-error]', error)
  }, [error])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-sans flex items-center justify-center px-6">
      <div className="max-w-lg w-full rounded-[12px] border border-slate-800 bg-slate-900/60 p-8">
        <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.18em] text-[#F87171]">
          <AlertTriangle className="w-3.5 h-3.5" />
          Party crashed
        </div>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">
          We lost the thread on this party.
        </h1>
        <p className="mt-3 text-[14px] text-slate-400">
          This is usually a transient Daytona or GitHub blip. Retry or go start
          a fresh one. Your usage wasn&apos;t charged if no agents finished.
        </p>
        {error.digest && (
          <p className="mt-3 text-[11px] font-mono text-slate-500">
            ref: {error.digest}
          </p>
        )}
        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[7px] bg-gradient-to-r from-[#E879F9] via-[#A78BFA] to-[#60A5FA] text-black font-semibold text-sm"
          >
            <RotateCw className="w-4 h-4" />
            Reload
          </button>
          <Link
            href="/app/new"
            className="px-4 py-2 rounded-[7px] border border-slate-700 hover:border-slate-500 text-[13px]"
          >
            New party
          </Link>
        </div>
      </div>
    </div>
  )
}
