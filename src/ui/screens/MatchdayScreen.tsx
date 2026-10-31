import type { Club, KeyMoment, MatchReport, WorldState } from '../../domain'
import { useGameStore } from '../../store'
import { Card } from '../components/Card'
import { nextFixtureOf, opponentOfClub } from '../gameHelpers'
import { KeyMomentStage } from './matchday/KeyMomentStage'
import { MatchReview } from './matchday/MatchReview'
import { MatchdayExit } from './matchday/MatchdayExit'
import { MatchdayHeader } from './matchday/MatchdayHeader'
import { NextFixtureLink } from './matchday/NextFixtureLink'
import { ScoreCard } from './matchday/ScoreCard'
import { useMomentActions } from './matchday/useMomentActions'

function UpcomingFixture({ world, clubId }: { world: WorldState; clubId: string }) {
  const next = nextFixtureOf(world, clubId)
  const opponent = next ? opponentOfClub(world, next, clubId) : null
  if (!next || !opponent) return null
  return <NextFixtureLink next={next} opponent={opponent} isHome={next.homeId === clubId} />
}

function LiveFinishCard({
  match,
  clubId,
  stadium,
  acting,
  onFinish,
}: {
  match: MatchReport
  clubId: string
  stadium: string
  acting: boolean
  onFinish: () => void
}) {
  return (
    <>
      <ScoreCard match={match} clubId={clubId} stadium={stadium} liveMinute={match.currentMinute} />
      <Card className="mb-4 p-6 text-center">
        <p className="text-sm font-medium text-text">第 {match.currentMinute} 分钟，比赛等待结算</p>
        <p className="mt-1 text-[11px] leading-relaxed text-muted">
          所有关键回合都已处理，完成比赛后会生成评分、媒体反应与新闻。
        </p>
        <button
          type="button"
          className="btn-primary mt-4 w-full justify-center"
          disabled={acting}
          onClick={onFinish}
        >
          完成比赛
        </button>
      </Card>
    </>
  )
}

function EmptyMatchday({ world, clubId }: { world: WorldState; clubId: string }) {
  return (
    <>
      <Card className="mb-4 p-6 text-center">
        <p className="text-sm font-medium text-text">还没有比赛记录</p>
        <p className="mt-1 text-[11px] leading-relaxed text-muted">
          在主页安排本周训练并推进，比赛结束后这里会出现完整的过程与评分。
        </p>
      </Card>
      <UpcomingFixture world={world} clubId={clubId} />
    </>
  )
}

function MatchdayBody({
  world,
  club,
  match,
  active,
  acting,
  choose,
  skip,
  stadium,
}: {
  world: WorldState
  club: Club
  match: MatchReport | null
  active: KeyMoment | null
  acting: boolean
  choose: (momentId: string, optionId: string) => void
  skip: () => void
  stadium: string
}) {
  if (!match) return <EmptyMatchday world={world} clubId={club.id} />
  if (active) {
    const moments = match.keyMoments ?? []
    return (
      <KeyMomentStage
        world={world}
        club={club}
        match={match}
        active={active}
        moments={moments}
        resolvedCount={moments.filter((moment) => moment.outcome).length}
        acting={acting}
        onChoose={choose}
        onSkip={skip}
      />
    )
  }
  if (match.status === 'live') {
    return (
      <LiveFinishCard
        match={match}
        clubId={club.id}
        stadium={stadium}
        acting={acting}
        onFinish={skip}
      />
    )
  }
  return (
    <>
      <MatchReview world={world} club={club} match={match} />
      <MatchdayExit world={world} clubId={club.id} />
    </>
  )
}

export function MatchdayScreen() {
  const world = useGameStore((state) => state.world)
  const { acting, choose, skip } = useMomentActions()
  if (!world) return null

  const match = world.lastMatch
  const club = world.clubs[world.clubId]
  const active = match?.keyMoments?.find((moment) => !moment.outcome) ?? null
  const stadium = match ? (world.clubs[match.homeId]?.stadium ?? club.stadium) : club.stadium

  return (
    <div className="page-pad pb-6 sm:mx-auto sm:max-w-[var(--focus-max)]">
      <MatchdayHeader title={active ? '比赛日 · 关键回合' : '比赛日'} match={match} />
      <MatchdayBody
        world={world}
        club={club}
        match={match}
        active={active}
        acting={acting}
        choose={(momentId, optionId) => void choose(momentId, optionId)}
        skip={() => void skip()}
        stadium={stadium}
      />
    </div>
  )
}
