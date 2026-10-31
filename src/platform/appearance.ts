import { isNativePlatform } from './native'

export type ThemePreference = 'system' | 'light' | 'dark'
export type ColorScheme = 'light' | 'dark'

const STORAGE_KEY = 'pitch-life:theme'
const DARK_QUERY = '(prefers-color-scheme: dark)'
const STATUS_BAR_COLORS: Record<ColorScheme, string> = {
  light: '#f2f7f0',
  dark: '#0a0d0b',
}

function storage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}

export function loadThemePreference(): ThemePreference {
  try {
    const value = storage()?.getItem(STORAGE_KEY)
    if (value === 'system' || value === 'light' || value === 'dark') return value
  } catch {
    // Storage can be blocked; fall through to the system default.
  }
  return 'system'
}

export function saveThemePreference(preference: ThemePreference): void {
  try {
    storage()?.setItem(STORAGE_KEY, preference)
  } catch {
    // Best-effort only: the in-memory preference still applies this session.
  }
}

function darkQuery(): MediaQueryList | null {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return null
  return window.matchMedia(DARK_QUERY)
}

export function resolveSystemScheme(): ColorScheme {
  const query = darkQuery()
  if (!query) return 'dark'
  return query.matches ? 'dark' : 'light'
}

export function watchSystemScheme(onChange: (scheme: ColorScheme) => void): () => void {
  const query = darkQuery()
  if (!query) return () => {}
  const handler = (event: MediaQueryListEvent) => onChange(event.matches ? 'dark' : 'light')
  query.addEventListener('change', handler)
  return () => query.removeEventListener('change', handler)
}

export async function syncStatusBar(scheme: ColorScheme): Promise<void> {
  if (!isNativePlatform()) return
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar')
    await StatusBar.setStyle({ style: scheme === 'light' ? Style.Light : Style.Dark })
    await StatusBar.setBackgroundColor({ color: STATUS_BAR_COLORS[scheme] })
  } catch {
    // Native chrome is best-effort; gameplay must not depend on it.
  }
}
