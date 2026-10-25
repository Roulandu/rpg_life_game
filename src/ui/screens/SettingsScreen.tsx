import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Download,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  Save,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  Wallet,
  XCircle,
} from 'lucide-react'
import { useGameStore } from '../../store/gameStore'
import { formatSeasonLabel } from '../../lib/format'
import { pickDefaultBaseUrl, pickDefaultModel } from '../../llm/types'
import { isNativePlatform } from '../../platform/native'
import { Card, SectionTitle } from '../components/Card'
import { PageHeader } from '../components/PageHeader'

const NETWORK_LABELS = {
  auto: '自动（推荐）',
  direct: '浏览器直连',
  native: 'Android 原生 HTTP',
  proxy: '自建代理',
} as const

export function SettingsScreen() {
  const navigate = useNavigate()
  const world = useGameStore((state) => state.world)
  const saveId = useGameStore((state) => state.saveId)
  const aiKeyReady = useGameStore((state) => state.aiKeyReady)
  const aiKeyHint = useGameStore((state) => state.aiKeyHint)
  const aiError = useGameStore((state) => state.aiError)
  const updateSettings = useGameStore((state) => state.updateSettings)
  const saveNow = useGameStore((state) => state.saveNow)
  const setApiKey = useGameStore((state) => state.setApiKey)
  const clearApiKey = useGameStore((state) => state.clearApiKey)
  const testAi = useGameStore((state) => state.testAi)
  const exportCurrent = useGameStore((state) => state.exportCurrent)
  const importFromText = useGameStore((state) => state.importFromText)
  const removeSave = useGameStore((state) => state.removeSave)
  const fileRef = useRef<HTMLInputElement>(null)
  const [keyInput, setKeyInput] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [rememberKey, setRememberKey] = useState(false)
  const [testState, setTestState] = useState<{ running: boolean; ok: boolean | null; message: string }>({
    running: false,
    ok: null,
    message: '',
  })
  if (!world) return null

  const settings = world.settings
  const native = isNativePlatform()
  const usage = world.aiUsage
  const aiEnabled = settings.aiMode === 'llm'

  function changeProvider(provider: typeof settings.provider) {
    const baseUrl =
      !settings.baseUrl || settings.baseUrl === pickDefaultBaseUrl(settings.provider)
        ? pickDefaultBaseUrl(provider)
        : settings.baseUrl
    const model =
      !settings.model || settings.model === pickDefaultModel(settings.provider)
        ? pickDefaultModel(provider)
        : settings.model
    updateSettings({ provider, baseUrl, model })
  }

  async function handleTest() {
    setTestState({ running: true, ok: null, message: '正在请求模型供应商…' })
    const result = await testAi()
    setTestState({ running: false, ok: result.ok, message: result.message })
  }

  return (
    <div className="page-pad pb-6">
      <button type="button" className="btn-ghost -ml-2 mb-3 px-2" onClick={() => navigate('/more')}>
        <ArrowLeft size={16} /> 更多
      </button>
      <PageHeader eyebrow="Settings" title="设置" subtitle="叙事偏好、本地数据与隐私。" />

      <section className="mb-3">
        <SectionTitle right={<span className="chip">自备 Key</span>}>AI 叙事</SectionTitle>
        <Card className="space-y-3">
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              className={`rounded-xl border px-3 py-2.5 text-left transition ${
                !aiEnabled ? 'border-accent bg-accent/10' : 'border-line bg-card-2'
              }`}
              onClick={() => updateSettings({ aiMode: 'template' })}
            >
              <span className={`block text-xs font-semibold ${!aiEnabled ? 'text-accent' : 'text-text'}`}>
                本地模板
              </span>
              <span className="mt-0.5 block text-[10px] leading-relaxed text-muted">离线可玩，不产生费用</span>
            </button>
            <button
              type="button"
              className={`rounded-xl border px-3 py-2.5 text-left transition ${
                aiEnabled ? 'border-teal bg-teal/10' : 'border-line bg-card-2'
              }`}
              onClick={() => updateSettings({ aiMode: 'llm' })}
            >
              <span className={`block text-xs font-semibold ${aiEnabled ? 'text-teal' : 'text-text'}`}>
                AI 叙事
              </span>
              <span className="mt-0.5 block text-[10px] leading-relaxed text-muted">
                引擎事实不变，只增强文字
              </span>
            </button>
          </div>

          {aiEnabled && !aiKeyReady ? (
            <p className="flex items-start gap-2 rounded-xl border border-gold/25 bg-gold/5 px-3 py-2.5 text-[11px] leading-relaxed text-gold">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              还没有可用的 API Key。推进时仍会使用本地模板，随时可以补上。
            </p>
          ) : null}

          <div>
            <label className="label" htmlFor="ai-provider">
              供应商
            </label>
            <select
              id="ai-provider"
              className="input"
              value={settings.provider}
              onChange={(event) => changeProvider(event.target.value as typeof settings.provider)}
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
              placeholder={pickDefaultBaseUrl(settings.provider)}
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
              placeholder={pickDefaultModel(settings.provider)}
              value={settings.model}
              onChange={(event) => updateSettings({ model: event.target.value })}
              autoComplete="off"
              spellCheck={false}
            />
          </div>

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
                  updateSettings({ networkMode: event.target.value as typeof settings.networkMode })
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
                    narrativeDensity: event.target.value as typeof settings.narrativeDensity,
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
          <p className="-mt-1 text-[10px] leading-relaxed text-dim">
            {settings.networkMode === 'native'
              ? '原生模式仅 Android 可用，请求不经过 WebView 的 CORS 限制。'
              : settings.networkMode === 'proxy'
                ? '代理模式需要自建转发端点，适合浏览器直连被 CORS 拦截的供应商。'
                : '自动模式会按供应商选择直连；失败时可在下方测试并切换。'}
          </p>

          {settings.provider !== 'anthropic' ? (
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
                    updateSettings({ tokenParam: event.target.value as typeof settings.tokenParam })
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
          ) : null}

          <div className="rounded-xl border border-line-soft bg-card-2/60 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-text">
                <KeyRound size={13} className="text-muted" /> API Key
              </span>
              <span className={`chip px-1.5 py-0 text-[9px] ${aiKeyReady ? 'border-teal/30 text-teal' : ''}`}>
                {aiKeyReady ? '已载入' : '未配置'}
              </span>
            </div>
            <div className="mt-2 flex gap-1.5">
              <input
                type={showKey ? 'text' : 'password'}
                className="input font-mono text-xs"
                placeholder={aiKeyReady ? '已保存，输入新 Key 可替换' : '粘贴 API Key'}
                value={keyInput}
                onChange={(event) => setKeyInput(event.target.value)}
                autoComplete="off"
                spellCheck={false}
                aria-label="API Key"
              />
              <button
                type="button"
                className="btn-ghost shrink-0 px-2"
                aria-label={showKey ? '隐藏 Key' : '显示 Key'}
                onClick={() => setShowKey((value) => !value)}
              >
                {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {native ? (
              <p className="mt-2 text-[10px] leading-relaxed text-dim">Android 端使用系统安全存储（Keystore）。</p>
            ) : (
              <label className="mt-2 flex items-start gap-2 text-[10px] leading-relaxed text-muted">
                <input
                  type="checkbox"
                  className="mt-0.5 accent-teal"
                  checked={rememberKey}
                  onChange={(event) => setRememberKey(event.target.checked)}
                />
                <span>
                  在本机记住密钥（Web Crypto 加密保存）。不勾选时只保留在本次会话，刷新后需重新填写。
                </span>
              </label>
            )}
            {aiKeyHint ? <p className="mt-1 text-[10px] text-dim">{aiKeyHint}</p> : null}
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              <button
                type="button"
                className="btn-secondary text-xs"
                disabled={!keyInput.trim()}
                onClick={async () => {
                  await setApiKey(keyInput, native ? true : rememberKey)
                  setKeyInput('')
                  setTestState({ running: false, ok: null, message: '' })
                }}
              >
                保存 Key
              </button>
              <button
                type="button"
                className="btn-secondary text-xs"
                disabled={!aiKeyReady}
                onClick={() => void clearApiKey()}
              >
                清除 Key
              </button>
            </div>
          </div>

          <button
            type="button"
            className="btn-secondary w-full"
            disabled={!aiKeyReady || testState.running}
            onClick={() => void handleTest()}
          >
            {testState.running ? <LoaderCircle size={15} className="animate-spin" /> : <Sparkles size={15} />}
            {testState.running ? '正在测试…' : '测试连接'}
          </button>
          {testState.message ? (
            <p
              className={`flex items-start gap-2 rounded-xl border px-3 py-2.5 text-[11px] leading-relaxed ${
                testState.ok === true
                  ? 'border-teal/25 bg-teal/5 text-teal'
                  : testState.ok === false
                    ? 'border-danger/25 bg-danger/5 text-danger'
                    : 'border-line-soft text-muted'
              }`}
            >
              {testState.ok === true ? (
                <CheckCircle2 size={14} className="mt-0.5 shrink-0" />
              ) : testState.ok === false ? (
                <XCircle size={14} className="mt-0.5 shrink-0" />
              ) : null}
              {testState.message}
            </p>
          ) : null}
          {aiError ? (
            <p className="flex items-start gap-2 rounded-xl border border-danger/25 bg-danger/5 px-3 py-2.5 text-[11px] leading-relaxed text-danger">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              {aiError}
            </p>
          ) : null}
        </Card>
      </section>

      {usage && usage.calls > 0 ? (
        <section className="mb-3">
          <SectionTitle right={<Wallet size={14} className="text-muted" />}>AI 用量</SectionTitle>
          <Card className="space-y-2">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-[10px] text-dim">调用</p>
                <p className="font-mono text-lg text-text">{usage.calls}</p>
              </div>
              <div>
                <p className="text-[10px] text-dim">输入 / 输出</p>
                <p className="font-mono text-sm text-text">
                  {usage.promptTokens} / {usage.completionTokens}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-dim">估算费用</p>
                <p className="font-mono text-lg text-accent">${usage.costUsd.toFixed(4)}</p>
              </div>
            </div>
            <p className="text-[10px] leading-relaxed text-dim">
              费用按可编辑价格表估算，实际以供应商账单为准。叙事关闭或回退模板时不会产生调用。
            </p>
          </Card>
        </section>
      ) : null}

      <section className="mb-3">
        <SectionTitle right={<ShieldCheck size={14} className="text-teal" />}>隐私</SectionTitle>
        <Card className="space-y-2 text-[11px] leading-relaxed text-muted">
          <p>游戏不需要账号，也不依赖我们的服务器。存档保存在本机浏览器的 IndexedDB 中。</p>
          <p>
            密钥只保存在本机：Web 端默认会话级保存，勾选后使用 Web Crypto 加密；Android
            端使用系统安全存储。密钥不会写入存档、日志或导出文件。
          </p>
          <p>
            开启 AI 后，本周的比赛与事件摘要会直接从设备发往你选择的模型供应商。建议使用单独的限额
            Key，并避免在自由对话里输入真实个人信息。
          </p>
          <p className="text-dim">
            浏览器端无法完全防御 XSS。游戏不加载第三方脚本与统计，但仍请保持浏览器与系统更新。
          </p>
        </Card>
      </section>

      <section className="mb-3">
        <SectionTitle>本地数据</SectionTitle>
        <Card className="p-0">
          <button
            type="button"
            className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-card-2/60"
            onClick={() => void saveNow()}
          >
            <Save size={15} className="text-muted" />
            <span className="flex-1 text-xs text-text">立即保存</span>
            <span className="text-[10px] text-dim">
              {formatSeasonLabel(world.season)} 第 {world.week} 周
            </span>
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-3 border-t border-line-soft px-4 py-3 text-left hover:bg-card-2/60"
            onClick={exportCurrent}
          >
            <Download size={15} className="text-muted" />
            <span className="flex-1 text-xs text-text">导出当前存档</span>
            <span className="text-[10px] text-dim">JSON</span>
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-3 border-t border-line-soft px-4 py-3 text-left hover:bg-card-2/60"
            onClick={() => fileRef.current?.click()}
          >
            <Upload size={15} className="text-muted" />
            <span className="flex-1 text-xs text-text">导入存档</span>
            <span className="text-[10px] text-dim">覆盖为新存档</span>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={async (event) => {
              const file = event.target.files?.[0]
              if (!file) return
              await importFromText(await file.text())
              event.target.value = ''
              if (useGameStore.getState().world) navigate('/game')
            }}
          />
        </Card>
      </section>

      <section className="mb-4">
        <SectionTitle>危险操作</SectionTitle>
        <Card className="border-danger/25">
          <p className="text-[11px] leading-relaxed text-muted">
            删除当前存档会同时移除本地数据。导出过 JSON 的话，之后仍然可以重新导入。
          </p>
          <button
            type="button"
            className="btn-secondary mt-3 w-full border-danger/30 text-danger hover:border-danger/60 hover:text-danger"
            onClick={() => {
              if (!saveId) return
              if (window.confirm('删除当前存档？这个操作无法撤销。')) {
                void removeSave(saveId).then(() => navigate('/'))
              }
            }}
          >
            <Trash2 size={15} /> 删除当前存档
          </button>
        </Card>
      </section>

      <p className="px-1 text-center text-[10px] leading-relaxed text-dim">
        绿茵人生 · engine v{world.engineVersion}
        <br />
        非官方作品，与任何真实联赛、俱乐部或机构无关。
      </p>
    </div>
  )
}
