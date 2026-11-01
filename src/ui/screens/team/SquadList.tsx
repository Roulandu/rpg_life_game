import { SQUAD_ROLE_LABELS } from '../../labels'
import { POSITION_LABELS, computeOverall, displayName } from '../../../domain'
import type { Player } from '../../../domain'
import clsx from 'clsx'
import { Link } from 'react-router-dom'

const ROLE_TONE: Record<Player['squadRole'], string> = {
  star: 'text-accent border-accent/30',
  starter: 'text-teal border-teal/30',
  rotation: 'text-muted border-line',
  youth: 'text-dim border-line',
}

export function SquadRow({ player, isUser }: { player: Player; isUser: boolean }) {
  const overall = computeOverall(player.position, player.attributes)

  return (
    <Link
      to={`/team/${player.id}`}
      className="flex min-h-[44px] items-center gap-2 px-3 py-2.5 text-[11px] active:bg-white/5"
    >
      <span className="w-8 shrink-0 text-center font-mono text-[10px] text-dim">{overall}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate">
          <span className="text-text">{displayName(player)}</span>
          {isUser ? <span className="ml-1.5 text-[9px] text-accent">你</span> : null}
        </span>
        <span className="mt-0.5 block text-[10px] text-dim">
          {POSITION_LABELS[player.position]} · {player.age} 岁 · 状态 {player.morale}
        </span>
        {player.injury ? (
          <span className="mt-0.5 block text-[10px] text-danger">
            {`${player.injury.kind} · 预计缺阵 ${player.injury.daysLeft} 天`}
          </span>
        ) : null}
      </span>
      <span
        className={clsx(
          'shrink-0 rounded border px-1.5 py-0.5 text-[9px] font-medium',
          ROLE_TONE[player.squadRole],
        )}
      >
        {SQUAD_ROLE_LABELS[player.squadRole]}
      </span>
    </Link>
  )
}

export function SquadList({ squad, userId }: { squad: Player[]; userId: string }) {
  return (
    <section className="card p-0">
      <div className="flex items-center justify-between border-b border-line-soft px-4 py-3">
        <h2 className="text-xs font-medium text-text">一线队名单</h2>
        <span className="chip">{squad.length} 人</span>
      </div>
      <div className="divide-y divide-line-soft">
        {squad.map((player) => (
          <SquadRow key={player.id} player={player} isUser={player.id === userId} />
        ))}
      </div>
    </section>
  )
}
