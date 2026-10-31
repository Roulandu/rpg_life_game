import { useNavigate } from 'react-router-dom'
import { Settings } from 'lucide-react'
import { POSITION_LABELS, overall } from '../../../domain'
import type { Club, League, Player, WorldState } from '../../../domain'
import { formatMoneyShort, formatSeasonLabel } from '../../../lib'
import { ThemeToggle } from '../../components/ThemeToggle'

export function DashboardHeader({
  world,
  user,
  club,
  league,
  position,
}: {
  world: WorldState
  user: Player
  club: Club
  league: League
  position: number
}) {
  const navigate = useNavigate()

  return (
    <header className="mb-4" data-dashboard-block="header">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div
            className="grid size-11 shrink-0 place-items-center rounded-xl border text-base font-black"
            style={{
              backgroundColor: club.colors.secondary,
              borderColor: club.colors.primary,
              color: club.colors.primary,
            }}
            aria-hidden="true"
          >
            {club.nameZh.slice(0, 1)}
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-accent">
              {formatSeasonLabel(world.season)} · 第 {world.week} 周
            </p>
            <h1 className="truncate text-xl font-semibold leading-tight text-text">{club.nameZh}</h1>
            <p className="mt-0.5 text-[11px] text-muted">
              {league.nameZh} · 第 {position || '—'} 名
            </p>
          </div>
        </div>
        <div className="flex items-start gap-1">
          <div className="text-right">
            <p className="text-[10px] text-dim">能力</p>
            <p className="font-mono text-3xl font-semibold leading-none text-accent">{overall(user).toFixed(1)}</p>
            <p className="mt-1 font-mono text-[10px] text-muted">{formatMoneyShort(world.finance.balance)}</p>
          </div>
          <ThemeToggle />
          <button type="button" className="btn-ghost -mr-2 px-2" aria-label="设置" onClick={() => navigate('/settings')}>
            <Settings size={17} />
          </button>
        </div>
      </div>
      <p className="mt-2 text-xs text-muted">
        {user.name} · {POSITION_LABELS[user.position]} · {user.age} 岁
        {user.injury ? <span className="ml-2 text-danger">伤停 {user.injury.weeksLeft} 周</span> : null}
      </p>
    </header>
  )
}
