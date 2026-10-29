import { useState } from 'react'
import { useGameStore } from '../../../store/gameStore'

export function useMomentActions() {
  const resolveKeyMoment = useGameStore((state) => state.resolveKeyMoment)
  const skipKeyMoments = useGameStore((state) => state.skipKeyMoments)
  const [acting, setActing] = useState(false)

  async function choose(momentId: string, optionId: string) {
    if (acting) return
    setActing(true)
    await resolveKeyMoment(momentId, optionId)
    setActing(false)
  }

  async function skip() {
    if (acting) return
    setActing(true)
    await skipKeyMoments()
    setActing(false)
  }

  return { acting, choose, skip }
}
