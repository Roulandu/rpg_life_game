import { useGameStore } from '../../src/store/gameStore'

export function resetUiStore(): void {
  useGameStore.setState({
    world: null,
    saveId: null,
    saves: [],
    lastTurn: null,
    seasonTransition: null,
    busy: false,
    hydrated: true,
    notice: null,
    error: null,
    aiBusy: false,
    aiError: null,
    aiKeyReady: false,
    aiKeyHint: null,
  })
}
