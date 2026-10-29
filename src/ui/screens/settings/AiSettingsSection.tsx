import { AlertTriangle } from 'lucide-react'
import { Card, SectionTitle } from '../../components/Card'
import { AiModeToggle } from './AiModeToggle'
import { ApiKeyFields } from './ApiKeyFields'
import { ConnectionTest } from './ConnectionTest'
import { ProviderFields } from './ProviderFields'
import { TuningFields } from './TuningFields'
import type { ApiKeyForm, GameSettings, TestState } from './types'

interface Props {
  settings: GameSettings
  aiEnabled: boolean
  keyReady: boolean
  keyHint: string | null
  aiError: string | null
  testState: TestState
  form: ApiKeyForm
  onChangeProvider: (provider: GameSettings['provider']) => void
  onTest: () => void
}

export function AiSettingsSection(props: Props) {
  const { settings, aiEnabled, keyReady, aiError, testState, form } = props
  return (
    <section className="mb-3">
      <SectionTitle right={<span className="chip">自备 Key</span>}>AI 叙事</SectionTitle>
      <Card className="space-y-3">
        <AiModeToggle enabled={aiEnabled} />
        {aiEnabled && !keyReady ? (
          <p className="flex items-start gap-2 rounded-xl border border-gold/25 bg-gold/5 px-3 py-2.5 text-[11px] leading-relaxed text-gold">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            还没有可用的 API Key。推进时仍会使用本地模板，随时可以补上。
          </p>
        ) : null}
        <ProviderFields settings={settings} onChangeProvider={props.onChangeProvider} />
        <TuningFields settings={settings} />
        <ApiKeyFields form={form} />
        <ConnectionTest
          ready={keyReady}
          testState={testState}
          aiError={aiError}
          onTest={props.onTest}
        />
      </Card>
    </section>
  )
}
