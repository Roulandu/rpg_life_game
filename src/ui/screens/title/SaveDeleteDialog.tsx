import type { SaveSummary } from '../../../domain'
import { formatDayLabel, formatSeasonLabel } from '../../../lib'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { formatSavedAt } from './saveStamp'

interface SaveDeleteDialogProps {
  save: SaveSummary | null
  onCancel: () => void
  onConfirm: (save: SaveSummary) => void
}

/** 标题页的删档确认：把「删的是哪一份」摊在按钮上面，同名存档也能看清。 */
export function SaveDeleteDialog({ save, onCancel, onConfirm }: SaveDeleteDialogProps) {
  return (
    <ConfirmDialog
      open={save !== null}
      title="删除存档"
      description="删除后无法恢复，确定要删掉这份存档吗？"
      detail={
        save ? (
          <>
            {save.playerName} · {save.clubName} · {formatSeasonLabel(save.season)}{' '}
            {formatDayLabel(save.season, save.week, save.day)} · 保存于 {formatSavedAt(save.updatedAt)}
          </>
        ) : null
      }
      onCancel={onCancel}
      onConfirm={() => {
        if (save) onConfirm(save)
      }}
    />
  )
}
