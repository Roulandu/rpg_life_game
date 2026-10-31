import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useGameStore } from '../../src/store'
import { selectResolvedTheme } from '../../src/store/selectors'

const STORAGE_KEY = 'pitch-life:theme'

function resetTheme(): void {
  useGameStore.setState({ themePreference: 'system', systemScheme: 'dark' })
}

beforeEach(() => {
  window.localStorage.clear()
  resetTheme()
})

afterEach(() => {
  window.localStorage.clear()
  resetTheme()
})

describe('主题偏好 store', () => {
  it('默认跟随系统', () => {
    expect(useGameStore.getState().themePreference).toBe('system')
  })

  it('设置显式偏好并持久化', () => {
    useGameStore.getState().setThemePreference('light')

    expect(useGameStore.getState().themePreference).toBe('light')
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('light')
  })

  it('跟随系统且系统为深色时，快捷切换为浅色', () => {
    useGameStore.setState({ themePreference: 'system', systemScheme: 'dark' })

    useGameStore.getState().toggleTheme()

    expect(useGameStore.getState().themePreference).toBe('light')
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('light')
  })

  it('跟随系统且系统为浅色时，快捷切换为深色', () => {
    useGameStore.setState({ themePreference: 'system', systemScheme: 'light' })

    useGameStore.getState().toggleTheme()

    expect(useGameStore.getState().themePreference).toBe('dark')
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('dark')
  })

  it('显式浅色再次切换为深色', () => {
    useGameStore.setState({ themePreference: 'light', systemScheme: 'dark' })

    useGameStore.getState().toggleTheme()

    expect(useGameStore.getState().themePreference).toBe('dark')
  })

  it('解析主题时跟随系统或使用显式偏好', () => {
    expect(selectResolvedTheme({ themePreference: 'system', systemScheme: 'light' })).toBe('light')
    expect(selectResolvedTheme({ themePreference: 'dark', systemScheme: 'light' })).toBe('dark')
  })
})
