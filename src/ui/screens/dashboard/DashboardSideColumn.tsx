import type { WorldState } from '../../../domain'
import type { DashboardData } from './dashboardData'
import { InboxPreview } from './InboxPreview'
import { MiniLeagueTable } from './MiniLeagueTable'
import { NewsFeed } from './NewsFeed'
import { PlayerFormCard } from './PlayerFormCard'

export function DashboardSideColumn({ world, data }: { world: WorldState; data: DashboardData }) {
  return (
    <div data-testid="dashboard-side" className="min-w-0">
      <PlayerFormCard user={data.user} />
      <MiniLeagueTable world={world} table={data.table} clubId={data.club.id} position={data.position} />
      <InboxPreview openCount={data.openEvents.length} latest={data.latestEvent} />
      <NewsFeed news={data.news} />
    </div>
  )
}
