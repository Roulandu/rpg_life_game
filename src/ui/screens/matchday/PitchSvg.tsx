const LINE = 'var(--color-line-soft)'
const STRONG = 'var(--color-line)'

const stroke = {
  fill: 'none',
  stroke: LINE,
  strokeWidth: 0.3,
  vectorEffect: 'non-scaling-stroke' as const,
}

export function PitchSvg() {
  return (
    <svg
      data-testid="pitch-svg"
      viewBox="0 0 105 68"
      preserveAspectRatio="none"
      aria-hidden="true"
      className="absolute inset-0 h-full w-full"
    >
      <rect x="2" y="2" width="101" height="64" {...stroke} stroke={STRONG} />
      <line x1="52.5" y1="2" x2="52.5" y2="66" {...stroke} stroke={STRONG} />
      <circle data-testid="pitch-center-circle" cx="52.5" cy="34" r="9.15" {...stroke} />
      <circle cx="52.5" cy="34" r="0.45" fill={LINE} />

      <rect data-testid="pitch-box-home" x="2" y="13.84" width="16.5" height="40.32" {...stroke} />
      <rect data-testid="pitch-box-away" x="86.5" y="13.84" width="16.5" height="40.32" {...stroke} />
      <rect data-testid="pitch-six-home" x="2" y="24.84" width="5.5" height="18.32" {...stroke} />
      <rect data-testid="pitch-six-away" x="97.5" y="24.84" width="5.5" height="18.32" {...stroke} />
      <circle data-testid="pitch-spot-home" cx="13" cy="34" r="0.45" fill={LINE} />
      <circle data-testid="pitch-spot-away" cx="92" cy="34" r="0.45" fill={LINE} />
      <path d="M18.5 26.68 A9.15 9.15 0 0 1 18.5 41.32" {...stroke} />
      <path d="M86.5 26.68 A9.15 9.15 0 0 0 86.5 41.32" {...stroke} />

      <rect data-testid="pitch-goal-home" x="0.6" y="30.34" width="1.4" height="7.32" {...stroke} stroke={STRONG} />
      <rect data-testid="pitch-goal-away" x="103" y="30.34" width="1.4" height="7.32" {...stroke} stroke={STRONG} />

      <path data-testid="pitch-corner" d="M2 7 A5 5 0 0 1 7 2" {...stroke} />
      <path data-testid="pitch-corner" d="M98 2 A5 5 0 0 1 103 7" {...stroke} />
      <path data-testid="pitch-corner" d="M2 61 A5 5 0 0 0 7 66" {...stroke} />
      <path data-testid="pitch-corner" d="M103 61 A5 5 0 0 0 98 66" {...stroke} />
    </svg>
  )
}
