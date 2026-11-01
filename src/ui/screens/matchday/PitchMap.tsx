import clsx from 'clsx'
import { useEffect, useRef } from 'react'
import type { CSSProperties } from 'react'
import type { MatchReport, PitchPlayer, PitchPoint, WorldState } from '../../../domain'
import { buildPitchFrame } from '../../../domain'
import type { LivePlayback, LiveSpeed } from '../../../store'
import { PitchSvg } from './PitchSvg'

const SPEED_MOVE_MS: Record<LiveSpeed, number> = { 1: 420, 2: 200, 4: 90 }

const SIDE_STROKE = { home: 'var(--color-teal)', away: 'var(--color-gold)' }

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

function PassLine({ path, possession }: { path: PitchPoint[]; possession: 'home' | 'away' }) {
  if (path.length < 2) return null
  return (
    <svg
      data-testid="pitch-pass-line"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
    >
      <polyline
        points={path.map((point) => `${point.x * 100},${point.y * 100}`).join(' ')}
        fill="none"
        stroke={SIDE_STROKE[possession]}
        strokeWidth="1.2"
        strokeDasharray="4 3"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        opacity="0.72"
      />
    </svg>
  )
}

function PlayerDot({ player }: { player: PitchPlayer }) {
  return (
    <span
      data-testid="pitch-player"
      data-player-id={player.id}
      data-side={player.side}
      data-user={player.isUser ? 'true' : undefined}
      className="pitch-dot absolute"
      style={{ left: `${player.x * 100}%`, top: `${player.y * 100}%` }}
    >
      <span
        data-testid="pitch-player-dot"
        className={clsx(
          'absolute flex h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full',
          player.hasBall ? 'bg-accent ring-2 ring-accent/30' : player.side === 'home' ? 'bg-teal' : 'bg-gold',
          player.isUser && 'ring-2 ring-accent/50',
        )}
      />
      <span className="pointer-events-none absolute left-1/2 top-full mt-0.5 hidden -translate-x-1/2 whitespace-nowrap text-[8px] leading-none text-muted sm:block">
        {player.name}
      </span>
      <span className="pointer-events-none absolute left-1/2 top-full mt-3 -translate-x-1/2 font-mono text-[8px] leading-none text-dim">
        {player.number}
      </span>
    </span>
  )
}

function Ball({ ball, passPath, speed }: { ball: PitchPoint; passPath: PitchPoint[]; speed: LiveSpeed }) {
  const ref = useRef<HTMLSpanElement | null>(null)

  useEffect(() => {
    const node = ref.current
    if (!node || passPath.length < 2 || typeof node.animate !== 'function') return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const keyframes = passPath.map((point) => ({
      left: `${point.x * 100}%`,
      top: `${point.y * 100}%`,
    }))
    const animation = node.animate(keyframes, { duration: SPEED_MOVE_MS[speed], easing: 'ease-out' })
    return () => animation.cancel()
  }, [passPath, speed])

  return (
    <span
      ref={ref}
      data-testid="pitch-ball"
      className="pitch-ball absolute z-20 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 drop-shadow"
      style={{ left: `${ball.x * 100}%`, top: `${ball.y * 100}%` }}
    >
      <svg data-testid="pitch-ball-icon" viewBox="0 0 32 32" aria-hidden="true" className="h-full w-full">
        <circle cx="16" cy="16" r="15" fill="#f8faf7" stroke="#0b0f0c" strokeWidth="1.5" />
        <path fill="#0b0f0c" d="M16 7.2 21.4 11l-2.1 6.3h-6.6L10.6 11z" />
        <path
          fill="none"
          stroke="#0b0f0c"
          strokeWidth="1.4"
          strokeLinecap="round"
          d="M16 7.2 18 3.4M10.6 11 6.5 9.6M12.7 17.3 10.2 21.3M19.3 17.3l2.5 4M21.4 11l3.8-1.4"
        />
      </svg>
    </span>
  )
}

function GoalBadge({ side }: { side: 'home' | 'away' }) {
  return (
    <span
      data-testid="pitch-goal"
      className={clsx(
        'absolute top-2 z-30 rounded-full border border-accent/50 bg-accent/15 px-2 py-0.5 font-mono text-[10px] font-bold tracking-widest text-accent',
        side === 'home' ? 'right-2' : 'left-2',
      )}
    >
      GOAL
    </span>
  )
}

function goalSideOf(match: MatchReport): 'home' | 'away' | undefined {
  return match.events.find((event) => event.minute === match.currentMinute && event.type === 'goal')?.side
}

export function PitchMap({ world, match, playback }: { world: WorldState; match: MatchReport; playback: LivePlayback }) {
  const goalSide = goalSideOf(match)
  const frame = buildPitchFrame({
    seed: world.seed,
    fixtureId: match.fixtureId,
    minute: match.currentMinute,
    lineups: match.lineups ?? { home: [], away: [] },
    possession: playback.possession,
    ballX: playback.ballX,
    carrierId: playback.carrierId,
    goalSide,
    history: playback.history.map((point) => ({
      minute: point.minute,
      ballX: point.ballX,
      possession: point.possession,
    })),
  })
  const players = [...frame.home, ...frame.away]
  const possessionTeam = frame.possession === 'home' ? match.homeName : match.awayName
  const carrier = players.find((player) => player.id === frame.carrierId)

  return (
    <section
      data-testid="pitch-map"
      data-possession={frame.possession}
      style={{ '--pitch-move': `${SPEED_MOVE_MS[playback.speed]}ms` } as CSSProperties}
      className="mb-3 rounded-[var(--radius-card)] border border-line bg-pitch-2 p-2"
    >
      <p data-testid="pitch-possession" className="mb-2 truncate px-1 text-[11px] text-muted">
        <span className={frame.possession === 'home' ? 'text-teal' : 'text-gold'}>{possessionTeam}</span>
        控球{carrier ? ` · ${carrier.name}` : ''}
      </p>
      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl border border-line-soft bg-pitch">
        <PitchSvg />
        <PassLine path={frame.passPath} possession={frame.possession} />
        <TrailDots trails={frame.trails} />
        {players.map((player) => (
          <PlayerDot key={`${player.side}-${player.id}`} player={player} />
        ))}
        <Ball ball={frame.ball} passPath={frame.passPath} speed={playback.speed} />
        {frame.goalSide && <GoalBadge side={frame.goalSide} />}
      </div>
    </section>
  )
}
