import { ChevronRight, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useGameStore } from '../../../store'
import { formatSeasonLabel } from '../../../lib'

export function TitleSaveList() {
  const navigate = useNavigate()
  const saves = useGameStore((state) => state.saves)
  const saveId = useGameStore((state) => state.saveId)
  const loadGame = useGameStore((state) => state.loadGame)
  const removeSave = useGameStore((state) => state.removeSave)

  if (saves.length === 0) return null

  return (
    <section className="mt-6 lg:mt-0">
      <div className="mb-2 flex items-center justify-between px-1">
        <h2 className="section-title">本地存档</h2>
        <span className="text-[10px] text-dim">{saves.length} 个</span>
      </div>
      <div className="space-y-2">
        {saves.map((save) => {
          const active = save.id === saveId
          return (
            <div key={save.id} className="flex items-stretch gap-2">
              <button
                type="button"
                className="card flex flex-1 items-center justify-between gap-3 p-3 text-left transition hover:border-accent/40"
                onClick={async () => {
                  const ok = await loadGame(save.id)
                  if (ok) navigate('/game')
                }}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-text">
                    {save.playerName}
                    {active ? <span className="ml-2 text-[10px] text-accent">当前</span> : null}
                  </p>
                  <p className="mt-0.5 truncate text-[11px] text-muted">
                    {save.clubName} · {formatSeasonLabel(save.season)} 第 {save.week} 周 · 能力 {save.overall}
                  </p>
                </div>
                <ChevronRight size={16} className="shrink-0 text-dim" />
              </button>
              <button
                type="button"
                aria-label={`删除 ${save.playerName} 的存档`}
                className="card grid w-11 place-items-center text-dim transition hover:border-danger/40 hover:text-danger"
                onClick={() => {
                  if (window.confirm(`删除 ${save.playerName} 的存档？此操作无法撤销。`)) {
                    void removeSave(save.id)
                  }
                }}
              >
                <Trash2 size={16} />
              </button>
            </div>
          )
        })}
      </div>
    </section>
  )
}
