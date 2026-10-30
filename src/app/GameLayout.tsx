import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { useGameStore } from '../store'
import { BottomNav } from '../ui'
import { SeasonSummaryModal } from '../ui'

export function GameLayout() {
  const world = useGameStore((state) => state.world)
  const location = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [location.pathname])

  if (!world) return <Navigate to="/" replace />

  return (
    <div className="app-shell game-shell lg:pb-0">
      <main className="min-w-0 lg:mx-auto lg:w-full lg:max-w-[var(--content-max)]">
        <Outlet />
      </main>
      <BottomNav />
      <SeasonSummaryModal />
    </div>
  )
}
