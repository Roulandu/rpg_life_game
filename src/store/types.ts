import type { StateCreator } from 'zustand'
import type {
  CareerCreateOptions,
  SaveSummary,
  WeeklyPlan,
  WorldState,
} from '../domain'
import type { SeasonTransition, TurnResult } from '../engine'
import type { ConnectionTestResult } from '../llm'

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
  aiKeyReady: boolean
  aiKeyHint: string | null
  aiBusy: boolean
  aiError: string | null
  clearAiError: () => void
  init: () => Promise<void>
  refreshSaves: () => Promise<void>
  createCareer: (options: CareerCreateOptions) => Promise<void>
  loadGame: (id: string) => Promise<void>
  saveNow: () => Promise<void>
  removeSave: (id: string) => Promise<void>
  advance: (plan: WeeklyPlan) => Promise<TurnResult | null>
  resolveKeyMoment: (momentId: string, optionId: string) => Promise<void>
  skipKeyMoments: () => Promise<void>
  narrateTurn: (result: TurnResult) => Promise<void>
  resolveChoice: (eventId: string, choiceId: string) => Promise<void>
  updateSettings: (patch: Partial<WorldState['settings']>) => void
  setApiKey: (key: string, remember: boolean) => Promise<void>
  clearApiKey: () => Promise<void>
  testAi: () => Promise<ConnectionTestResult>
  sendChat: (message: string) => Promise<void>
  importFromText: (text: string) => Promise<void>
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
