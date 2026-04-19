'use client'

// InputDock — sticky bottom of TurnColumn. Wraps ChipRow + textarea + send.
//
// The draft/sending state stays in the parent (TurnColumn) because the
// chat send flow needs to mutate the same turns state that drives the
// list. This component is just presentation + event plumbing.

import { ArrowUp, Loader2 } from 'lucide-react'
import type { KeyboardEvent } from 'react'
import { ChipRow } from './chip-row'

interface InputDockProps {
  draft: string
  onDraftChange: (draft: string) => void
  onSend: () => void
  onUndo?: () => void
  undoDisabled?: boolean
  sending: boolean
  disabled?: boolean
  placeholder: string
  canSend: boolean
}

export function InputDock({
  draft,
  onDraftChange,
  onSend,
  onUndo,
  undoDisabled,
  sending,
  disabled,
  placeholder,
  canSend,
}: InputDockProps) {
  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    // Gate on canSend so Enter on an empty/atCap draft doesn't swallow the
    // keystroke. Shift+Enter = newline; Cmd+Enter is reserved for future
    // power-user binding and currently falls through to the browser default.
    if (e.key === 'Enter' && !e.shiftKey && !e.metaKey && canSend) {
      e.preventDefault()
      onSend()
    }
  }

  function insertTemplate(prompt: string) {
    // Full-replace semantics (not append): chip templates are self-contained
    // prompts per UX spec §5. Appending to an existing draft would produce
    // ambiguous mixed instructions. If the user had half a draft and hits
    // a chip, they lose that draft — the chip set is small enough that
    // misclicks are rare, and an undo-draft affordance isn't worth the
    // complexity for v2.1.
    onDraftChange(prompt)
  }

  return (
    <div className="border-t border-slate-800/80 p-3">
      <ChipRow
        onInsert={insertTemplate}
        onUndo={onUndo}
        undoDisabled={undoDisabled}
        disabled={disabled || sending}
      />
      <div className="flex items-end gap-2">
        <textarea
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={!!disabled || sending}
          rows={2}
          placeholder={placeholder}
          aria-label={placeholder}
          className="flex-1 resize-none bg-slate-950 border border-slate-800 rounded-[7px] px-3 py-2 text-[13px] text-slate-100 placeholder-slate-600 focus:outline-none focus:border-slate-600 disabled:opacity-60"
        />
        <button
          type="button"
          onClick={onSend}
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
    </div>
  )
}
