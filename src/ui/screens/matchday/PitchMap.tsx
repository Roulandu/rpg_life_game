import clsx from 'clsx'
import type { MatchReport, PitchPlayer, PitchPoint, WorldState } from '../../../domain'
import { buildPitchFrame } from '../../../domain'
import type { LivePlayback } from '../../../store'

function TrailDots({ trails }: { trails: PitchPoint[] }) {
  return (
    <>
      {trails.map((trail, index) => (
        <span
          key={`trail-${index}`}
          data-testid="pitch-trail"
          className="pitch-trail absolute h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/30"
          style={{ left: `${trail.x * 100}%`, top: `${trail.y * 100}%` }}
        />
      ))}
    </>
  )
}

function PlayerDot({ player }: { player: PitchPlayer }) {
  return (
    <span
      data-testid="pitch-player"
      data-side={player.side}
      data-user={player.isUser ? 'true' : undefined}
      className="pitch-dot absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
      style={{ left: `${player.x * 100}%`, top: `${player.y * 100}%` }}
    >
      <span
        className={clsx(
          'flex h-2.5 w-2.5 items-center justify-center rounded-full',
          player.hasBall ? 'bg-accent ring-2 ring-accent/30' : player.side === 'home' ? 'bg-teal' : 'bg-gold',
          player.isUser && 'ring-2 ring-accent/50',
        )}
      />
      <span className="mt-0.5 hidden text-[8px] leading-none text-muted sm:block">{player.name}</span>
      <span className="font-mono text-[8px] leading-none text-dim">{player.number}</span>
    </span>
  )
}

export function PitchMap({ world, match, playback }: { world: WorldState; match: MatchReport; playback: LivePlayback }) {
  const frame = buildPitchFrame({
    seed: world.seed,
    fixtureId: match.fixtureId,
    minute: match.currentMinute,
    lineups: match.lineups ?? { home: [], away: [] },
    possession: playback.possession,
    ballX: playback.ballX,
    history: playback.history.map((point) => ({ minute: point.minute, ballX: point.ballX })),
  })
  const players = [...frame.home, ...frame.away]

  return (
    <section
      data-testid="pitch-map"
      data-possession={frame.possession}
      className="mb-3 rounded-[var(--radius-card)] border border-line bg-pitch-2 p-2"
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl border border-line-soft">
        <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-line-soft" />
        <div className="absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full border border-line-soft" />
        <TrailDots trails={frame.trails} />
        {players.map((player) => (
          <PlayerDot key={`${player.side}-${player.id}`} player={player} />
        ))}
        <span
          data-testid="pitch-ball"
          className="pitch-ball absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-text shadow"
          style={{ left: `${frame.ball.x * 100}%`, top: `${frame.ball.y * 100}%` }}
        />
      </div>
    </section>
  )
}
