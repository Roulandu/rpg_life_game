import { ChevronRight, Inbox } from 'lucide-react'
import type { GameEvent } from '../../../domain/types'
import { Card } from '../../components/Card'
import { effectList } from '../../labels'

interface Props {
  event: GameEvent
  onChoose: (eventId: string, choiceId: string) => void
}

export function OpenEventCard({ event, onChoose }: Props) {
  return (
    <Card className="border-accent/25">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Inbox size={15} className="text-accent" />
          <h2 className="text-sm font-semibold text-text">{event.title}</h2>
        </div>
        <span className="chip shrink-0">第 {event.week} 周</span>
      </div>
      <p className="text-[12px] leading-relaxed text-muted">{event.body}</p>
      <div className="mt-3 space-y-1.5">
        {event.choices.map((choice) => (
          <button
            key={choice.id}
            type="button"
            className="w-full rounded-xl border border-line bg-card-2 px-3 py-2.5 text-left transition hover:border-accent/50"
            onClick={() => onChoose(event.id, choice.id)}
          >
            <span className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-text">{choice.label}</span>
              <ChevronRight size={14} className="shrink-0 text-dim" />
            </span>
            {choice.description ? (
              <span className="mt-0.5 block text-[10px] leading-relaxed text-muted">{choice.description}</span>
            ) : null}
            {choice.effects.length > 0 ? (
              <span className="mt-1 block text-[10px] text-teal">{effectList(choice.effects)}</span>
            ) : null}
          </button>
        ))}
      </div>
    </Card>
  )
}
