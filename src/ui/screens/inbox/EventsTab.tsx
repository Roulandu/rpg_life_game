import type { GameEvent } from '../../../domain/types'
import { Card, EmptyState, SectionTitle } from '../../components/Card'
import { OpenEventCard } from './OpenEventCard'

interface Props {
  open: GameEvent[]
  history: GameEvent[]
  onChoose: (eventId: string, choiceId: string) => void
}

export function EventsTab({ open, history, onChoose }: Props) {
  return (
    <>
      {open.length === 0 ? (
        <EmptyState title="没有待处理的事件" body="推进一周后，新的消息会出现在这里。事件会保留约两周。" />
      ) : (
        <div className="space-y-3">
          {open.map((event) => (
            <OpenEventCard key={event.id} event={event} onChoose={onChoose} />
          ))}
        </div>
      )}

      {history.length > 0 ? (
        <section className="mt-5">
          <SectionTitle>已处理</SectionTitle>
          <div className="space-y-1.5">
            {history.map((event) => (
              <Card key={event.id} className="p-3 opacity-80">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-xs font-medium text-text">{event.title}</p>
                  <span className="chip shrink-0">{event.status === 'expired' ? '已过期' : '已处理'}</span>
                </div>
                <p className="mt-1 text-[10px] leading-relaxed text-muted">
                  {event.resultText ?? '这件事已经翻篇了。'}
                </p>
              </Card>
            ))}
          </div>
        </section>
      ) : null}
    </>
  )
}
