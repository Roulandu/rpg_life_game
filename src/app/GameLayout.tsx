import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { useGameStore } from '../store/gameStore'
import { BottomNav } from '../ui/components/BottomNav'
import { SeasonSummaryModal } from '../ui/components/SeasonSummaryModal'

export function GameLayout() {
  const world = useGameStore((state) => state.world)
  const location = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [location.pathname])

  if (!world) return <Navigate to="/" replace />

  return (
    <div className="app-shell">
      <Outlet />
      <BottomNav />
      <SeasonSummaryModal />
    </div>
  )
}
