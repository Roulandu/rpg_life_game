import { loadThemePreference, resolveSystemScheme, saveThemePreference } from '../platform'
import type { ColorScheme } from '../platform'
import type { GameStore, StoreSlice } from './types'

type PreferenceSlice = Pick<
  GameStore,
  | 'themePreference'
  | 'systemScheme'
  | 'setThemePreference'
  | 'setSystemScheme'
  | 'toggleTheme'
>

export const createPreferenceSlice: StoreSlice<PreferenceSlice> = (set, get) => ({
  themePreference: loadThemePreference(),
  systemScheme: resolveSystemScheme(),

  setThemePreference: (preference) => {
    saveThemePreference(preference)
    set({ themePreference: preference })
  },

  setSystemScheme: (systemScheme) => set({ systemScheme }),

  toggleTheme: () => {
    const { themePreference, systemScheme } = get()
    const current = themePreference === 'system' ? systemScheme : themePreference
    const next: ColorScheme = current === 'dark' ? 'light' : 'dark'
    saveThemePreference(next)
    set({ themePreference: next })
  },
})
