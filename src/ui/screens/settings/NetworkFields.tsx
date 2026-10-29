import { useGameStore } from '../../../store'
import type { GameSettings } from './types'

const NETWORK_LABELS = {
  auto: '自动（推荐）',
  direct: '浏览器直连',
  native: 'Android 原生 HTTP',
  proxy: '自建代理',
} as const

function networkHint(mode: GameSettings['networkMode']) {
  if (mode === 'native') return '原生模式仅 Android 可用，请求不经过 WebView 的 CORS 限制。'
  if (mode === 'proxy') return '代理模式需要自建转发端点，适合浏览器直连被 CORS 拦截的供应商。'
  return '自动模式会按供应商选择直连；失败时可在下方测试并切换。'
}

export function NetworkFields({ settings }: { settings: GameSettings }) {
  const updateSettings = useGameStore((state) => state.updateSettings)
  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label" htmlFor="ai-network">
            网络模式
          </label>
          <select
            id="ai-network"
            className="input"
            value={settings.networkMode ?? 'auto'}
            onChange={(event) =>
              updateSettings({ networkMode: event.target.value as GameSettings['networkMode'] })
            }
          >
            {(Object.keys(NETWORK_LABELS) as (keyof typeof NETWORK_LABELS)[]).map((mode) => (
              <option key={mode} value={mode}>
                {NETWORK_LABELS[mode]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="narrative-density">
            叙事密度
          </label>
          <select
            id="narrative-density"
            className="input"
            value={settings.narrativeDensity}
            onChange={(event) =>
              updateSettings({
                narrativeDensity: event.target.value as GameSettings['narrativeDensity'],
              })
            }
          >
            <option value="lean">精简</option>
            <option value="standard">标准</option>
            <option value="rich">丰富</option>
            <option value="off">关闭（纯数值）</option>
          </select>
        </div>
      </div>
      <p className="-mt-1 text-[10px] leading-relaxed text-dim">{networkHint(settings.networkMode)}</p>
    </>
  )
}
