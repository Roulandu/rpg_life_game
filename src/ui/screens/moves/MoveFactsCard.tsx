import type { KeyMomentKind, MoveCounterRole, MoveDefinition } from '../../../domain'
import { Card } from '../../components/Card'
import { MOVE_FAMILY_LABELS, MOVE_KIND_LABELS, MOVE_PATH_LABELS } from '../../labels'

function kindsOf(move: MoveDefinition): KeyMomentKind[] {
  const kinds = new Set<KeyMomentKind>()
  for (const target of move.targets) kinds.add(target.split(':')[0] as KeyMomentKind)
  return [...kinds]
}

const ROLE_TEXT: Record<MoveCounterRole, string> = {
  keeper: '门将',
  marker: '后卫',
  shooter: '前锋',
}

/** 一招收不收货，取决于对位球员的这一项属性：把「谁压得住它」写在牌面上。 */
function CounterLine({ move }: { move: MoveDefinition }) {
  if (!move.counter) {
    return <p className="text-[11px] leading-relaxed text-muted">这一招不吃对位属性，谁在面前都是同一个概率。</p>
  }
  return (
    <p className="text-[11px] leading-relaxed text-muted">
      <span className="text-text">{move.counter.labelZh}</span>
      <span>{`：对面${ROLE_TEXT[move.counter.role]}的这项属性越高，这一招越容易被吃掉。`}</span>
    </p>
  )
}

export function MoveFactsCard({ move }: { move: MoveDefinition }) {
  return (
    <Card className="mb-3">
      <p className="flex flex-wrap items-center gap-1.5">
        <span className="chip">{MOVE_FAMILY_LABELS[move.family]}</span>
        {kindsOf(move).map((kind) => (
          <span key={kind} className="chip">
            {MOVE_KIND_LABELS[kind] ?? kind}
          </span>
        ))}
      </p>
      <div className="mt-2">
        <CounterLine move={move} />
      </div>
      <p className="mt-2 flex flex-wrap items-center gap-1.5">
        {move.unlock.via.map((path) => (
          <span key={path} className="chip">
            {MOVE_PATH_LABELS[path]}
          </span>
        ))}
      </p>
    </Card>
  )
}
