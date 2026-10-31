import { useGameStore } from '../../src/store/gameStore'
import { IDLE_PLAYBACK } from '../../src/store/livePlayback'

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
    livePlayback: IDLE_PLAYBACK,
    aiBusy: false,
    aiError: null,
    aiKeyReady: false,
    aiKeyHint: null,
    themePreference: 'system',
    systemScheme: 'dark',
  })
}
