'use client'

// ViewportToggle — segmented Desktop / Mobile control for the preview pane.
//
// This is the skeleton form (T3.1): dumb segmented control, parent owns the
// state and the localStorage persistence. T3.6 wires it up end-to-end with
// tooltip + the honest-limitation disclaimer.

import { Monitor, Smartphone, HelpCircle } from 'lucide-react'

export type Viewport = 'desktop' | 'mobile'

interface ViewportToggleProps {
  value: Viewport
  onChange: (v: Viewport) => void
}

export function ViewportToggle({ value, onChange }: ViewportToggleProps) {
  return (
    <div className="inline-flex items-center gap-2">
      <div
        className="inline-flex bg-slate-950 border border-slate-700 rounded-[7px] p-0.5"
        role="radiogroup"
        aria-label="Preview viewport"
      >
        <button
          type="button"
          role="radio"
          aria-checked={value === 'desktop'}
          onClick={() => onChange('desktop')}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] rounded-[5px] transition-colors ease-linear ${
            value === 'desktop'
              ? 'bg-slate-50 text-slate-950 font-semibold'
              : 'text-slate-200 hover:text-slate-50 hover:bg-slate-800/50'
          }`}
        >
          <Monitor className="w-3.5 h-3.5" />
          Desktop
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={value === 'mobile'}
          onClick={() => onChange('mobile')}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] rounded-[5px] transition-colors ease-linear ${
            value === 'mobile'
              ? 'bg-slate-50 text-slate-950 font-semibold'
              : 'text-slate-200 hover:text-slate-50 hover:bg-slate-800/50'
          }`}
        >
          <Smartphone className="w-3.5 h-3.5" />
          Mobile
        </button>
      </div>
      {value === 'mobile' && (
        <span
          className="inline-flex items-center text-slate-500"
          title="Mobile preview approximates layout via pane width. Cross-origin iframes may not re-run all responsive logic exactly — ship and verify on a real device."
        >
          <HelpCircle className="w-3.5 h-3.5" />
        </span>
      )}
    </div>
  )
}
