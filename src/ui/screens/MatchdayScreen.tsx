import type { WorldState } from '../../domain'
import { useGameStore } from '../../store'
import { Card } from '../components/Card'
import { nextFixtureOf, opponentOfClub } from '../gameHelpers'
import { KeyMomentStage } from './matchday/KeyMomentStage'
import { MatchReview } from './matchday/MatchReview'
import { MatchdayHeader } from './matchday/MatchdayHeader'
import { NextFixtureLink } from './matchday/NextFixtureLink'
import { useMomentActions } from './matchday/useMomentActions'

function UpcomingFixture({
  world,
  clubId,
  hidden,
}: {
  world: WorldState
  clubId: string
  hidden: boolean
}) {
  if (hidden) return null
  const next = nextFixtureOf(world, clubId)
  const opponent = next ? opponentOfClub(world, next, clubId) : null
  if (!next || !opponent) return null
  return <NextFixtureLink next={next} opponent={opponent} isHome={next.homeId === clubId} />
}

export function MatchdayScreen() {
  const world = useGameStore((state) => state.world)
  const { acting, choose, skip } = useMomentActions()
  if (!world) return null

  const match = world.lastMatch
  const club = world.clubs[world.clubId]
  const moments = match?.keyMoments ?? []
  const pending = moments.filter((moment) => !moment.outcome)
  const active = pending[0] ?? null
  const resolvedCount = moments.length - pending.length

  return (
    <div className="page-pad pb-6">
      <MatchdayHeader title={active ? '比赛日 · 关键回合' : '比赛日'} match={match} />

      {match && active ? (
        <KeyMomentStage
          world={world}
          club={club}
          match={match}
          active={active}
          moments={moments}
          resolvedCount={resolvedCount}
          acting={acting}
          onChoose={(momentId, optionId) => void choose(momentId, optionId)}
          onSkip={() => void skip()}
        />
      ) : match ? (
        <MatchReview world={world} club={club} match={match} />
      ) : (
        <Card className="mb-4 p-6 text-center">
          <p className="text-sm font-medium text-text">还没有比赛记录</p>
          <p className="mt-1 text-[11px] leading-relaxed text-muted">
            在主页安排本周训练并推进，比赛结束后这里会出现完整的过程与评分。
          </p>
        </Card>
      )}

      <UpcomingFixture world={world} clubId={club.id} hidden={active !== null} />
    </div>
  )
}
