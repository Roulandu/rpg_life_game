import { Sparkles } from 'lucide-react'
import type { AiNarrative } from '../../../domain/types'
import { SectionTitle } from '../../components/Card'
import { AiErrorCard, NarrativeCard, NarrativeSkeleton } from './NarrativeCard'

export function AiNarrativeSection({
  busy,
  error,
  narrative,
  onDismiss,
  onContinue,
}: {
  busy: boolean
  error: string | null
  narrative: AiNarrative | null
  onDismiss: () => void
  onContinue: () => void
}) {
  return (
    <section className="mb-3">
      <SectionTitle
        right={
          <span className="flex items-center gap-1 text-[10px] text-teal">
            <Sparkles size={11} /> AI 生成
          </span>
        }
      >
        本周 GM
      </SectionTitle>
      {busy ? <NarrativeSkeleton /> : narrative ? <NarrativeCard narrative={narrative} onContinue={onContinue} /> : null}
      {error ? <AiErrorCard error={error} onDismiss={onDismiss} /> : null}
    </section>
  )
}
