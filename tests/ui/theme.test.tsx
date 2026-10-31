import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, screen } from '@testing-library/react'
import { SettingsScreen } from '../../src/ui/screens/SettingsScreen'
import { TitleScreen } from '../../src/ui/screens/TitleScreen'
import { useGameStore } from '../../src/store'
import { generateWorld } from '../../src/world/generator'
import { TEST_NOW, testOptions } from '../fixtures/career'
import { renderWithRouter } from './renderScreen'
import { resetUiStore } from './resetStore'

afterEach(() => {
  cleanup()
  resetUiStore()
  window.localStorage.clear()
})

describe('主题快捷切换', () => {
  it('标题页提供切换到浅色模式的按钮', () => {
    useGameStore.setState({ hydrated: true, saves: [] })
    renderWithRouter(<TitleScreen />)

    expect(screen.getByRole('button', { name: '切换到浅色模式' })).toBeInTheDocument()
  })
})

describe('设置页外观', () => {
  it('提供跟随系统、浅色、深色三选一', () => {
    useGameStore.setState({ world: generateWorld(testOptions(), TEST_NOW), hydrated: true, saves: [] })
    renderWithRouter(<SettingsScreen />)

    expect(screen.getByText('外观')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '跟随系统' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '浅色' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '深色' })).toBeInTheDocument()
  })

  it('选择浅色后更新偏好与持久化', () => {
    useGameStore.setState({ world: generateWorld(testOptions(), TEST_NOW), hydrated: true, saves: [] })
    renderWithRouter(<SettingsScreen />)

    fireEvent.click(screen.getByRole('button', { name: '浅色' }))

    expect(useGameStore.getState().themePreference).toBe('light')
    expect(window.localStorage.getItem('pitch-life:theme')).toBe('light')
  })
})
