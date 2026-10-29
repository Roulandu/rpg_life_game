import { useGameStore } from '../../../store/gameStore'

interface Props {
  enabled: boolean
}

export function AiModeToggle({ enabled }: Props) {
  const updateSettings = useGameStore((state) => state.updateSettings)
  return (
    <div className="grid grid-cols-2 gap-1.5">
      <button
        type="button"
        className={`rounded-xl border px-3 py-2.5 text-left transition ${
          !enabled ? 'border-accent bg-accent/10' : 'border-line bg-card-2'
        }`}
        onClick={() => updateSettings({ aiMode: 'template' })}
      >
        <span className={`block text-xs font-semibold ${!enabled ? 'text-accent' : 'text-text'}`}>
          本地模板
        </span>
        <span className="mt-0.5 block text-[10px] leading-relaxed text-muted">离线可玩，不产生费用</span>
      </button>
      <button
        type="button"
        className={`rounded-xl border px-3 py-2.5 text-left transition ${
          enabled ? 'border-teal bg-teal/10' : 'border-line bg-card-2'
        }`}
        onClick={() => updateSettings({ aiMode: 'llm' })}
      >
        <span className={`block text-xs font-semibold ${enabled ? 'text-teal' : 'text-text'}`}>
          AI 叙事
        </span>
        <span className="mt-0.5 block text-[10px] leading-relaxed text-muted">
          引擎事实不变，只增强文字
        </span>
      </button>
    </div>
  )
}
