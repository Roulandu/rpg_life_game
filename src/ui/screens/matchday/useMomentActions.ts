import { useState } from 'react'
import { useGameStore } from '../../../store'

export function useMomentActions() {
  const resolveKeyMoment = useGameStore((state) => state.resolveKeyMoment)
  const skipKeyMoments = useGameStore((state) => state.skipKeyMoments)
  const [acting, setActing] = useState(false)

  async function choose(momentId: string, optionId: string) {
    if (acting) return
    setActing(true)
    try {
      await resolveKeyMoment(momentId, optionId)
    } catch {
      // store 已写入 error，这里只负责解除按钮锁定
    } finally {
      setActing(false)
    }
  }

  async function skip() {
    if (acting) return
    setActing(true)
    try {
      await skipKeyMoments()
    } catch {
      // store 已写入 error，这里只负责解除按钮锁定
    } finally {
      setActing(false)
    }
  }

  return { acting, choose, skip }
}
