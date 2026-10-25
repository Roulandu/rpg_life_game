import clsx from 'clsx'
import { stateTone } from '../labels'

const TONE_CLASS: Record<'accent' | 'teal' | 'gold' | 'danger', string> = {
  accent: 'bg-accent',
  teal: 'bg-teal',
  gold: 'bg-gold',
  danger: 'bg-danger',
}

interface StatBarProps {
  label: string
  value: number
  max?: number
  hint?: string
  tone?: 'accent' | 'teal' | 'gold' | 'danger'
  className?: string
}

export function StatBar({ label, value, max = 100, hint, tone, className }: StatBarProps) {
  const safeMax = max > 0 ? max : 100
  const percentage = Math.min(100, Math.max(0, (value / safeMax) * 100))
  return (
    <div className={clsx('min-w-0', className)}>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="text-[11px] text-muted">{label}</span>
        <span className="font-mono text-[11px] tabular-nums text-text">
          {Number.isInteger(value) ? value : value.toFixed(1)}
          {hint ? <span className="ml-1 text-dim">{hint}</span> : null}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-line-soft">
        <div
          className={clsx('h-full rounded-full transition-[width] duration-300', TONE_CLASS[tone ?? stateTone(percentage)])}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
