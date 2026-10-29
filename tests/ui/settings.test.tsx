import { createRef } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { SettingsScreen } from '../../src/ui/screens/SettingsScreen'
import { LocalDataSection } from '../../src/ui/screens/settings/LocalDataSection'
import { useGameStore } from '../../src/store/gameStore'
import type { WorldState } from '../../src/domain/types'
import { generateWorld } from '../../src/world/generator'
import { TEST_NOW, testOptions } from '../fixtures/career'
import { renderWithRouter } from './renderScreen'
import { resetUiStore } from './resetStore'

function renderSettings(world: WorldState) {
  useGameStore.setState({ world, hydrated: true, saves: [] })
  return renderWithRouter(<SettingsScreen />)
}

afterEach(() => {
  cleanup()
  resetUiStore()
})

describe('settings screen', () => {
  it('renders the settings sections', () => {
    renderSettings(generateWorld(testOptions(), TEST_NOW))

    expect(screen.getByText('设置')).toBeInTheDocument()
    expect(screen.getAllByText('AI 叙事').length).toBeGreaterThan(0)
    expect(screen.getByText('隐私')).toBeInTheDocument()
    expect(screen.getByText('本地数据')).toBeInTheDocument()
    expect(screen.getByText('危险操作')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /测试连接/ })).toBeDisabled()
  })

  it('warns when AI mode has no key', () => {
    const world = generateWorld(testOptions(), TEST_NOW)
    world.settings.aiMode = 'llm'
    renderSettings(world)

    expect(screen.getByText(/还没有可用的 API Key。推进时仍会使用本地模板/)).toBeInTheDocument()
  })

  it('shows the usage section only after calls', () => {
    const world = generateWorld(testOptions(), TEST_NOW)
    world.aiUsage = { calls: 3, promptTokens: 120, completionTokens: 80, costUsd: 0.0042 }
    renderSettings(world)

    expect(screen.getByText('AI 用量')).toBeInTheDocument()
    expect(screen.getByText('$0.0042')).toBeInTheDocument()
  })

  it('switches provider defaults for untouched fields', () => {
    const world = generateWorld(testOptions(), TEST_NOW)
    renderSettings(world)

    fireEvent.change(screen.getByLabelText('供应商'), { target: { value: 'anthropic' } })

    expect(useGameStore.getState().world?.settings.provider).toBe('anthropic')
    expect(screen.queryByLabelText('Token 参数')).not.toBeInTheDocument()
  })
})

describe('local data import', () => {
  function renderLocalData(onImportFile: () => Promise<boolean>, onImported: () => void) {
    const fileRef = createRef<HTMLInputElement>()
    const { container } = render(
      <LocalDataSection
        season={1}
        week={1}
        fileRef={fileRef}
        onSave={() => {}}
        onExport={() => {}}
        onImportFile={onImportFile}
        onImported={onImported}
      />,
    )
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, {
      target: { files: [new File(['{}'], 'bad.json', { type: 'application/json' })] },
    })
  }

  it('导入失败时不触发跳转回调', async () => {
    const onImportFile = vi.fn(async () => false)
    const onImported = vi.fn()
    renderLocalData(onImportFile, onImported)

    await waitFor(() => expect(onImportFile).toHaveBeenCalled())
    expect(onImported).not.toHaveBeenCalled()
  })

  it('导入成功时触发跳转回调', async () => {
    const onImportFile = vi.fn(async () => true)
    const onImported = vi.fn()
    renderLocalData(onImportFile, onImported)

    await waitFor(() => expect(onImported).toHaveBeenCalled())
  })
})
