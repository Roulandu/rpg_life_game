import { CalendarDays, House, Inbox, Menu, UserRound } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useGameStore } from '../../store/gameStore'
import clsx from 'clsx'

const ITEMS = [
  { to: '/game', label: '主页', icon: House },
  { to: '/schedule', label: '赛程', icon: CalendarDays },
  { to: '/inbox', label: '收件箱', icon: Inbox },
  { to: '/profile', label: '生涯', icon: UserRound },
  { to: '/more', label: '更多', icon: Menu },
]

export function BottomNav() {
  const openEvents = useGameStore((state) =>
    state.world ? Object.values(state.world.events).filter((event) => event.status === 'open').length : 0,
  )

  return (
    <nav
      aria-label="主导航"
      className="fixed bottom-0 left-1/2 z-40 w-full max-w-[480px] -translate-x-1/2 border-t border-line bg-pitch/95 backdrop-blur"
    >
      <div className="safe-bottom grid grid-cols-5">
        {ITEMS.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                clsx(
                  'relative flex min-h-14 flex-col items-center justify-center gap-1 px-1 text-[10px] font-medium transition',
                  isActive ? 'text-accent' : 'text-dim hover:text-muted',
                )
              }
            >
              <span className="relative">
                <Icon size={20} strokeWidth={1.8} aria-hidden="true" />
                {item.to === '/inbox' && openEvents > 0 ? (
                  <span className="absolute -right-2 -top-1 grid min-w-4 place-items-center rounded-full bg-accent px-1 text-[9px] font-bold leading-4 text-accent-ink">
                    {openEvents > 9 ? '9+' : openEvents}
                  </span>
                ) : null}
              </span>
              {item.label}
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
