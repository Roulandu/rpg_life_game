import { useRef, useState } from 'react'
import { useGameStore } from '../../../store'
import { selectProviderDefaults } from '../../../store'
import { isNativePlatform } from '../../../platform'
import type { GameSettings, TestState } from './types'

export function useSettingsForm(settings: GameSettings | undefined) {
  const updateSettings = useGameStore((state) => state.updateSettings)
  const setApiKey = useGameStore((state) => state.setApiKey)
  const clearApiKey = useGameStore((state) => state.clearApiKey)
  const testAi = useGameStore((state) => state.testAi)
  const importFromText = useGameStore((state) => state.importFromText)
  const fileRef = useRef<HTMLInputElement>(null)
  const [keyInput, setKeyInput] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [rememberKey, setRememberKey] = useState(false)
  const [testState, setTestState] = useState<TestState>({ running: false, ok: null, message: '' })
  const native = isNativePlatform()

  function changeProvider(provider: GameSettings['provider']) {
    if (!settings) return
    const previous = selectProviderDefaults(settings.provider)
    const next = selectProviderDefaults(provider)
    const baseUrl = !settings.baseUrl || settings.baseUrl === previous.baseUrl ? next.baseUrl : settings.baseUrl
    const model = !settings.model || settings.model === previous.model ? next.model : settings.model
    updateSettings({ provider, baseUrl, model })
  }

  async function handleTest() {
    setTestState({ running: true, ok: null, message: '正在请求模型供应商…' })
    const result = await testAi()
    setTestState({ running: false, ok: result.ok, message: result.message })
  }

  async function saveKey() {
    await setApiKey(keyInput, native ? true : rememberKey)
    setKeyInput('')
    setTestState({ running: false, ok: null, message: '' })
  }

  function clearKey() {
    void clearApiKey()
  }

  async function importFile(file: File) {
    await importFromText(await file.text())
    if (fileRef.current) fileRef.current.value = ''
  }

  return {
    fileRef,
    keyInput,
    setKeyInput,
    showKey,
    toggleShow: () => setShowKey((value) => !value),
    rememberKey,
    setRememberKey,
    testState,
    native,
    changeProvider,
    handleTest,
    saveKey,
    clearKey,
    importFile,
  }
}
