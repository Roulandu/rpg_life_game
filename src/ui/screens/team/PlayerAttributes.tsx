import { ATTR_KEYS, ATTR_LABELS, POSITION_WEIGHTS, overall } from '../../../domain'
import type { AttrKey, Player } from '../../../domain'
import { formatOverall } from '../../../lib'
import { StatBar } from '../../components/StatBar'

function weightHint(weights: Partial<Record<AttrKey, number>>, key: AttrKey): string | undefined {
  const value = weights[key]
  return value ? `占 ${Math.round(value * 100)}%` : undefined
}

export function PlayerAttributes({ player }: { player: Player }) {
  const weights = POSITION_WEIGHTS[player.position]

  return (
    <section className="card mb-4 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="section-title">技术属性</h2>
        <p className="text-[11px] text-muted">
          能力 {formatOverall(overall(player))} · 潜力 {player.potential}
        </p>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5">
        {ATTR_KEYS.map((key) => (
          <StatBar
            key={key}
            label={ATTR_LABELS[key]}
            value={player.attributes[key]}
            max={96}
            hint={weightHint(weights, key)}
          />
        ))}
      </div>
    </section>
  )
}
