import { describe, expect, expectTypeOf, it } from 'vitest'
import {
  configureSecretStore,
  downloadTextFile,
  isNativePlatform,
  loadThemePreference,
  registerBackButton,
  saveApiKey,
  selectHttp,
  watchSystemScheme,
} from '../../src/platform'
import type { ColorScheme, HttpPort, SecretStore, ThemePreference } from '../../src/platform'

describe('platform public entry', () => {
  it('exports platform ports', () => {
    expect(typeof isNativePlatform()).toBe('boolean')
    expect(typeof registerBackButton).toBe('function')
    expect(typeof downloadTextFile).toBe('function')
    expect(typeof saveApiKey).toBe('function')
    expect(typeof configureSecretStore).toBe('function')
    expect(typeof selectHttp('auto')).toBeTruthy()
    expect(typeof loadThemePreference()).toBe('string')
    expect(typeof watchSystemScheme).toBe('function')
  })

  it('exposes port types', () => {
    expectTypeOf<HttpPort>().not.toBeAny()
    expectTypeOf<SecretStore>().not.toBeAny()
    expectTypeOf<ThemePreference>().not.toBeAny()
    expectTypeOf<ColorScheme>().not.toBeAny()
  })
})
