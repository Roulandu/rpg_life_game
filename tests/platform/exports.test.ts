import { describe, expect, expectTypeOf, it } from 'vitest'
import {
  configureSecretStore,
  downloadTextFile,
  isNativePlatform,
  registerBackButton,
  saveApiKey,
  selectHttp,
} from '../../src/platform'
import type { HttpPort, SecretStore } from '../../src/platform'

describe('platform public entry', () => {
  it('exports platform ports', () => {
    expect(typeof isNativePlatform()).toBe('boolean')
    expect(typeof registerBackButton).toBe('function')
    expect(typeof downloadTextFile).toBe('function')
    expect(typeof saveApiKey).toBe('function')
    expect(typeof configureSecretStore).toBe('function')
    expect(typeof selectHttp('auto')).toBeTruthy()
  })

  it('exposes port types', () => {
    expectTypeOf<HttpPort>().not.toBeAny()
    expectTypeOf<SecretStore>().not.toBeAny()
  })
})
