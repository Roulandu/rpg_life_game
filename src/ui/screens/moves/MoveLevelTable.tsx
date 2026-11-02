import { MOVE_LEVEL_MARKS, moveLevelOf } from '../../../domain'
import type { MoveDefinition, Player } from '../../../domain'
import clsx from 'clsx'
import { Card } from '../../components/Card'
import { chanceText } from './moveView'

/** 三级效果摊开写：门槛、价钱、加成、风险与那一句依据，界面不再自己算第二套数。 */
export function MoveLevelTable({ move, user }: { move: MoveDefinition; user: Player }) {
  const current = moveLevelOf(user, move.id)

  return (
    <Card className="p-0">
      <ul className="divide-y divide-line-soft">
        {move.levels.map((level, index) => (
          <li key={level.level} className={clsx('px-3 py-2.5', index < current && 'bg-card-2/60')}>
            <span className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-text">
                {MOVE_LEVEL_MARKS[index] ?? ''} 级
                {index < current ? <span className="ml-1.5 text-[10px] text-accent">已练成</span> : null}
              </span>
              <span className="chip shrink-0 font-mono text-[10px]">{chanceText(level.chanceDelta)}</span>
            </span>
            <span className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-dim">
              <span>综合分 {level.minOverall} 起</span>
              <span>{level.costExp} 经验</span>
              <span>风险 {chanceText(level.riskDelta)}</span>
            </span>
            <span className="mt-1 block text-[11px] leading-relaxed text-muted">{level.basisZh}</span>
          </li>
        ))}
      </ul>
    </Card>
  )
}
