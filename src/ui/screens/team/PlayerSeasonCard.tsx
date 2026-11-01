import { SQUAD_ROLE_LABELS } from '../../labels'
import type { Foot, Player } from '../../../domain'
import { formatMoneyShort, formatRating } from '../../../lib'

const FOOT_LABELS: Record<Foot, string> = { L: '左脚', R: '右脚', B: '双足' }

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="card-soft px-3 py-2">
      <p className="text-[10px] text-dim">{label}</p>
      <p className="mt-0.5 font-mono text-sm text-text">{value}</p>
    </div>
  )
}

export function PlayerSeasonCard({ player }: { player: Player }) {
  const stats = player.seasonStats
  const average = stats.ratingCount > 0 ? stats.ratingSum / stats.ratingCount : null

  return (
    <section className="card mb-4 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="section-title">本赛季</h2>
        <p className="text-[11px] text-muted">
          {player.age} 岁 · {FOOT_LABELS[player.foot]} · 合同至 {player.contract.endSeason}
        </p>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <Cell label="出场" value={`${stats.appearances} 场`} />
        <Cell label="首发" value={`${stats.starts} 场`} />
        <Cell label="分钟" value={`${stats.minutes}`} />
        <Cell label="进球" value={`${stats.goals} 个`} />
        <Cell label="助攻" value={`${stats.assists} 次`} />
        <Cell label="场均评分" value={formatRating(average)} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Cell label="队内角色" value={SQUAD_ROLE_LABELS[player.squadRole]} />
        <Cell label="估值" value={formatMoneyShort(player.value)} />
      </div>
    </section>
  )
}
