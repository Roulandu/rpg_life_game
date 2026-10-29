import type { WorldState } from '../../../domain/types'

export type GameSettings = WorldState['settings']

export interface TestState {
  running: boolean
  ok: boolean | null
  message: string
}

export interface ApiKeyForm {
  native: boolean
  ready: boolean
  hint: string | null
  input: string
  show: boolean
  remember: boolean
  setInput: (value: string) => void
  toggleShow: () => void
  setRemember: (value: boolean) => void
  save: () => void
  clear: () => void
}
