import { useGameStore } from '../../../store/gameStore'
import type { GameSettings } from './types'

export function SamplingFields({ settings }: { settings: GameSettings }) {
  const updateSettings = useGameStore((state) => state.updateSettings)
  if (settings.provider === 'anthropic') return null
  return (
    <div className="grid grid-cols-2 gap-2">
      <div>
        <label className="label" htmlFor="ai-token-param">
          Token 参数
        </label>
        <select
          id="ai-token-param"
          className="input"
          value={settings.tokenParam ?? 'max_tokens'}
          onChange={(event) =>
            updateSettings({ tokenParam: event.target.value as GameSettings['tokenParam'] })
          }
        >
          <option value="max_tokens">max_tokens</option>
          <option value="max_completion_tokens">max_completion_tokens</option>
        </select>
      </div>
      <div>
        <label className="label" htmlFor="ai-temperature">
          温度 {settings.temperature?.toFixed(2) ?? '0.85'}
        </label>
        <input
          id="ai-temperature"
          type="range"
          min={0.2}
          max={1.2}
          step={0.05}
          className="mt-3 w-full accent-teal"
          value={settings.temperature ?? 0.85}
          onChange={(event) => updateSettings({ temperature: Number(event.target.value) })}
        />
      </div>
    </div>
  )
}
