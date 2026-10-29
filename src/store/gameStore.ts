import { create } from 'zustand'
import { createAiSlice } from './aiSlice'
import { createCareerSlice } from './careerSlice'
import { createMatchSlice } from './matchSlice'
import { createUiSlice } from './uiSlice'
import type { GameStore } from './types'

export const useGameStore = create<GameStore>()((...args) => ({
  ...createCareerSlice(...args),
  ...createMatchSlice(...args),
  ...createAiSlice(...args),
  ...createUiSlice(...args),
}))
