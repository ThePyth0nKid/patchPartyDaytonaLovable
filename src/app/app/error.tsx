'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, RotateCw } from 'lucide-react'

interface ErrorPageProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function AppErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error('[app-error]', error)
  }, [error])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-sans flex items-center justify-center px-6">
      <div className="max-w-lg w-full rounded-[12px] border border-slate-800 bg-slate-900/60 p-8">
        <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.18em] text-[#F87171]">
          <AlertTriangle className="w-3.5 h-3.5" />
          Something went wrong
        </div>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">
          That didn&apos;t land.
        </h1>
        <p className="mt-3 text-[14px] text-slate-400">
          We hit an unexpected error. You can retry, or head back to your
          dashboard. If it keeps happening,{' '}
          <a
            href="mailto:hello@patchparty.dev?subject=PatchParty error"
            className="underline hover:text-slate-100"
          >
            drop us a note
          </a>{' '}
          with what you were doing.
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
            Try again
          </button>
          <Link
            href="/app"
            className="px-4 py-2 rounded-[7px] border border-slate-700 hover:border-slate-500 text-[13px]"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
