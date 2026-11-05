import { useGameStore } from '../../src/store/gameStore'
import { nextPending } from './liveStore'

export async function playToEnd(): Promise<void> {
  for (let guard = 0; guard < 30; guard += 1) {
    const state = useGameStore.getState()
    if (state.livePlayback.phase === 'result') {
      state.continueAfterMoment()
      continue
    }
    if (state.livePlayback.phase === 'awaiting') {
      const moment = nextPending()
      if (!moment) break
      await state.resolveKeyMoment(moment.id, moment.defaultOptionId)
      useGameStore.getState().continueAfterMoment()
      await useGameStore.getState().jumpToNextKeyMoment()
      continue
    }
    if (state.livePlayback.phase === 'playing') {
      await useGameStore.getState().jumpToNextKeyMoment()
      continue
    }
    break
  }
}
