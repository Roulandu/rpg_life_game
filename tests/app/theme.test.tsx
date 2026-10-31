import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { applyBootTheme, applyTheme, resolveTheme } from '../../src/app/theme'
import { saveThemePreference } from '../../src/platform'

function themeMeta(): HTMLMetaElement {
  const existing = document.head.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
  if (existing) return existing
  const meta = document.createElement('meta')
  meta.name = 'theme-color'
  meta.content = '#0a0d0b'
  document.head.append(meta)
  return meta
}

beforeEach(() => {
  window.localStorage.clear()
  document.documentElement.removeAttribute('data-theme')
  themeMeta()
})

afterEach(() => {
  window.localStorage.clear()
  document.documentElement.removeAttribute('data-theme')
  themeMeta().remove()
})

describe('主题解析与 DOM 应用', () => {
  it('跟随系统时使用系统色', () => {
    expect(resolveTheme('system', 'light')).toBe('light')
    expect(resolveTheme('system', 'dark')).toBe('dark')
  })

  it('显式偏好覆盖系统色', () => {
    expect(resolveTheme('light', 'dark')).toBe('light')
    expect(resolveTheme('dark', 'light')).toBe('dark')
  })

  it('显式浅色写入 data-theme 与 theme-color', () => {
    applyTheme('light', 'dark')

    expect(document.documentElement.dataset.theme).toBe('light')
    expect(themeMeta().content).toBe('#f2f7f0')
  })

  it('显式深色写入 data-theme 与 theme-color', () => {
    applyTheme('dark', 'light')

    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(themeMeta().content).toBe('#0a0d0b')
  })

  it('跟随系统时移除 data-theme 并使用系统色', () => {
    document.documentElement.dataset.theme = 'light'

    applyTheme('system', 'dark')

    expect(document.documentElement.hasAttribute('data-theme')).toBe(false)
    expect(themeMeta().content).toBe('#0a0d0b')
  })

  it('缺少 theme-color meta 时不抛错', () => {
    themeMeta().remove()

    expect(() => applyTheme('light', 'dark')).not.toThrow()
    expect(document.documentElement.dataset.theme).toBe('light')
  })

  it('启动时读取已保存的显式偏好', () => {
    saveThemePreference('light')

    applyBootTheme()

    expect(document.documentElement.dataset.theme).toBe('light')
  })
})
