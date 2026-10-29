import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, Plus, Trash2, Upload } from 'lucide-react'
import { useGameStore } from '../../store'
import { formatMoneyShort, formatSeasonLabel } from '../../lib'
import { Card } from '../components/Card'

export function TitleScreen() {
  const navigate = useNavigate()
  const world = useGameStore((state) => state.world)
  const saves = useGameStore((state) => state.saves)
  const loadGame = useGameStore((state) => state.loadGame)
  const removeSave = useGameStore((state) => state.removeSave)
  const importFromText = useGameStore((state) => state.importFromText)
  const fileRef = useRef<HTMLInputElement>(null)

  const currentSummary = world ? saves.find((save) => save.id === useGameStore.getState().saveId) : null
  const user = world?.players[world.playerId]

  return (
    <div className="app-shell px-4 pb-10 pt-[max(1rem,env(safe-area-inset-top))]">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="grid size-9 place-items-center rounded-xl border border-accent/30 bg-accent/10">
            <span className="font-mono text-[13px] font-bold text-accent">PL</span>
          </div>
          <div>
            <p className="text-sm font-semibold tracking-wide text-text">绿茵人生</p>
            <p className="text-[10px] uppercase tracking-[0.18em] text-dim">Pitch Life</p>
          </div>
        </div>
        <button type="button" className="btn-ghost px-3 text-[11px]" aria-label="导入存档" onClick={() => fileRef.current?.click()}>
          <Upload size={16} /> 导入
        </button>
      </header>

      <section className="relative mt-10 overflow-hidden rounded-3xl border border-line bg-card/80 px-5 py-8">
        <div className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full border border-accent/15" />
        <div className="pointer-events-none absolute -right-6 -top-6 size-28 rounded-full border border-accent/10" />
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-accent">Agent Career Simulator</p>
        <h1 className="mt-3 text-[34px] font-semibold leading-[1.12] tracking-tight text-text">
          从青训营到国家队，
          <br />
          书写你的<span className="text-accent">足球人生</span>。
        </h1>
        <p className="mt-4 max-w-[300px] text-[13px] leading-relaxed text-muted">
          训练、比赛、媒体、转会与生活。引擎负责事实，AI 负责叙事——你只需要做出选择。
        </p>
        <div className="mt-6 flex flex-col gap-2">
          {world ? (
            <button type="button" className="btn-primary w-full" onClick={() => navigate('/game')}>
              继续生涯
              <ChevronRight size={16} />
            </button>
          ) : null}
          <button
            type="button"
            className={world ? 'btn-secondary w-full' : 'btn-primary w-full'}
            onClick={() => navigate('/create')}
          >
            <Plus size={16} />
            新建生涯
          </button>
        </div>
        {world && user ? (
          <p className="mt-3 text-center text-[11px] text-dim">
            {user.name} · {world.clubs[world.clubId]?.nameZh} · {formatSeasonLabel(world.season)} 第 {world.week} 周
            {currentSummary ? ` · ${formatMoneyShort(world.finance.balance)}` : ''}
          </p>
        ) : null}
      </section>

      {saves.length > 0 ? (
        <section className="mt-6">
          <div className="mb-2 flex items-center justify-between px-1">
            <h2 className="section-title">本地存档</h2>
            <span className="text-[10px] text-dim">{saves.length} 个</span>
          </div>
          <div className="space-y-2">
            {saves.map((save) => {
              const active = save.id === useGameStore.getState().saveId
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
      ) : null}

      <section className="mt-6 grid grid-cols-2 gap-2">
        <Card className="p-3">
          <p className="text-[11px] text-muted">导入存档</p>
          <button type="button" className="btn-secondary mt-2 w-full" onClick={() => fileRef.current?.click()}>
            <Upload size={15} /> 选择 JSON
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={async (event) => {
              const file = event.target.files?.[0]
              if (!file) return
              const text = await file.text()
              const ok = await importFromText(text)
              event.target.value = ''
              if (ok) navigate('/game')
            }}
          />
        </Card>
        <Card className="p-3">
          <p className="text-[11px] text-muted">本地优先</p>
          <p className="mt-2 text-[11px] leading-relaxed text-dim">
            存档保存在本机浏览器。无需账号，也不会上传到我们的服务器。
          </p>
        </Card>
      </section>

      <footer className="mt-8 px-2 text-center text-[10px] leading-relaxed text-dim">
        <p>非官方作品，与任何真实联赛、俱乐部或机构无关。联赛、俱乐部与球员均为化名。</p>
        <p className="mt-1">v0.1 · 确定性引擎 + 模板事件</p>
      </footer>
    </div>
  )
}
