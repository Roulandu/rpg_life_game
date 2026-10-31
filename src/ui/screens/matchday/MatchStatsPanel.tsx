import type { MatchStats } from '../../../domain'

interface StatsRowProps {
  label: string
  home: string
  away: string
  metric: string
}

function StatsRow({ label, home, away, metric }: StatsRowProps) {
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 py-1.5 text-[11px]">
      <span data-testid={`stat-home-${metric}`} className="text-right font-mono tabular-nums text-text">
        {home}
      </span>
      <span className="w-14 text-center text-[10px] text-muted">{label}</span>
      <span data-testid={`stat-away-${metric}`} className="font-mono tabular-nums text-text">
        {away}
      </span>
    </div>
  )
}

export function MatchStatsPanel({
  homeName,
  awayName,
  stats,
}: {
  homeName: string
  awayName: string
  stats: MatchStats
}) {
  const total = stats.home.possession + stats.away.possession
  const homePossession = total > 0 ? Math.round((stats.home.possession / total) * 100) : 50

  return (
    <div data-testid="match-stats" className="card mb-3 px-4 py-3">
      <div className="mb-1 flex items-center justify-between text-[10px] text-muted">
        <span className="min-w-0 truncate">{homeName}</span>
        <span className="min-w-0 truncate text-right">{awayName}</span>
      </div>
      <StatsRow
        label="控球"
        metric="possession"
        home={`${homePossession}%`}
        away={`${100 - homePossession}%`}
      />
      <StatsRow
        label="射门"
        metric="shots"
        home={String(stats.home.shots)}
        away={String(stats.away.shots)}
      />
      <StatsRow
        label="射正"
        metric="shotsOnTarget"
        home={String(stats.home.shotsOnTarget)}
        away={String(stats.away.shotsOnTarget)}
      />
      <StatsRow
        label="角球"
        metric="corners"
        home={String(stats.home.corners)}
        away={String(stats.away.corners)}
      />
    </div>
  )
}
