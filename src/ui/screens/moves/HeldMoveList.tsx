import { RARITY_LABELS } from '../../../domain'
import type { MoveDefinition, Player } from '../../../domain'
import { Link } from 'react-router-dom'
import { Card, EmptyState } from '../../components/Card'
import { MOVE_FAMILY_LABELS } from '../../labels'
import { moveStatusText } from './moveView'

/** 已经在账本上的绝技（含 0 级的修炼中记录）：这里只读，升级去详情页。 */
export function HeldMoveList({ moves, user }: { moves: MoveDefinition[]; user: Player }) {
  if (moves.length === 0) {
    return (
      <EmptyState
        title="还没学会任何绝技"
        body="高评分的关键回合会掉修炼进度，周三特训每天推进一步，名宿在事件里直接传授。攒满 3 格就入门，综合分够到门槛才真的会这一招。"
      />
    )
  }

  return (
    <Card className="p-0">
      <ul className="divide-y divide-line-soft">
        {moves.map((move) => (
          <li key={move.id}>
            <Link
              to={`/moves/${move.id}`}
              className="flex min-h-[44px] items-center gap-2 px-3 py-2.5 active:bg-white/5"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-text">{move.nameZh}</span>
                <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px] text-dim">
                  <span>{MOVE_FAMILY_LABELS[move.family]}</span>
                  <span>{moveStatusText(move, user)}</span>
                </span>
              </span>
              <span className="chip shrink-0">{RARITY_LABELS[move.rarity]}</span>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  )
}
