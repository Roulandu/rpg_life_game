import { buildStaffPool, staffFactors, staffWeeklyTotal } from '../../domain'
import { formatDayLabel, formatMoney } from '../../lib'
import { useGameStore } from '../../store'
import { PageHeader } from '../components/PageHeader'
import { CandidateSection, RosterSection } from './staff/StaffSections'

export function StaffScreen() {
  const world = useGameStore((state) => state.world)
  const hireTeamMember = useGameStore((state) => state.hireTeamMember)
  const releaseTeamMember = useGameStore((state) => state.releaseTeamMember)

  if (!world) return null

  const roster = world.staff

  return (
    <div className="page-pad pb-6 sm:mx-auto sm:max-w-[760px]">
      <PageHeader
        eyebrow={formatDayLabel(world.season, world.week, world.day)}
        title="个人团队"
        subtitle={`可用余额 ${formatMoney(world.finance.balance)} · 团队每周 ${formatMoney(
          staffWeeklyTotal(roster),
        )}`}
      />

      <RosterSection
        roster={roster}
        factors={staffFactors(roster)}
        onRelease={(staffId) => void releaseTeamMember(staffId)}
      />

      <CandidateSection
        pool={buildStaffPool(world.seed, world.season)}
        roster={roster}
        balance={world.finance.balance}
        onHire={(candidateId) => void hireTeamMember(candidateId)}
      />
    </div>
  )
}
