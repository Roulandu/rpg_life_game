import type { MatchEventLine } from '../../../domain'
import { MatchTimeline } from './MatchTimeline'

export function LiveFeed({ events }: { events: MatchEventLine[] }) {
  return (
    <div data-testid="live-feed">
      <MatchTimeline events={events} />
    </div>
  )
}
