import { computeOverall } from '../../domain'
import { formatDayLabel } from '../../lib'
import { useGameStore } from '../../store'
import { PageHeader } from '../components/PageHeader'
import { CoachCard } from './team/CoachCard'
import { SquadList } from './team/SquadList'

export function TeamScreen() {
  const world = useGameStore((state) => state.world)
  if (!world) return null

  const club = world.clubs[world.clubId]
  const squad = club.squadIds
    .map((id) => world.players[id])
    .sort((a, b) => computeOverall(b.position, b.attributes) - computeOverall(a.position, a.attributes))

  return (
    <div className="page-pad pb-6 sm:mx-auto sm:max-w-[760px]">
      <PageHeader
        eyebrow={formatDayLabel(world.season, world.week, world.day)}
        title="队伍"
        subtitle={club.nameZh}
      />

      <CoachCard club={club} />

      <SquadList squad={squad} userId={world.playerId} />
    </div>
  )
}
