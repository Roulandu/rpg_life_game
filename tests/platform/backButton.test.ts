import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { exitAppMock, addListenerMock } = vi.hoisted(() => ({
  exitAppMock: vi.fn(),
  addListenerMock: vi.fn(),
}))

vi.mock('@capacitor/app', () => ({
  App: { exitApp: exitAppMock, addListener: addListenerMock },
}))

vi.mock('../../src/platform/native', () => ({ isNativePlatform: () => true }))

type BackHandler = () => Promise<boolean> | boolean

let handler: BackHandler | null = null

async function flush(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0))
}

beforeEach(() => {
  handler = null
  exitAppMock.mockReset()
  addListenerMock.mockReset()
  addListenerMock.mockImplementation((_event: string, callback: BackHandler) => {
    handler = callback
    return Promise.resolve({ remove: () => {} })
  })
  window.location.hash = '/game'
})

afterEach(() => {
  window.location.hash = ''
})

describe('registerBackButton 的退出判定', () => {
  it('exits the app only after the save succeeded', async () => {
    const { registerBackButton } = await import('../../src/platform/backButton')
    registerBackButton(async () => true)

    await handler!()
    await flush()

    expect(exitAppMock).toHaveBeenCalledTimes(1)
  })

  it('stays in the app when saving failed', async () => {
    const { registerBackButton } = await import('../../src/platform/backButton')
    registerBackButton(async () => false)

    await handler!()
    await flush()

    expect(exitAppMock).not.toHaveBeenCalled()
  })
})

describe('registerBackButton 的弹窗拦截器', () => {
  it('回归: 弹窗开着时按系统返回键直接退出应用', async () => {
    const { registerBackButton } = await import('../../src/platform/backButton')
    const intercept = vi.fn(() => true)
    registerBackButton(async () => true, intercept)

    await handler!()
    await flush()

    expect(intercept).toHaveBeenCalledTimes(1)
    expect(exitAppMock).not.toHaveBeenCalled()
  })

  it('弹窗栈是空的就不拦，根路由仍按保存结论决定是否退出', async () => {
    const { registerBackButton } = await import('../../src/platform/backButton')
    const intercept = vi.fn(() => false)
    registerBackButton(async () => true, intercept)

    await handler!()
    await flush()

    expect(intercept).toHaveBeenCalledTimes(1)
    expect(exitAppMock).toHaveBeenCalledTimes(1)
  })
})

describe('registerBackButton 的翻页行为', () => {
  it('非根路由上有弹窗时先关弹窗，不吃掉这一次返回', async () => {
    window.location.hash = '/settings'
    const backSpy = vi.spyOn(window.history, 'back').mockImplementation(() => {})
    const { registerBackButton } = await import('../../src/platform/backButton')
    const intercept = vi.fn(() => true)
    registerBackButton(async () => true, intercept)

    await handler!()
    await flush()

    expect(intercept).toHaveBeenCalledTimes(1)
    expect(backSpy).not.toHaveBeenCalled()
    backSpy.mockRestore()
  })

  it('没有拦截器时非根路由仍走 history.back，旧调用方行为不变', async () => {
    window.location.hash = '/settings'
    const backSpy = vi.spyOn(window.history, 'back').mockImplementation(() => {})
    const { registerBackButton } = await import('../../src/platform/backButton')
    registerBackButton(async () => true)

    await handler!()
    await flush()

    expect(backSpy).toHaveBeenCalledTimes(1)
    expect(exitAppMock).not.toHaveBeenCalled()
    backSpy.mockRestore()
  })
})
