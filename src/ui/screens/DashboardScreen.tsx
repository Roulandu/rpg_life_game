import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGameStore } from '../../store/gameStore'
import { WeekPlannerModal } from '../components/WeekPlannerModal'
import { AdvanceAction } from './dashboard/AdvanceAction'
import { DashboardFooter } from './dashboard/DashboardFooter'
import { DashboardHeader } from './dashboard/DashboardHeader'
import { InboxPreview } from './dashboard/InboxPreview'
import { LastMatchCard } from './dashboard/LastMatchCard'
import { MiniLeagueTable } from './dashboard/MiniLeagueTable'
import { NewsFeed } from './dashboard/NewsFeed'
import { NextMatchPanel } from './dashboard/NextMatchPanel'
import { PlayerFormCard } from './dashboard/PlayerFormCard'
import { WeekStatusBanner } from './dashboard/WeekStatusBanner'
import { buildDashboardData } from './dashboard/dashboardData'

export function DashboardScreen() {
  const navigate = useNavigate()
  const world = useGameStore((state) => state.world)
  const busy = useGameStore((state) => state.busy)
  const aiBusy = useGameStore((state) => state.aiBusy)
  const aiError = useGameStore((state) => state.aiError)
  const clearAiError = useGameStore((state) => state.clearAiError)
  const [plannerOpen, setPlannerOpen] = useState(false)

  if (!world) return null
  const data = buildDashboardData(world)

  return (
    <div className="page-pad pb-6">
      <DashboardHeader world={world} user={data.user} club={data.club} league={data.league} position={data.position} />

      {data.last ? (
        <LastMatchCard
          last={data.last}
          pendingMatch={data.pendingMatch}
          resolvedMoments={data.resolvedMoments}
          totalMoments={data.totalMoments}
        />
      ) : null}

      <WeekStatusBanner
        pendingCount={data.pendingCount}
        aiBusy={aiBusy}
        aiError={aiError}
        narrative={world.aiNarrative ?? null}
        onDismiss={clearAiError}
        onContinue={() => navigate('/inbox')}
      />

      <NextMatchPanel
        world={world}
        club={data.club}
        next={data.next}
        opponent={data.opponent}
        isHome={data.isHome}
        opponentFormLabel={data.opponentFormLabel}
      />

      <AdvanceAction
        retired={world.retired ?? false}
        pendingMatch={data.pendingMatch}
        resolvedMoments={data.resolvedMoments}
        totalMoments={data.totalMoments}
        busy={busy}
        week={world.week}
        onPlan={() => setPlannerOpen(true)}
      />

      <PlayerFormCard user={data.user} />

      <MiniLeagueTable world={world} table={data.table} clubId={data.club.id} position={data.position} />

      <InboxPreview openCount={data.openEvents.length} latest={data.latestEvent} />

      <NewsFeed news={data.news} />

      <DashboardFooter balance={world.finance.balance} season={world.season} week={world.week} />

      <WeekPlannerModal open={plannerOpen} world={world} onClose={() => setPlannerOpen(false)} />
    </div>
  )
}
