import type { MoveDefinition, Player } from '../../../domain'
import clsx from 'clsx'
import { moveActionOf } from './moveView'

interface MoveInvestButtonProps {
  move: MoveDefinition
  user: Player
  locked: boolean
  onInvest: (moveId: string) => void
  className?: string
}

export function MoveInvestButton({
  move,
  user,
  locked,
  onInvest,
  className,
}: MoveInvestButtonProps) {
  const action = moveActionOf(move, user)
  return (
    <button
      type="button"
      className={clsx(
        'btn-ghost shrink-0 rounded-xl border border-line px-3 py-2 text-xs',
        className,
      )}
      disabled={locked || !action.enabled}
      onClick={() => onInvest(move.id)}
    >
      {action.text}
    </button>
  )
}
