import { useGameStore } from '../../../store/gameStore'
import { selectProviderDefaults } from '../../../store/selectors'
import type { GameSettings } from './types'

interface Props {
  settings: GameSettings
  onChangeProvider: (provider: GameSettings['provider']) => void
}

export function ProviderFields({ settings, onChangeProvider }: Props) {
  const updateSettings = useGameStore((state) => state.updateSettings)
  return (
    <>
      <div>
        <label className="label" htmlFor="ai-provider">
          供应商
        </label>
        <select
          id="ai-provider"
          className="input"
          value={settings.provider}
          onChange={(event) => onChangeProvider(event.target.value as GameSettings['provider'])}
        >
          <option value="openai">OpenAI 兼容</option>
          <option value="anthropic">Anthropic</option>
          <option value="custom">自定义代理（OpenAI 兼容）</option>
        </select>
      </div>
      <div>
        <label className="label" htmlFor="ai-base-url">
          Base URL
        </label>
        <input
          id="ai-base-url"
          className="input font-mono text-xs"
          placeholder={selectProviderDefaults(settings.provider).baseUrl}
          value={settings.baseUrl ?? ''}
          onChange={(event) => updateSettings({ baseUrl: event.target.value })}
          autoComplete="off"
          spellCheck={false}
        />
        <p className="mt-1 text-[10px] leading-relaxed text-dim">
          留空使用默认地址。代理模式请填写你自己的兼容端点。
        </p>
      </div>
      <div>
        <label className="label" htmlFor="ai-model">
          模型名称
        </label>
        <input
          id="ai-model"
          className="input font-mono text-sm"
          placeholder={selectProviderDefaults(settings.provider).model}
          value={settings.model}
          onChange={(event) => updateSettings({ model: event.target.value })}
          autoComplete="off"
          spellCheck={false}
        />
      </div>
    </>
  )
}
