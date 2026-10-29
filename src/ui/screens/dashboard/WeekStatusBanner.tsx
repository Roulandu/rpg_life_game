import type { AiNarrative } from '../../../domain'
import { AiNarrativeSection } from './AiNarrativeSection'
import { PendingMomentsCard } from './PendingMomentsCard'

export function WeekStatusBanner({
  pendingCount,
  aiBusy,
  aiError,
  narrative,
  onDismiss,
  onContinue,
}: {
  pendingCount: number
  aiBusy: boolean
  aiError: string | null
  narrative: AiNarrative | null
  onDismiss: () => void
  onContinue: () => void
}) {
  if (pendingCount > 0) return <PendingMomentsCard pendingCount={pendingCount} />
  if (!aiBusy && !aiError && !narrative) return null
  return (
    <AiNarrativeSection
      busy={aiBusy}
      error={aiError}
      narrative={narrative}
      onDismiss={onDismiss}
      onContinue={onContinue}
    />
  )
}
