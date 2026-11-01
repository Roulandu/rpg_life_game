import type { WorldState } from '../../../domain'
import { AdvanceAction } from './AdvanceAction'
import type { DashboardData } from './dashboardData'
import { LastMatchCard } from './LastMatchCard'
import { NextMatchPanel } from './NextMatchPanel'
import { WeekStatusBanner } from './WeekStatusBanner'
import { daysUntilNextFixture } from '../../gameHelpers'

interface MainColumnProps {
  world: WorldState
  data: DashboardData
  busy: boolean
  aiBusy: boolean
  aiError: string | null
  onFastForward: () => void
  onAdvanceDay: () => void
  onPlan: () => void
  onDismissError: () => void
  onContinueNarrative: () => void
}

/** 主页主列：上一场 → 本周状态 → 下一场 → 推进。 */
export function DashboardMainColumn({
  world,
  data,
  busy,
  aiBusy,
  aiError,
  onFastForward,
  onAdvanceDay,
  onPlan,
  onDismissError,
  onContinueNarrative,
}: MainColumnProps) {
  return (
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
        onDismiss={onDismissError}
        onContinue={onContinueNarrative}
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
        daysToMatch={daysUntilNextFixture(world)}
        onFastForward={onFastForward}
        onAdvanceDay={onAdvanceDay}
        onPlan={onPlan}
      />
    </div>
  )
}
