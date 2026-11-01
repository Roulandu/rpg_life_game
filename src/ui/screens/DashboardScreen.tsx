import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGameStore } from '../../store'
import { WeekPlannerModal } from '../components/WeekPlannerModal'
import { DashboardFooter } from './dashboard/DashboardFooter'
import { DashboardHeader } from './dashboard/DashboardHeader'
import { DashboardMainColumn } from './dashboard/DashboardMainColumn'
import { DashboardSideColumn } from './dashboard/DashboardSideColumn'
import { buildDashboardData } from './dashboard/dashboardData'
import { INBOX_CHAT_PATH } from './inbox/inboxTab'

export function DashboardScreen() {
  const navigate = useNavigate()
  const world = useGameStore((state) => state.world)
  const busy = useGameStore((state) => state.busy)
  const advanceDay = useGameStore((state) => state.advanceDay)
  const advanceToNextEvent = useGameStore((state) => state.advanceToNextEvent)
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
        <DashboardMainColumn
          world={world}
          data={data}
          busy={busy}
          aiBusy={aiBusy}
          aiError={aiError}
          onFastForward={() => void advanceToNextEvent()}
          onAdvanceDay={() => void advanceDay()}
          onPlan={() => setPlannerOpen(true)}
          onDismissError={clearAiError}
          onContinueNarrative={() => navigate(INBOX_CHAT_PATH)}
        />

        <DashboardSideColumn world={world} data={data} />
      </div>

      <DashboardFooter balance={world.finance.balance} season={world.season} week={world.week} />

      <WeekPlannerModal open={plannerOpen} world={world} onClose={() => setPlannerOpen(false)} />
    </div>
  )
}
