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

describe('registerBackButton', () => {
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
