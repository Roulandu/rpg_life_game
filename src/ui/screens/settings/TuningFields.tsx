import { NetworkFields } from './NetworkFields'
import { SamplingFields } from './SamplingFields'
import type { GameSettings } from './types'

export function TuningFields({ settings }: { settings: GameSettings }) {
  return (
    <>
      <NetworkFields settings={settings} />
      <SamplingFields settings={settings} />
    </>
  )
}
