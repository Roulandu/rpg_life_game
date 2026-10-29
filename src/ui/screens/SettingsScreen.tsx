import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useGameStore } from '../../store/gameStore'
import { PageHeader } from '../components/PageHeader'
import { AiSettingsSection } from './settings/AiSettingsSection'
import { DangerZone } from './settings/DangerZone'
import { LocalDataSection } from './settings/LocalDataSection'
import { PrivacySection } from './settings/PrivacySection'
import { SettingsFooter } from './settings/SettingsFooter'
import { UsageSection } from './settings/UsageSection'
import type { ApiKeyForm } from './settings/types'
import { useSettingsForm } from './settings/useSettingsForm'

type SettingsForm = ReturnType<typeof useSettingsForm>

function toApiKeyForm(form: SettingsForm, ready: boolean, hint: string | null): ApiKeyForm {
  return {
    native: form.native,
    ready,
    hint,
    input: form.keyInput,
    show: form.showKey,
    remember: form.rememberKey,
    setInput: form.setKeyInput,
    toggleShow: form.toggleShow,
    setRemember: form.setRememberKey,
    save: form.saveKey,
    clear: form.clearKey,
  }
}

export function SettingsScreen() {
  const navigate = useNavigate()
  const world = useGameStore((state) => state.world)
  const saveId = useGameStore((state) => state.saveId)
  const aiKeyReady = useGameStore((state) => state.aiKeyReady)
  const aiKeyHint = useGameStore((state) => state.aiKeyHint)
  const aiError = useGameStore((state) => state.aiError)
  const saveNow = useGameStore((state) => state.saveNow)
  const exportCurrent = useGameStore((state) => state.exportCurrent)
  const form = useSettingsForm(world?.settings)

  if (!world) return null
  const settings = world.settings
  const usage = world.aiUsage
  const aiKeyForm = toApiKeyForm(form, aiKeyReady, aiKeyHint)

  return (
    <div className="page-pad pb-6">
      <button type="button" className="btn-ghost -ml-2 mb-3 px-2" onClick={() => navigate('/more')}>
        <ArrowLeft size={16} /> 更多
      </button>
      <PageHeader eyebrow="Settings" title="设置" subtitle="叙事偏好、本地数据与隐私。" />

      <AiSettingsSection
        settings={settings}
        aiEnabled={settings.aiMode === 'llm'}
        keyReady={aiKeyReady}
        keyHint={aiKeyHint}
        aiError={aiError}
        testState={form.testState}
        form={aiKeyForm}
        onChangeProvider={form.changeProvider}
        onTest={() => void form.handleTest()}
      />

      {usage && usage.calls > 0 ? <UsageSection usage={usage} /> : null}
      <PrivacySection />
      <LocalDataSection
        season={world.season}
        week={world.week}
        fileRef={form.fileRef}
        onSave={() => void saveNow()}
        onExport={exportCurrent}
        onImportFile={form.importFile}
        onImported={() => {
          if (useGameStore.getState().world) navigate('/game')
        }}
      />
      <DangerZone saveId={saveId} onRemoved={() => navigate('/')} />
      <SettingsFooter engineVersion={world.engineVersion} />
    </div>
  )
}
