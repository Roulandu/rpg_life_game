import clsx from 'clsx'
import { FAST_FORWARD_LABEL } from './matchdayUtils'
import type { LivePhase, LiveSpeed } from '../../../store'
import { LIVE_SPEEDS } from '../../../store'

export function LiveControls({
  phase,
  speed,
  onPause,
  onResume,
  onJump,
  onSpeed,
}: {
  phase: LivePhase
  speed: LiveSpeed
  onPause: () => void
  onResume: () => void
  onJump: () => void
  onSpeed: (speed: LiveSpeed) => void
}) {
  const running = phase === 'playing' || phase === 'paused'

  return (
    <div className="card mb-3 flex flex-wrap items-center gap-2 p-3">
      {phase === 'playing' ? (
        <button type="button" className="btn-secondary min-h-11 flex-1" onClick={onPause}>
          暂停
        </button>
      ) : null}
      {phase === 'paused' ? (
        <button type="button" className="btn-primary min-h-11 flex-1" onClick={onResume}>
          继续
        </button>
      ) : null}
      <div className="flex items-center gap-1" role="group" aria-label="播放速度">
        {LIVE_SPEEDS.map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={speed === value}
            disabled={!running}
            className={clsx(
              'min-h-11 min-w-11 rounded-xl border px-2 font-mono text-xs transition disabled:opacity-45',
              speed === value
                ? 'border-accent/60 bg-accent/15 text-accent'
                : 'border-line bg-card-2 text-muted hover:text-text',
            )}
            onClick={() => onSpeed(value)}
          >
            {value}x
          </button>
        ))}
      </div>
      <button
        type="button"
        className="btn-ghost min-h-11 flex-1 justify-center text-[11px]"
        disabled={!running}
        onClick={onJump}
      >
        {FAST_FORWARD_LABEL}
      </button>
    </div>
  )
}
