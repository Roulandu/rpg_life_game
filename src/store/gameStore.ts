import { create } from 'zustand'
import { createAiSlice } from './aiSlice'
import { createCareerSlice } from './careerSlice'
import { createLiveSlice } from './liveSlice'
import { createMatchSlice } from './matchSlice'
import { createPreferenceSlice } from './preferenceSlice'
import { createUiSlice } from './uiSlice'
import type { GameStore } from './types'

export const useGameStore = create<GameStore>()((...args) => ({
  ...createCareerSlice(...args),
  ...createMatchSlice(...args),
  ...createLiveSlice(...args),
  ...createAiSlice(...args),
  ...createPreferenceSlice(...args),
  ...createUiSlice(...args),
}))
