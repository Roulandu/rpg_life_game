import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

/**
 * 职责：钉住「存档存在哪」这句话要跟着真实平台变，原生 App 不能再声称存在浏览器里。
 * 边界：只 mock 平台探针，不改 store 与数据库；浏览器分支用默认实现。
 * 依赖：src/ui 的 TitleScreen 与 SettingsScreen（内含 PrivacySection），src/platform/native 的 isNativePlatform。
 */
const native = vi.hoisted(() => ({ value: false }))

vi.mock('../../src/platform/native', () => ({
  isNativePlatform: () => native.value,
}))

async function renderTitle() {
  const { TitleScreen } = await import('../../src/ui')
  render(
    <MemoryRouter initialEntries={['/']}>
      <TitleScreen />
    </MemoryRouter>,
  )
}

async function renderSettings() {
  const { SettingsScreen } = await import('../../src/ui')
  const { useGameStore } = await import('../../src/store/gameStore')
  const { generateWorld } = await import('../../src/world/generator')
  const { TEST_NOW, testOptions } = await import('../fixtures/career')
  useGameStore.setState({ world: generateWorld(testOptions(), TEST_NOW), hydrated: true, saves: [] })
  render(
    <MemoryRouter initialEntries={['/settings']}>
      <SettingsScreen />
    </MemoryRouter>,
  )
}

describe('存档位置的文案要跟真实平台一致', () => {
  afterEach(() => {
    cleanup()
    native.value = false
    vi.resetModules()
  })

  it('回归: 原生 App 的标题页谎称存档保存在本机浏览器', async () => {
    native.value = true
    await renderTitle()

    expect(screen.getByText(/存档保存在本机 App 存储/)).toBeInTheDocument()
    expect(screen.queryByText(/本机浏览器/)).toBeNull()
  })

  it('浏览器版仍然说明存档留在本机浏览器', async () => {
    native.value = false
    await renderTitle()

    expect(screen.getByText(/存档保存在本机浏览器/)).toBeInTheDocument()
  })

  it('回归: 原生 App 的隐私页谎称存档写进本机浏览器的 IndexedDB', async () => {
    native.value = true
    await renderSettings()

    expect(screen.getByText(/存档保存在本机 App 的存储/)).toBeInTheDocument()
    expect(screen.queryByText(/本机浏览器/)).toBeNull()
  })

  it('浏览器版的隐私页保留 Web 端事实', async () => {
    native.value = false
    await renderSettings()

    expect(screen.getByText(/存档保存在本机浏览器的 IndexedDB/)).toBeInTheDocument()
  })
})
