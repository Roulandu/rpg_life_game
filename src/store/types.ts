import type { StateCreator } from 'zustand'
import type {
  CareerCreateOptions,
  SaveSummary,
  WeeklyPlan,
  WorldState,
} from '../domain'
import type { SeasonTransition, TurnResult } from '../engine'
import type { ConnectionTestResult } from '../llm'
import type { ColorScheme, ThemePreference } from '../platform'
import type { LivePlayback, LiveSpeed } from './livePlayback'

export interface GameStore {
  world: WorldState | null
  saveId: string | null
  saves: SaveSummary[]
  lastTurn: TurnResult | null
  seasonTransition: SeasonTransition | null
  busy: boolean
  hydrated: boolean
  notice: string | null
  error: string | null
  livePlayback: LivePlayback
  aiKeyReady: boolean
  aiKeyHint: string | null
  aiBusy: boolean
  aiError: string | null
  themePreference: ThemePreference
  systemScheme: ColorScheme
  setThemePreference: (preference: ThemePreference) => void
  setSystemScheme: (scheme: ColorScheme) => void
  toggleTheme: () => void
  clearAiError: () => void
  init: () => Promise<void>
  refreshSaves: () => Promise<void>
  createCareer: (options: CareerCreateOptions) => Promise<void>
  loadGame: (id: string) => Promise<boolean>
  saveNow: () => Promise<boolean>
  removeSave: (id: string) => Promise<boolean>
  advance: (plan: WeeklyPlan) => Promise<TurnResult | null>
  resolveKeyMoment: (momentId: string, optionId: string) => Promise<void>
  skipKeyMoments: () => Promise<void>
  finishLiveMatch: () => Promise<void>
  startLivePlayback: () => void
  tickLiveMatch: () => void
  pauseLivePlayback: () => void
  resumeLivePlayback: () => void
  setLiveSpeed: (speed: LiveSpeed) => void
  jumpToNextKeyMoment: () => void
  continueAfterMoment: () => void
  narrateTurn: (result: TurnResult) => Promise<void>
  resolveChoice: (eventId: string, choiceId: string) => Promise<void>
  updateSettings: (patch: Partial<WorldState['settings']>) => void
  setApiKey: (key: string, remember: boolean) => Promise<void>
  clearApiKey: () => Promise<void>
  testAi: () => Promise<ConnectionTestResult>
  sendChat: (message: string) => Promise<void>
  importFromText: (text: string) => Promise<boolean>
  exportCurrent: () => void
  dismissSeason: () => void
  clearLastTurn: () => void
  setNotice: (notice: string | null) => void
  setError: (error: string | null) => void
}

export type StoreSlice<T> = StateCreator<GameStore, [], [], T>

export type StoreSet = (
  partial: Partial<GameStore> | ((state: GameStore) => Partial<GameStore>),
) => void

export type StoreGet = () => GameStore
