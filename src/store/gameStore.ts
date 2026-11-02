import { create } from 'zustand'
import { createAiSlice } from './aiSlice'
import { createCareerSlice } from './careerSlice'
import { createDaySlice } from './daySlice'
import { createFinanceSlice } from './financeSlice'
import { createGrowthSlice } from './growthSlice'
import { createLiveSlice } from './liveSlice'
import { createMatchSlice } from './matchSlice'
import { createPreferenceSlice } from './preferenceSlice'
import { createStaffSlice } from './staffSlice'
import { createUiSlice } from './uiSlice'
import type { GameStore } from './types'

export const useGameStore = create<GameStore>()((...args) => ({
  ...createCareerSlice(...args),
  ...createMatchSlice(...args),
  ...createDaySlice(...args),
  ...createGrowthSlice(...args),
  ...createFinanceSlice(...args),
  ...createStaffSlice(...args),
  ...createLiveSlice(...args),
  ...createAiSlice(...args),
  ...createPreferenceSlice(...args),
  ...createUiSlice(...args),
}))
