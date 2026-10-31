import { useEffect } from 'react'
import { SPEED_INTERVAL_MS, useGameStore } from '../../../store'

export function useLiveClock(): void {
  const phase = useGameStore((state) => state.livePlayback.phase)
  const speed = useGameStore((state) => state.livePlayback.speed)
  const tick = useGameStore((state) => state.tickLiveMatch)

  useEffect(() => {
    if (phase !== 'playing') return
    const timer = window.setInterval(tick, SPEED_INTERVAL_MS[speed])
    return () => window.clearInterval(timer)
  }, [phase, speed, tick])
}
