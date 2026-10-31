import type { Club, MatchReport, WorldState } from '../../../domain'
import { SectionTitle } from '../../components/Card'
import type { LivePlayback, LiveSpeed } from '../../../store'
import { LiveControls } from './LiveControls'
import { LiveFeed } from './LiveFeed'
import { MatchStatsPanel } from './MatchStatsPanel'
import { PitchMap } from './PitchMap'
import { ScoreCard } from './ScoreCard'

interface LiveMatchStageProps {
  world: WorldState
  club: Club
  match: MatchReport
  playback: LivePlayback
  acting: boolean
  onPause: () => void
  onResume: () => void
  onJump: () => void
  onSpeed: (speed: LiveSpeed) => void
  onFinish: () => void
}

export function LiveMatchStage(props: LiveMatchStageProps) {
  const { world, club, match, playback, acting, onPause, onResume, onJump, onSpeed, onFinish } = props
  const stadium = world.clubs[match.homeId]?.stadium ?? club.stadium
  const entryMinute = match.userPlayed && !match.userStarted ? 90 - match.userMinutes : null

  return (
    <>
      <ScoreCard match={match} clubId={club.id} stadium={stadium} liveMinute={match.currentMinute} />
      <PitchMap world={world} match={match} playback={playback} />
      {entryMinute != null ? (
        <p className="mb-3 px-1 text-[11px] text-muted">你将在第 {entryMinute} 分钟登场</p>
      ) : null}
      {match.stats ? (
        <MatchStatsPanel homeName={match.homeName} awayName={match.awayName} stats={match.stats} />
      ) : null}
      <LiveControls
        phase={playback.phase}
        speed={playback.speed}
        onPause={onPause}
        onResume={onResume}
        onJump={onJump}
        onSpeed={onSpeed}
      />
      {playback.phase === 'paused' ? (
        <p className="mb-3 px-1 text-[11px] text-muted">比赛已暂停，点击继续恢复实时播放。</p>
      ) : null}
      <section className="mb-4">
        <SectionTitle right={<span className="chip">{playback.phase === 'ended' ? '90\'' : `${match.currentMinute}'`}</span>}>
          实时直播
        </SectionTitle>
        <LiveFeed events={match.events} />
      </section>
      {playback.phase === 'ended' ? (
        <div className="card mb-4 p-5 text-center">
          <p className="text-sm font-medium text-text">第 90 分钟，比赛等待结算</p>
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
        </div>
      ) : null}
    </>
  )
}
