import { MOVE_PROGRESS_PER_LEVEL } from '../../../domain'
import clsx from 'clsx'
import { moveSlotHint, specializationCandidates } from './moveView'
import type { Player } from '../../../domain'

interface MoveSlotPickerProps {
  user: Player
  active: string | null
  onSelect: (moveId: string | null) => void
}

function slotClass(selected: boolean): string {
  return clsx(
    'min-h-[44px] rounded-xl border px-3 py-2 text-left transition',
    selected ? 'border-accent bg-accent/10' : 'border-line bg-card-2 hover:border-line',
  )
}

/** 周三特训槽：候选由数据包与位置决定，界面只负责点名。 */
export function MoveSlotPicker({ user, active, onSelect }: MoveSlotPickerProps) {
  const candidates = specializationCandidates(user)

  return (
    <section>
      <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.16em] text-muted">周三特训</p>
      <p className="mb-2 text-[10px] leading-relaxed text-muted">
        每周三练选中的那一招，攒满 {MOVE_PROGRESS_PER_LEVEL} 格就入门或升一级。
      </p>
      <div className="max-h-44 overflow-y-auto">
        <div className="grid grid-cols-2 gap-1.5">
          <button type="button" aria-pressed={active === null} className={slotClass(active === null)} onClick={() => onSelect(null)}>
            不练绝技
          </button>
          {candidates.map((move) => (
            <button
              key={move.id}
              type="button"
              aria-pressed={active === move.id}
              className={slotClass(active === move.id)}
              onClick={() => onSelect(move.id)}
            >
              <span className="block truncate text-xs font-semibold text-text">{move.nameZh}</span>
              <span className="mt-0.5 block truncate text-[10px] leading-relaxed text-muted">
                {moveSlotHint(move, user)}
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
