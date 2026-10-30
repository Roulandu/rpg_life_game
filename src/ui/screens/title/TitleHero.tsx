import { ChevronRight, Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useGameStore } from '../../../store'
import { formatMoneyShort, formatSeasonLabel } from '../../../lib'

export function TitleHero() {
  const navigate = useNavigate()
  const world = useGameStore((state) => state.world)
  const saves = useGameStore((state) => state.saves)
  const saveId = useGameStore((state) => state.saveId)
  const user = world?.players[world.playerId]
  const currentSummary = world ? saves.find((save) => save.id === saveId) : null

  return (
    <section className="relative mt-10 overflow-hidden rounded-3xl border border-line bg-card/80 px-5 py-8 lg:mt-0">
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
  )
}
