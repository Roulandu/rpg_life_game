import type { Player } from '../../../domain'
import { StatBar } from '../../components/StatBar'

export function PlayerCondition({ player }: { player: Player }) {
  return (
    <section className="card mb-4 p-4">
      <h2 className="section-title">当前状态</h2>
      <div className="mt-3 grid gap-2.5">
        <StatBar label="体能储备" value={player.fitness} />
        <StatBar label="锐度" value={player.sharpness} />
        <StatBar label="士气" value={player.morale} />
        <StatBar label="信心" value={player.confidence} />
        <StatBar label="状态" value={player.form} />
      </div>
      {player.injury ? (
        <p className="mt-3 rounded border border-danger/30 px-3 py-2 text-[11px] text-danger">
          {`${player.injury.kind} · 预计缺阵 ${player.injury.daysLeft} 天`}
        </p>
      ) : (
        <p className="mt-3 text-[11px] text-dim">健康，可参与出场竞争。</p>
      )}
    </section>
  )
}
