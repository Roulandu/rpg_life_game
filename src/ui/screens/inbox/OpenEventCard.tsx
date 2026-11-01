import { ChevronRight, Inbox } from 'lucide-react'
import type { GameEvent } from '../../../domain'
import { formatDayLabel } from '../../../lib'
import { Card } from '../../components/Card'
import { effectList } from '../../labels'

interface Props {
  event: GameEvent
  today: number
  onChoose: (eventId: string, choiceId: string) => void
}

/** 事件按天过期：把剩余天数直说，比「保留两周」更能对上日回合的节奏。 */
function expiryChip(event: GameEvent, today: number): string | null {
  if (!event.expiresDay) return null
  const left = event.expiresDay - today
  return left > 0 ? `剩 ${left} 天` : '今天过期'
}

export function OpenEventCard({ event, today, onChoose }: Props) {
  const meta = `${event.sender ?? '消息'} · ${event.day ? formatDayLabel(event.season, event.week, event.day) : `第 ${event.week} 周`}`
  const expiry = expiryChip(event, today)

  return (
    <Card className="border-accent/25">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Inbox size={15} className="shrink-0 text-accent" />
            <h2 className="truncate text-sm font-semibold text-text">{event.title}</h2>
          </div>
          <p className="mt-1 text-[10px] text-dim">{meta}</p>
        </div>
        {expiry ? <span className="chip shrink-0">{expiry}</span> : null}
      </div>
      <p className="text-[12px] leading-relaxed text-muted">{event.body}</p>
      <div className="mt-3 space-y-1.5">
        {event.choices.map((choice) => (
          <button
            key={choice.id}
            type="button"
            className="min-h-11 w-full rounded-xl border border-line bg-card-2 px-3 py-2.5 text-left transition hover:border-accent/50"
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
