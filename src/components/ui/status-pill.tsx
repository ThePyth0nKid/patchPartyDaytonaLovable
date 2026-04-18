import type { PartyStatus } from '@prisma/client'
import { CheckCircle2, AlertCircle, Loader2, Ban } from 'lucide-react'

const STYLES: Record<
  PartyStatus,
  { label: string; color: string; Icon: typeof CheckCircle2 }
> = {
  RUNNING: { label: 'Running', color: '#A78BFA', Icon: Loader2 },
  DONE: { label: 'Done', color: '#14B8A6', Icon: CheckCircle2 },
  FAILED: { label: 'Failed', color: '#F87171', Icon: AlertCircle },
  CANCELED: { label: 'Canceled', color: '#94A3B8', Icon: Ban },
}

interface StatusPillProps {
  status: PartyStatus
}

export function StatusPill({ status }: StatusPillProps) {
  const style = STYLES[status]
  const Icon = style.Icon
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[11px] font-mono uppercase tracking-[0.14em]"
      style={{
        color: style.color,
        borderColor: `${style.color}55`,
        background: `${style.color}15`,
      }}
    >
      <Icon
        className={`w-3 h-3 ${status === 'RUNNING' ? 'animate-spin' : ''}`}
      />
      {style.label}
    </span>
  )
}
