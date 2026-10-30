import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGameStore } from '../../store'
import { WeekPlannerModal } from '../components/WeekPlannerModal'
import { AdvanceAction } from './dashboard/AdvanceAction'
import { DashboardFooter } from './dashboard/DashboardFooter'
import { DashboardHeader } from './dashboard/DashboardHeader'
import { DashboardSideColumn } from './dashboard/DashboardSideColumn'
import { LastMatchCard } from './dashboard/LastMatchCard'
import { NextMatchPanel } from './dashboard/NextMatchPanel'
import { WeekStatusBanner } from './dashboard/WeekStatusBanner'
import { buildDashboardData } from './dashboard/dashboardData'
import { INBOX_CHAT_PATH } from './inbox/inboxTab'

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
    <div className="page-pad pb-6 sm:mx-auto sm:max-w-[720px] lg:max-w-none">
      <DashboardHeader world={world} user={data.user} club={data.club} league={data.league} position={data.position} />

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-6">
        <div data-testid="dashboard-main" className="min-w-0">
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
            onContinue={() => navigate(INBOX_CHAT_PATH)}
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
        </div>

        <DashboardSideColumn world={world} data={data} />
      </div>

      <DashboardFooter balance={world.finance.balance} season={world.season} week={world.week} />

      <WeekPlannerModal open={plannerOpen} world={world} onClose={() => setPlannerOpen(false)} />
    </div>
  )
}
