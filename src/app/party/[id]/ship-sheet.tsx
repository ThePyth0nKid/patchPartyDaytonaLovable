'use client'

// ShipSheet — centered modal (desktop) / bottom sheet (mobile) for the
// Ship-PR flow. Three states:
//
//   A. before-ship  — hidden; user clicks the Ship button in TurnColumn
//                     header to open.
//   B. confirming   — editable title + type chip + editable body +
//                     read-only file summary + Ship / Cancel.
//   C. shipped      — success card with PR link and an "Open in GitHub"
//                     button.
//
// Spec: planning/v2.1-iterate-ux/01-ux-spec.md §7. Closes S5 via server-
// side sanitisation in /api/party/[id]/pr — the client is free to edit
// anything; the server strips HTML comments and caps at 2000 chars before
// sending to GitHub.

import { useCallback, useEffect, useRef, useState } from 'react'
import { CheckCircle2, ExternalLink, X, Loader2 } from 'lucide-react'
import type { PersonaId } from '@/lib/personas'
import { csrfFetch } from '@/lib/client-fetch'
import { SHIP_BODY_MAX_LEN } from '@/lib/ship-body'
import {
  clearShipDraft,
  loadShipDraft,
  saveShipDraft,
} from '@/lib/ship-draft'

// Selector matching focusable elements inside the modal — used by the focus
// trap. Standard WAI-ARIA dialog pattern: keep Tab / Shift-Tab cycling
// inside the dialog container while it's open.
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

interface ShipPreview {
  title: string
  type: 'feat' | 'fix'
  body: string
  files: Array<{ path: string; added: number; removed: number }>
  turnCount: number
  totalCostUsd: number
}

interface ShipSheetProps {
  open: boolean
  partyId: string
  personaId: PersonaId
  personaName: string
  personaAccent: string
  prUrl: string | null
  onClose: () => void
  onShipped: (prUrl: string) => void
}

export function ShipSheet({
  open,
  partyId,
  personaId,
  personaName,
  personaAccent,
  prUrl,
  onClose,
  onShipped,
}: ShipSheetProps) {
  const [preview, setPreview] = useState<ShipPreview | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [type, setType] = useState<'feat' | 'fix'>('feat')
  const [shipping, setShipping] = useState(false)
  const [shipError, setShipError] = useState<string | null>(null)
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const previouslyFocused = useRef<HTMLElement | null>(null)

  // Load preview on first open. T4.3: if a localStorage draft exists for
  // this party, it takes precedence over the server-generated preview
  // title/body/type — the user's in-flight edits survive tab close /
  // reopen. The preview files list is always used from the server
  // (not persisted — it's derivable).
  useEffect(() => {
    if (!open) return
    if (preview) return
    let aborted = false
    setLoadingPreview(true)
    setPreviewError(null)

    const draft = loadShipDraft(partyId)
    if (draft) {
      setTitle(draft.title)
      setBody(draft.body)
      setType(draft.type)
    }

    ;(async () => {
      try {
        const res = await fetch(`/api/party/${partyId}/ship/preview`, {
          cache: 'no-store',
        })
        if (!res.ok) {
          const { error } = (await res.json().catch(() => ({}))) as {
            error?: string
          }
          throw new Error(error ?? `preview failed (${res.status})`)
        }
        const data = (await res.json()) as ShipPreview
        if (aborted) return
        setPreview(data)
        // Draft wins over preview: if the user already had edits in
        // flight, don't clobber them with the freshly-generated preview.
        if (!draft) {
          setTitle(data.title)
          setBody(data.body)
          setType(data.type)
        }
      } catch (err: unknown) {
        if (aborted) return
        setPreviewError(err instanceof Error ? err.message : String(err))
      } finally {
        if (!aborted) setLoadingPreview(false)
      }
    })()
    return () => {
      aborted = true
    }
  }, [open, partyId, preview])

  // Persist the editable fields to localStorage on change so reopening
  // the sheet restores the user's in-progress edits. Gated on `preview`
  // so we don't write the empty initial state over an existing draft
  // before the open-effect has had a chance to hydrate it. Also gated
  // on `!prUrl` so we stop persisting once the PR has shipped (the
  // success-path clear below handles removal).
  useEffect(() => {
    if (!open) return
    if (prUrl) return
    if (!preview) return
    saveShipDraft(partyId, { title, body, type })
  }, [open, partyId, preview, prUrl, title, body, type])

  // Close on Escape. Wired only when open so tab navigation elsewhere isn't
  // affected.
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !shipping) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose, shipping])

  // Focus trap — keep Tab / Shift-Tab cycling inside the dialog while open.
  // Remember the element that had focus before the sheet opened so we can
  // restore it on close (AAA accessibility pattern).
  useEffect(() => {
    if (!open) return
    const node = dialogRef.current
    if (!node) return
    previouslyFocused.current = document.activeElement as HTMLElement | null

    // Move initial focus onto the first focusable element inside the
    // dialog — fallback to the container itself if there isn't one yet
    // (eg. the preview is still loading).
    const initial = node.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)
    if (initial) {
      initial.focus()
    } else {
      node.focus()
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Tab') return
      if (!node) return
      const focusables = Array.from(
        node.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((el) => !el.hasAttribute('disabled'))
      if (focusables.length === 0) {
        e.preventDefault()
        node.focus()
        return
      }
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      const active = document.activeElement as HTMLElement | null
      if (e.shiftKey) {
        if (active === first || !node.contains(active)) {
          e.preventDefault()
          last.focus()
        }
      } else if (active === last) {
        e.preventDefault()
        first.focus()
      }
    }

    node.addEventListener('keydown', onKeyDown)
    return () => {
      node.removeEventListener('keydown', onKeyDown)
      // Restore focus to the button that opened the sheet — otherwise the
      // user lands on <body> and loses their place.
      previouslyFocused.current?.focus?.()
    }
    // Re-run when loadingPreview or the shipped state flips — each state
    // change swaps the set of focusable elements (form fields vs PR link).
  }, [open, loadingPreview, prUrl])

  const doShip = useCallback(async () => {
    if (shipping) return
    setShipping(true)
    setShipError(null)
    try {
      const res = await csrfFetch(`/api/party/${partyId}/pr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personaId,
          title: title.trim(),
          body,
          type,
        }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        prUrl?: string
        error?: string
      }
      if (!res.ok || !data.prUrl) {
        throw new Error(data.error ?? `ship failed (${res.status})`)
      }
      // T4.3: drop the persisted draft once the PR is open — reopening
      // after a successful ship should show the success card, not a
      // stale form prefilled from an already-shipped draft.
      clearShipDraft(partyId)
      onShipped(data.prUrl)
    } catch (err: unknown) {
      setShipError(err instanceof Error ? err.message : String(err))
    } finally {
      setShipping(false)
    }
  }, [shipping, partyId, personaId, title, body, type, onShipped])

  if (!open) return null

  const isShipped = !!prUrl
  const bodyOverCap = body.length > SHIP_BODY_MAX_LEN
  const shipDisabled =
    shipping ||
    isShipped ||
    loadingPreview ||
    title.trim().length === 0 ||
    bodyOverCap

  const files = preview?.files ?? []
  const totalAdded = files.reduce((s, f) => s + f.added, 0)
  const totalRemoved = files.reduce((s, f) => s + f.removed, 0)

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-6"
      onClick={() => {
        if (!shipping) onClose()
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ship-sheet-title"
        tabIndex={-1}
        className="relative bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-t-[12px] sm:rounded-[9px] w-full sm:max-w-2xl max-h-[92vh] overflow-hidden flex flex-col focus:outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="absolute inset-x-0 top-0 h-px"
          style={{
            background: `linear-gradient(90deg, transparent, ${personaAccent}, transparent)`,
          }}
        />

        <header className="px-5 sm:px-6 py-4 border-b border-slate-800/80 flex items-center justify-between">
          <div className="min-w-0">
            <div
              id="ship-sheet-title"
              className="text-[11px] font-mono font-semibold uppercase tracking-[0.18em] text-slate-300"
            >
              {isShipped ? 'PR opened' : 'Ship pull request'}
            </div>
            <div className="text-[11px] font-mono text-slate-500 truncate">
              {personaName} · party {partyId.slice(-8)}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={shipping}
            aria-label="Close"
            className="p-1.5 rounded-[5px] border border-slate-700 text-slate-300 hover:text-slate-50 hover:border-slate-600 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 space-y-4">
          {isShipped ? (
            <div className="flex flex-col items-center text-center py-6 gap-3">
              <CheckCircle2
                className="w-10 h-10"
                style={{
                  color: '#14B8A6',
                  filter: 'drop-shadow(0 0 18px #14B8A6)',
                }}
              />
              <div className="text-[14px] font-semibold text-slate-50">
                Pull request opened
              </div>
              <a
                href={prUrl!}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[12px] font-mono text-slate-200 hover:text-slate-50 underline decoration-slate-600 hover:decoration-slate-400 underline-offset-4"
              >
                {prUrl}
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          ) : loadingPreview ? (
            <div className="flex items-center gap-2 text-[12px] font-mono text-slate-400 py-8 justify-center">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Loading preview…
            </div>
          ) : previewError ? (
            <div className="text-[12px] font-mono text-red-300 py-6">
              Couldn&apos;t load preview — {previewError}. You can still ship
              without it (the server falls back to a canned body).
            </div>
          ) : (
            <>
              <div
                role="group"
                aria-labelledby="ship-title-label"
                className="space-y-1.5"
              >
                <label
                  id="ship-title-label"
                  htmlFor="ship-title"
                  className="block text-[10px] font-mono font-semibold uppercase tracking-[0.18em] text-slate-400"
                >
                  Title
                </label>
                <div className="flex gap-2">
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as 'feat' | 'fix')}
                    aria-label="PR type"
                    className="px-2 py-2 bg-slate-950 border border-slate-700 text-[12px] font-mono text-slate-200 rounded-[5px] hover:border-slate-600 focus:border-slate-500 focus:outline-none"
                  >
                    <option value="feat">feat</option>
                    <option value="fix">fix</option>
                  </select>
                  <input
                    id="ship-title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={200}
                    className="flex-1 px-3 py-2 bg-slate-950 border border-slate-700 text-[13px] text-slate-100 rounded-[5px] hover:border-slate-600 focus:border-slate-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="ship-body"
                  className="block text-[10px] font-mono font-semibold uppercase tracking-[0.18em] text-slate-400"
                >
                  Body
                  <span
                    className={`ml-2 text-[10px] font-mono ${
                      bodyOverCap ? 'text-red-300' : 'text-slate-500'
                    }`}
                  >
                    {body.length} / {SHIP_BODY_MAX_LEN}
                  </span>
                </label>
                <textarea
                  id="ship-body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={10}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 text-[12px] font-mono text-slate-100 rounded-[5px] hover:border-slate-600 focus:border-slate-500 focus:outline-none resize-y"
                />
                {bodyOverCap && (
                  <div className="text-[11px] font-mono text-red-300">
                    Body is over {SHIP_BODY_MAX_LEN} chars — trim it to ship.
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="text-[10px] font-mono font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Files changed ({files.length}) · +{totalAdded} / −
                  {totalRemoved}
                </div>
                <div className="bg-slate-950/60 border border-slate-800 rounded-[5px] divide-y divide-slate-800 max-h-40 overflow-y-auto">
                  {files.length === 0 ? (
                    <div className="px-3 py-3 text-[11px] font-mono text-slate-500">
                      No file changes recorded. Run a turn before shipping.
                    </div>
                  ) : (
                    files.map((f) => (
                      <div
                        key={f.path}
                        className="px-3 py-1.5 text-[11px] font-mono text-slate-200 flex items-center justify-between gap-2"
                      >
                        <span className="truncate">{f.path}</span>
                        <span className="shrink-0 text-slate-400">
                          <span className="text-emerald-300">+{f.added}</span>{' '}
                          <span className="text-red-300">−{f.removed}</span>
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
          {shipError && !isShipped && (
            <div className="text-[12px] font-mono text-red-300 border border-red-500/30 bg-red-500/5 rounded-[5px] px-3 py-2">
              {shipError}
            </div>
          )}
        </div>

        <footer className="px-5 sm:px-6 py-4 border-t border-slate-800/80 flex items-center justify-end gap-2">
          {isShipped ? (
            <>
              <a
                href={prUrl!}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[5px] bg-slate-50 text-slate-950 text-[12px] font-semibold hover:brightness-95"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open in GitHub
              </a>
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-2 rounded-[5px] border border-slate-700 text-slate-200 text-[12px] font-semibold hover:border-slate-600 hover:text-slate-50"
              >
                Close
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                disabled={shipping}
                className="px-3 py-2 rounded-[5px] border border-slate-700 text-slate-200 text-[12px] font-semibold hover:border-slate-600 hover:text-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void doShip()}
                disabled={shipDisabled}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[5px] bg-slate-50 text-slate-950 text-[12px] font-semibold hover:brightness-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {shipping && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {shipping ? 'Shipping…' : 'Ship it'}
              </button>
            </>
          )}
        </footer>
      </div>
    </div>
  )
}
