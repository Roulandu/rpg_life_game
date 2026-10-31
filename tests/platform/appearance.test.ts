import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  loadThemePreference,
  resolveSystemScheme,
  saveThemePreference,
  syncStatusBar,
  watchSystemScheme,
} from '../../src/platform/appearance'

const STORAGE_KEY = 'pitch-life:theme'
type MediaListener = (event: MediaQueryListEvent) => void

function stubMatchMedia(matches: boolean) {
  const listeners: MediaListener[] = []
  const removeEventListener = vi.fn()
  vi.stubGlobal('matchMedia', () => ({
    matches,
    addEventListener: (_type: string, listener: MediaListener) => listeners.push(listener),
    removeEventListener,
  }))
  return { listeners, removeEventListener }
}

beforeEach(() => {
  window.localStorage.clear()
})

afterEach(() => {
  window.localStorage.clear()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('平台主题偏好', () => {
  it('没有存储时默认跟随系统', () => {
    expect(loadThemePreference()).toBe('system')
  })

  it('保存后可读回显式偏好', () => {
    saveThemePreference('light')

    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('light')
    expect(loadThemePreference()).toBe('light')
  })

  it('非法存储值回退跟随系统', () => {
    window.localStorage.setItem(STORAGE_KEY, 'neon')

    expect(loadThemePreference()).toBe('system')
  })

  it('存储不可用时读取降级且保存不抛错', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied')
    })
    expect(loadThemePreference()).toBe('system')

    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('denied')
    })
    expect(() => saveThemePreference('dark')).not.toThrow()
  })

  it('系统媒体查询缺失时回退深色', () => {
    vi.stubGlobal('matchMedia', undefined)

    expect(resolveSystemScheme()).toBe('dark')
  })

  it('系统媒体查询结果映射为深色或浅色', () => {
    stubMatchMedia(true)
    expect(resolveSystemScheme()).toBe('dark')

    stubMatchMedia(false)
    expect(resolveSystemScheme()).toBe('light')
  })

  it('订阅系统变化并在取消后移除监听', () => {
    const { listeners, removeEventListener } = stubMatchMedia(false)
    const onChange = vi.fn()

    const unsubscribe = watchSystemScheme(onChange)
    listeners[0]?.({ matches: true } as MediaQueryListEvent)

    expect(onChange).toHaveBeenCalledWith('dark')

    unsubscribe()
    expect(removeEventListener).toHaveBeenCalled()
  })

  it('Web 端同步状态栏直接完成', async () => {
    await expect(syncStatusBar('light')).resolves.toBeUndefined()
  })
})
