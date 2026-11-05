import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { SaveSummary } from '../../../domain'
import { useGameStore } from '../../../store'
import { SaveDeleteDialog } from './SaveDeleteDialog'
import { TitleSaveRow } from './TitleSaveRow'

export function TitleSaveList() {
  const navigate = useNavigate()
  const saves = useGameStore((state) => state.saves)
  const saveId = useGameStore((state) => state.saveId)
  const loadGame = useGameStore((state) => state.loadGame)
  const removeSave = useGameStore((state) => state.removeSave)
  const [pending, setPending] = useState<SaveSummary | null>(null)

  if (saves.length === 0) return null

  return (
    <section className="mt-6 lg:mt-0">
      <div className="mb-2 flex items-center justify-between px-1">
        <h2 className="section-title">本地存档</h2>
        <span className="text-[10px] text-dim">{saves.length} 个</span>
      </div>
      <div className="space-y-2">
        {saves.map((save) => (
          <TitleSaveRow
            key={save.id}
            save={save}
            active={save.id === saveId}
            onLoad={async (id) => {
              const ok = await loadGame(id)
              if (ok) navigate('/game')
            }}
            onAskDelete={setPending}
          />
        ))}
      </div>

      <SaveDeleteDialog
        save={pending}
        onCancel={() => setPending(null)}
        onConfirm={(save) => {
          setPending(null)
          void removeSave(save.id)
        }}
      />
    </section>
  )
}
