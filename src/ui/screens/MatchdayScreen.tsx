import { useEffect } from 'react'
import type { MatchReport, WorldState } from '../../domain'
import { useGameStore } from '../../store'
import type { LivePhase } from '../../store'
import { Card } from '../components/Card'
import { nextFixtureOf, opponentOfClub } from '../gameHelpers'
import { KeyMomentModal } from './matchday/KeyMomentModal'
import { LiveMatchStage } from './matchday/LiveMatchStage'
import { MatchReview } from './matchday/MatchReview'
import { MatchdayExit } from './matchday/MatchdayExit'
import { MatchdayHeader } from './matchday/MatchdayHeader'
import { NextFixtureLink } from './matchday/NextFixtureLink'
import { useLiveClock } from './matchday/useLiveClock'
import { useMomentActions } from './matchday/useMomentActions'

function UpcomingFixture({ world, clubId }: { world: WorldState; clubId: string }) {
  const next = nextFixtureOf(world, clubId)
  const opponent = next ? opponentOfClub(world, next, clubId) : null
  if (!next || !opponent) return null
  return <NextFixtureLink next={next} opponent={opponent} isHome={next.homeId === clubId} />
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

function titleFor(match: MatchReport | null, phase: LivePhase): string {
  if (match?.status !== 'live') return '比赛日'
  return phase === 'awaiting' || phase === 'result' ? '比赛日 · 关键回合' : '比赛日 · 实时'
}

export function MatchdayScreen() {
  const world = useGameStore((state) => state.world)
  const playback = useGameStore((state) => state.livePlayback)
  const startLivePlayback = useGameStore((state) => state.startLivePlayback)
  const pauseLivePlayback = useGameStore((state) => state.pauseLivePlayback)
  const resumeLivePlayback = useGameStore((state) => state.resumeLivePlayback)
  const setLiveSpeed = useGameStore((state) => state.setLiveSpeed)
  const jumpToNextKeyMoment = useGameStore((state) => state.jumpToNextKeyMoment)
  const continueAfterMoment = useGameStore((state) => state.continueAfterMoment)
  const finishLiveMatch = useGameStore((state) => state.finishLiveMatch)
  const { acting, choose, skip } = useMomentActions()
  const match = world?.lastMatch ?? null
  const live = match?.status === 'live'

  useEffect(() => {
    if (live) startLivePlayback()
  }, [live, match?.fixtureId, startLivePlayback])

  useLiveClock()

  if (!world) return null

  const club = world.clubs[world.clubId]

  return (
    <div className="page-pad pb-6 sm:mx-auto sm:max-w-[var(--focus-max)]">
      <MatchdayHeader title={titleFor(match, playback.phase)} match={match} />
      {!match ? (
        <EmptyMatchday world={world} clubId={club.id} />
      ) : match.status === 'live' ? (
        <>
          <LiveMatchStage
            world={world}
            club={club}
            match={match}
            playback={playback}
            acting={acting}
            onPause={pauseLivePlayback}
            onResume={resumeLivePlayback}
            onJump={jumpToNextKeyMoment}
            onSpeed={setLiveSpeed}
            onFinish={() => void finishLiveMatch()}
          />
          <KeyMomentModal
            match={match}
            playback={playback}
            acting={acting}
            onChoose={(momentId, optionId) => void choose(momentId, optionId)}
            onSkip={() => void skip()}
            onContinue={continueAfterMoment}
          />
        </>
      ) : (
        <>
          <MatchReview world={world} club={club} match={match} />
          <MatchdayExit world={world} clubId={club.id} />
        </>
      )}
    </div>
  )
}
