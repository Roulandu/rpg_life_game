import type { Fixture, WorldState } from '../domain'
import { hasPendingKeyMoments } from '../engine'
import { actionLabelFor } from '../llm'
import type { LlmProvider } from '../llm'
import { pickDefaultBaseUrl, pickDefaultModel } from '../llm'
import type { ColorScheme } from '../platform'
import type { GameStore } from './types'
import { STARTING_CLUBS } from '../world'
import { getClubFixtures } from '../world'

export function selectResolvedTheme(
  state: Pick<GameStore, 'themePreference' | 'systemScheme'>,
): ColorScheme {
  return state.themePreference === 'system' ? state.systemScheme : state.themePreference
}

export function selectPendingKeyMoments(world: WorldState | null): boolean {
  if (!world) return false
  return hasPendingKeyMoments(world) || world.lastMatch?.status === 'live'
}

export function selectClubFixtures(world: WorldState | null): Fixture[] {
  if (!world) return []
  return getClubFixtures(world, world.clubId, world.season)
}

export function selectStartingClubs(): typeof STARTING_CLUBS {
  return STARTING_CLUBS
}

export function selectActionLabel(actionId: string | undefined): string | null {
  return actionLabelFor(actionId)
}

export function selectProviderDefaults(provider: LlmProvider): {
  baseUrl: string
  model: string
} {
  return {
    baseUrl: pickDefaultBaseUrl(provider),
    model: pickDefaultModel(provider),
  }
}
