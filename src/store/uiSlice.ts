import type { GameStore, StoreSlice } from './types'

type UiSlice = Pick<GameStore, 'dismissSeason' | 'clearLastTurn' | 'setNotice' | 'setError' | 'notice' | 'error'>

export const createUiSlice: StoreSlice<UiSlice> = (set) => ({
  notice: null,
  error: null,

  dismissSeason: () => set({ seasonTransition: null }),
  clearLastTurn: () => set({ lastTurn: null }),
  setNotice: (notice) => set({ notice }),
  setError: (error) => set({ error }),
})
