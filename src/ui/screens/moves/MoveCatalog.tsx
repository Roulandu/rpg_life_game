import { RARITY_LABELS } from '../../../domain'
import type { MoveDefinition, Player } from '../../../domain'
import { Link } from 'react-router-dom'
import { Card } from '../../components/Card'
import { MOVE_FAMILY_LABELS } from '../../labels'
import { MoveInvestButton } from './MoveInvestButton'
import { chanceText } from './moveView'

interface MoveCatalogProps {
  moves: MoveDefinition[]
  user: Player
  locked: boolean
  onInvest: (moveId: string) => void
}

/** 图鉴只列位置对得上、账本里还没有记录的绝技：在练的去「我在练的」看。 */
export function MoveCatalog({ moves, user, locked, onInvest }: MoveCatalogProps) {
  return (
    <Card className="p-0">
      <ul className="divide-y divide-line-soft">
        {moves.map((move) => {
          const top = move.levels[move.levels.length - 1]
          return (
            <li key={move.id} className="flex min-h-[44px] items-center gap-2 px-3 py-2.5">
              <Link to={`/moves/${move.id}`} className="min-w-0 flex-1 active:bg-white/5">
                <span className="block truncate text-sm text-text">{move.nameZh}</span>
                <span className="mt-0.5 block text-[10px] text-dim">
                  <span>{MOVE_FAMILY_LABELS[move.family]}</span>
                  <span>{RARITY_LABELS[move.rarity]}</span>
                  {top ? <span>满级 {chanceText(top.chanceDelta)}</span> : null}
                </span>
              </Link>
              <MoveInvestButton move={move} user={user} locked={locked} onInvest={onInvest} />
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
