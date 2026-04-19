'use client'

// SandboxBanner — thin wrapper over the existing ResumeCard component so
// the IteratePage can import a semantically-named banner and we can evolve
// the visual treatment independently of the underlying resume/pause logic.

import { ResumeCard } from './resume-card'

interface SandboxBannerProps {
  partyId: string
  sandboxState: string
  onResumed?: () => void
}

export function SandboxBanner({
  partyId,
  sandboxState,
  onResumed,
}: SandboxBannerProps) {
  return (
    <ResumeCard
      partyId={partyId}
      sandboxState={sandboxState}
      onResumed={onResumed}
    />
  )
}
