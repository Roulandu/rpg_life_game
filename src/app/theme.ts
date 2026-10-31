import { loadThemePreference, resolveSystemScheme } from '../platform'
import type { ColorScheme, ThemePreference } from '../platform'

const THEME_COLORS: Record<ColorScheme, string> = {
  light: '#f2f7f0',
  dark: '#0a0d0b',
}

export function resolveTheme(preference: ThemePreference, system: ColorScheme): ColorScheme {
  return preference === 'system' ? system : preference
}

export function applyTheme(preference: ThemePreference, system: ColorScheme): void {
  const root = document.documentElement
  if (preference === 'system') delete root.dataset.theme
  else root.dataset.theme = preference

  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
  if (meta) meta.content = THEME_COLORS[resolveTheme(preference, system)]
}

export function applyBootTheme(): void {
  applyTheme(loadThemePreference(), resolveSystemScheme())
}
