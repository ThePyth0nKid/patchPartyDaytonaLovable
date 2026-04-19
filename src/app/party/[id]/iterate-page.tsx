'use client'

// IteratePage — post-pick layout.
//
// T3.1 scope: skeleton extraction. We move the preview iframe + chat pane
// out of page.tsx and into this file so later tasks (T3.2 TurnCard, T3.3
// InputDock chips, T3.5 ShipSheet, T3.6 ViewportToggle wiring) can swap
// in the new primitives without touching the party page.
//
// Layout (desktop, lg:1024+): `grid lg:grid-cols-[minmax(0,1fr)_480px]`.
// Below `lg` the grid collapses to a single column and the preview pane
// renders above the turn column, matching the spec in 01-ux-spec.md §1.

import type { LucideIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { SandboxState } from '@/lib/types'
import type { PersonaId } from '@/lib/personas'
import { TurnColumn } from './turn-column'
import { PreviewPane } from './preview-pane'
import { encodePreviewTarget } from '@/lib/preview-target'
import { SandboxBanner } from './sandbox-banner'
import type { Viewport } from './viewport-toggle'

const VIEWPORT_STORAGE_KEY = 'patchparty:viewport'

interface IteratePageProps {
  partyId: string
  partyTitle: string
  personaId: PersonaId
  personaName: string
  personaAccent: string
  personaIcon: LucideIcon
  previewUrl: string | undefined
  previewToken: string | undefined
  sandboxState: SandboxState | string
  onSandboxResumed: () => void
  onShipPR: () => void
  shippingPr: boolean
  prUrl: string | null
}

export function IteratePage({
  partyId,
  partyTitle,
  personaId,
  personaName,
  personaAccent,
  personaIcon,
  previewUrl,
  previewToken,
  sandboxState,
  onSandboxResumed,
  onShipPR,
  shippingPr,
  prUrl,
}: IteratePageProps) {
  const [viewport, setViewport] = useState<Viewport>('desktop')

  // Hydrate from localStorage on mount so a user's last choice persists
  // across parties. Must run client-only — hence the useEffect.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(VIEWPORT_STORAGE_KEY)
      if (saved === 'mobile' || saved === 'desktop') setViewport(saved)
    } catch {
      /* localStorage disabled — fall back to the default */
    }
  }, [])

  function handleViewportChange(v: Viewport) {
    setViewport(v)
    try {
      window.localStorage.setItem(VIEWPORT_STORAGE_KEY, v)
    } catch {
      /* ignore — persistence is best-effort */
    }
  }

  const previewSrc = previewUrl
    ? `/api/preview/${encodePreviewTarget(previewUrl, previewToken)}/`
    : null

  const chatDisabled =
    sandboxState === 'PAUSED' ||
    sandboxState === 'TERMINATED' ||
    sandboxState === 'RESUMING'

  return (
    <section className="max-w-[min(1920px,calc(100vw-4rem))] mx-auto px-6 xl:px-8 2xl:px-12 pb-12 space-y-4">
      <SandboxBanner
        partyId={partyId}
        sandboxState={sandboxState}
        onResumed={onSandboxResumed}
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_480px] items-start">
        <div className="lg:sticky lg:top-16 min-w-0">
          {previewSrc ? (
            <PreviewPane
              src={previewSrc}
              title={`${personaName} — ${partyTitle}`}
              accent={personaAccent}
              icon={personaIcon}
              viewport={viewport}
              onViewportChange={handleViewportChange}
              sandboxState={sandboxState}
            />
          ) : (
            <div className="rounded-[7px] border border-slate-800 bg-slate-900/60 p-6 text-[13px] text-slate-300">
              No live preview — sandbox terminated or agent has no preview URL.
            </div>
          )}
        </div>

        {/*
          The chat-column wrapper mirrors the preview-column height anchor
          above: `lg:sticky lg:top-16 lg:h-[calc(100svh-9rem)]`. Without
          this, TurnColumn's `h-full min-h-0` outer resolves to zero and
          the log's internal `overflow-y-auto` never activates — the whole
          page scrolls instead.
        */}
        <div className="min-w-0 lg:sticky lg:top-16 lg:h-[calc(100svh-9rem)]">
          <TurnColumn
            partyId={partyId}
            partyTitle={partyTitle}
            personaName={personaName}
            personaAccent={personaAccent}
            sandboxState={sandboxState}
            disabled={chatDisabled}
            onShipPR={onShipPR}
            shippingPr={shippingPr}
            prUrl={prUrl}
          />
        </div>
      </div>
    </section>
  )
}
