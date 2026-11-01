import type { GameEvent } from '../../../domain'
import { Card, EmptyState, SectionTitle } from '../../components/Card'
import { OpenEventCard } from './OpenEventCard'

interface Props {
  open: GameEvent[]
  history: GameEvent[]
  today: number
  onChoose: (eventId: string, choiceId: string) => void
}

export function EventsTab({ open, history, today, onChoose }: Props) {
  return (
    <>
      {open.length === 0 ? (
        <EmptyState title="没有待处理的事件" body="日子往前推，新的消息会出现在这里。事件一般保留两三天。" />
      ) : (
        <div className="space-y-3">
          {open.map((event) => (
            <OpenEventCard key={event.id} event={event} today={today} onChoose={onChoose} />
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
