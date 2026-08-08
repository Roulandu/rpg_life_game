import { ENDING_TITLES } from '../game/endings'
import type { RunStats } from '../game/runStats'

interface Props {
  stats: RunStats
}

export default function RunStatsPanel({ stats }: Props) {
  const entries = Object.entries(ENDING_TITLES)
  const total = Object.values(stats).reduce((sum, count) => sum + count, 0)

  return (
    <section className="run-stats-panel">
      <h2>结局收集（{total} 周目）</h2>
      {total === 0 ? (
        <p className="log-empty">还没完成过任何人生，去创造你的结局吧。</p>
      ) : (
        <ul className="run-stats-list">
          {entries.map(([id, title]) => {
            const count = stats[id] ?? 0
            const pct = total === 0 ? 0 : Math.round((count / total) * 100)
            return (
              <li key={id} className={count > 0 ? 'run-stat unlocked' : 'run-stat'}>
                <span className="run-stat-title">{title}</span>
                <span className="run-stat-bar">
                  <span className="run-stat-fill" style={{ width: `${pct}%` }} />
                </span>
                <span className="run-stat-count">{count}</span>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
