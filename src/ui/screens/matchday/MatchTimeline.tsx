import type { MatchEventLine } from '../../../domain'
import clsx from 'clsx'
import { EVENT_TONE, eventSideLabel } from './matchdayUtils'

export function MatchTimeline({ events }: { events: MatchEventLine[] }) {
  return (
    <div className="space-y-1.5">
      {events.map((event, index) => {
        const side = eventSideLabel(event.side)
        return (
          <div
            key={`${event.minute}-${index}`}
            className={clsx(
              'flex items-start gap-2.5 rounded-xl border px-3 py-2',
              EVENT_TONE[event.type] ?? 'border-line bg-card-2 text-muted',
              event.isUser && 'ring-1 ring-inset ring-accent/20',
            )}
          >
            <span className="w-7 shrink-0 pt-0.5 text-right font-mono text-[10px] tabular-nums opacity-70">
              {event.minute}&apos;
            </span>
            {side ? (
              <span className="mt-0.5 shrink-0 rounded px-1 py-0.5 text-[9px] font-medium leading-none ring-1 ring-inset ring-current/20">
                {side}
              </span>
            ) : null}
            <p className="text-[11px] leading-relaxed">{event.text}</p>
          </div>
        )
      })}
    </div>
  )
}
