import type { Club, KeyMoment, MatchReport, WorldState } from '../../../domain'
import { SectionTitle } from '../../components/Card'
import { KeyMomentCard } from './KeyMomentCard'
import { MomentList } from './MomentList'
import { MomentumCard } from './MomentumChips'
import { ScoreCard } from './ScoreCard'
import { momentumOf } from './matchdayUtils'

export function KeyMomentStage({
  world,
  club,
  match,
  active,
  moments,
  resolvedCount,
  acting,
  onChoose,
  onSkip,
}: {
  world: WorldState
  club: Club
  match: MatchReport
  active: KeyMoment
  moments: KeyMoment[]
  resolvedCount: number
  acting: boolean
  onChoose: (momentId: string, optionId: string) => void
  onSkip: () => void
}) {
  const resolved = moments.filter((moment) => moment.outcome)
  const stadium = world.clubs[match.homeId]?.stadium ?? club.stadium

  return (
    <>
      <ScoreCard match={match} clubId={club.id} stadium={stadium} liveMinute={active.minute} />
      <section className="mb-3">
        <SectionTitle
          right={
            <span className="chip border-teal/30 text-teal">
              关键回合 {resolvedCount + 1}/{moments.length}
            </span>
          }
        >
          轮到你做决定
        </SectionTitle>
        <KeyMomentCard active={active} acting={acting} onChoose={onChoose} onSkip={onSkip} />
      </section>
      {resolvedCount > 0 ? (
        <section className="mb-3">
          <SectionTitle>已经发生</SectionTitle>
          <MomentList moments={resolved} />
        </section>
      ) : null}
      {resolvedCount > 0 ? <MomentumCard momentum={momentumOf(moments)} /> : null}
    </>
  )
}
