import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { useGameStore } from '../../../store'
import { Card, SectionTitle } from '../../components/Card'
import { ConfirmDialog } from '../../components/ConfirmDialog'

interface Props {
  saveId: string | null
  onRemoved: () => void
}

export function DangerZone({ saveId, onRemoved }: Props) {
  const removeSave = useGameStore((state) => state.removeSave)
  const [confirming, setConfirming] = useState(false)

  return (
    <section className="mb-4">
      <SectionTitle>危险操作</SectionTitle>
      <Card className="border-danger/25">
        <p className="text-[11px] leading-relaxed text-muted">
          删除当前存档会同时移除本地数据。导出过 JSON 的话，之后仍然可以重新导入。
        </p>
        <button
          type="button"
          className="btn-secondary mt-3 w-full border-danger/30 text-danger hover:border-danger/60 hover:text-danger"
          onClick={() => {
            if (saveId) setConfirming(true)
          }}
        >
          <Trash2 size={15} /> 删除当前存档
        </button>
      </Card>

      <ConfirmDialog
        open={confirming && saveId !== null}
        title="删除当前存档"
        description="删除当前存档会同时移除本地数据，这个操作无法撤销。"
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false)
          if (saveId) {
            void removeSave(saveId).then((ok) => {
              if (ok) onRemoved()
            })
          }
        }}
      />
    </section>
  )
}
