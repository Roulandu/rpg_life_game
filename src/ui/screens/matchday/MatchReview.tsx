import type { Club, MatchReport, WorldState } from '../../../domain'
import { SectionTitle } from '../../components/Card'
import { MatchStatsPanel } from './MatchStatsPanel'
import { MatchTimeline } from './MatchTimeline'
import { MediaReactionCard } from './MediaReactionCard'
import { MomentList } from './MomentList'
import { ScoreCard } from './ScoreCard'
import { UserPerformanceCard } from './UserPerformanceCard'
import { momentumOf, successCountOf } from './matchdayUtils'

export function MatchReview({ world, club, match }: { world: WorldState; club: Club; match: MatchReport }) {
  if (match.status !== 'final') return null
  const moments = match.keyMoments ?? []
  const momentum = momentumOf(moments)
  const successCount = successCountOf(moments)
  const stadium = world.clubs[match.homeId]?.stadium ?? club.stadium

  return (
    <>
      <ScoreCard match={match} clubId={club.id} stadium={stadium} liveMinute={null} />
      <UserPerformanceCard match={match} moments={moments} momentum={momentum} />
      {match.stats ? (
        <section className="mb-4">
          <SectionTitle>数据统计</SectionTitle>
          <MatchStatsPanel homeName={match.homeName} awayName={match.awayName} stats={match.stats} />
        </section>
      ) : null}
      {match.mediaReaction ? <MediaReactionCard text={match.mediaReaction} /> : null}
      {moments.length > 0 ? (
        <section className="mb-4">
          <SectionTitle
            right={
              <span className="chip">
                {successCount}/{moments.length} 成功
              </span>
            }
          >
            关键回合回顾
          </SectionTitle>
          <MomentList moments={moments} />
        </section>
      ) : null}
      <section className="mb-4">
        <SectionTitle>文字直播</SectionTitle>
        <MatchTimeline events={match.events} />
      </section>
    </>
  )
}
