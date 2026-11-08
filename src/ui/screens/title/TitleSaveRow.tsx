import { ChevronRight, Trash2 } from 'lucide-react'
import type { SaveSummary } from '../../../domain'
import { formatDayLabel, formatSeasonLabel } from '../../../lib'
import { formatSavedAt } from './saveStamp'

interface TitleSaveRowProps {
  save: SaveSummary
  active: boolean
  onLoad: (id: string) => void
  onAskDelete: (save: SaveSummary) => void
}

/** 一行存档：左边整块可点用于载入，右边固定 44px 宽的删除键。 */
export function TitleSaveRow({ save, active, onLoad, onAskDelete }: TitleSaveRowProps) {
  return (
    <div data-save-row className="flex items-stretch gap-2">
      <button
        type="button"
        className="card flex min-w-0 flex-1 items-center justify-between gap-3 p-3 text-left transition hover:border-accent/40"
        onClick={() => onLoad(save.id)}
      >
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-text">
            {save.playerName}
            {active ? <span className="ml-2 text-[10px] text-accent">当前</span> : null}
          </p>
          <p className="mt-0.5 truncate text-[11px] text-muted">
            {save.clubName} · {formatSeasonLabel(save.season)} {formatDayLabel(save.season, save.week, save.day)} · 能力{' '}
            {save.overall}
          </p>
          <p className="mt-0.5 truncate text-[10px] text-dim">
            种子 {save.seed} · 建于 {formatSavedAt(save.createdAt)} · 保存于 {formatSavedAt(save.updatedAt)}
          </p>
        </div>
        <ChevronRight size={16} className="shrink-0 text-dim" />
      </button>
      <button
        type="button"
        aria-label={`删除${save.playerName}的存档`}
        className="card grid w-11 shrink-0 place-items-center text-dim transition hover:border-danger/40 hover:text-danger"
        onClick={() => onAskDelete(save)}
      >
        <Trash2 size={16} />
      </button>
    </div>
  )
}
