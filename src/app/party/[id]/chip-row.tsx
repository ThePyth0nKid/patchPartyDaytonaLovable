'use client'

// ChipRow — 5 hard-coded quick-action chips above the textarea.
//
// Templates are literal client-side constants. Per 05-security-checklist.md
// S7, NO merge fields, NO runtime interpolation of filenames / branch /
// issue titles — that would open a prompt-injection surface (an attacker
// could socially engineer a filename containing `"; rm -rf /"` or an
// instruction like "ignore all previous prompts").
//
// If a future chip needs file context, the user types the file themselves.
//
// `Undo last` is a direct action (no textarea pass-through). The wiring
// lives in T3.4 — until then, this component calls `onUndo?.()` which
// the parent can leave undefined and the button renders as disabled.

import type { ReactNode } from 'react'
import { Scissors, FlaskConical, Hammer, Smartphone, Undo2 } from 'lucide-react'

export interface ChipTemplate {
  readonly id: 'shorter' | 'add-tests' | 'run-build' | 'mobile-first' | 'undo-last'
  readonly label: string
  readonly icon: ReactNode
  readonly kind: 'insert' | 'action'
  // Only set for kind === 'insert'.
  readonly prompt?: string
}

// Hard-coded. Tests in tests/chip-templates.test.ts lock this array down so
// no contributor can accidentally introduce a template with `${…}`.
export const CHIP_TEMPLATES: readonly ChipTemplate[] = [
  {
    id: 'shorter',
    label: 'Shorter',
    icon: <Scissors className="w-3 h-3" />,
    kind: 'insert',
    prompt:
      'Make the most recent change more concise — aim for half the lines without losing behavior.',
  },
  {
    id: 'add-tests',
    label: 'Add tests',
    icon: <FlaskConical className="w-3 h-3" />,
    kind: 'insert',
    prompt:
      'Add unit tests for the files you just changed. Use the existing test runner and conventions in this repo.',
  },
  {
    id: 'run-build',
    label: 'Run build',
    icon: <Hammer className="w-3 h-3" />,
    kind: 'insert',
    prompt: 'Run `npm run build` and fix any errors you find.',
  },
  {
    id: 'mobile-first',
    label: 'Mobile-first',
    icon: <Smartphone className="w-3 h-3" />,
    kind: 'insert',
    prompt:
      'Review the latest change on a mobile viewport (390px). Fix any layout issues.',
  },
  {
    id: 'undo-last',
    label: 'Undo last',
    icon: <Undo2 className="w-3 h-3" />,
    kind: 'action',
  },
] as const

interface ChipRowProps {
  onInsert: (prompt: string) => void
  onUndo?: () => void
  undoDisabled?: boolean
  disabled?: boolean
}

export function ChipRow({
  onInsert,
  onUndo,
  undoDisabled,
  disabled,
}: ChipRowProps) {
  return (
    <div className="flex flex-wrap gap-1.5 mb-2">
      {CHIP_TEMPLATES.map((chip) => {
        const isUndo = chip.kind === 'action'
        const chipDisabled =
          disabled || (isUndo && (undoDisabled || !onUndo))
        return (
          <button
            key={chip.id}
            type="button"
            disabled={chipDisabled}
            onClick={() => {
              if (chip.kind === 'insert' && chip.prompt) {
                onInsert(chip.prompt)
              } else if (isUndo) {
                onUndo?.()
              }
            }}
            className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-[5px] border border-slate-700 text-[11px] font-mono uppercase tracking-[0.14em] text-slate-300 hover:border-slate-500 hover:text-slate-100 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-slate-700 disabled:hover:text-slate-300 transition-colors"
          >
            {chip.icon}
            {chip.label}
          </button>
        )
      })}
    </div>
  )
}
