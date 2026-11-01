import { Link, useParams } from 'react-router-dom'
import { POSITION_LABELS, displayName } from '../../domain'
import { useGameStore } from '../../store'
import { EmptyState } from '../components/Card'
import { PageHeader } from '../components/PageHeader'
import { PlayerAttributes } from './team/PlayerAttributes'
import { PlayerCondition } from './team/PlayerCondition'
import { PlayerSeasonCard } from './team/PlayerSeasonCard'
import { PlayerStyleCard } from './team/PlayerStyleCard'
import { SQUAD_ROLE_LABELS } from '../labels'

function BackLink() {
  return (
    <Link to="/team" className="mt-4 inline-flex min-h-[44px] items-center text-xs text-accent">
      ← 返回名单
    </Link>
  )
}

export function TeamPlayerScreen() {
  const world = useGameStore((state) => state.world)
  const { playerId } = useParams()
  if (!world) return null

  const club = world.clubs[world.clubId]
  const player = playerId ? world.players[playerId] : undefined

  if (!player || !club) {
    return (
      <div className="page-pad pb-6 sm:mx-auto sm:max-w-[760px]">
        <PageHeader eyebrow="队伍" title="球员详情" />
        <EmptyState title="找不到这名球员" body="他可能已经不在这支球队的大名单里。" />
        <BackLink />
      </div>
    )
  }

  const isUser = player.id === world.playerId
  const relationship = world.relationships[`rel:teammate:${player.id}`]

  return (
    <div className="page-pad pb-6 sm:mx-auto sm:max-w-[760px]">
      <PageHeader
        eyebrow={`${POSITION_LABELS[player.position]} · ${SQUAD_ROLE_LABELS[player.squadRole]}${isUser ? ' · 你' : ''}`}
        title={displayName(player)}
        subtitle={player.name === player.nameZh ? undefined : player.name}
      />

      <PlayerAttributes player={player} />
      <PlayerCondition player={player} />
      <PlayerSeasonCard player={player} />
      <PlayerStyleCard player={player} club={club} relationship={relationship} />

      <BackLink />
    </div>
  )
}
