import { useEffect, useRef } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { registerBackButton, syncStatusBar, watchSystemScheme } from '../platform'
import { useGameStore } from '../store'
import { Toast } from '../ui'
import { applyTheme, resolveTheme } from './theme'

function Splash() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 px-6">
      <div className="grid size-14 place-items-center rounded-2xl border border-accent/30 bg-accent/10">
        <span className="font-mono text-xl font-bold text-accent">PL</span>
      </div>
      <p className="text-xs tracking-[0.25em] text-muted">正在读取存档…</p>
    </div>
  )
}

function ScrollToTop() {
  const location = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [location.pathname])
  return null
}

export function App() {
  const init = useGameStore((state) => state.init)
  const hydrated = useGameStore((state) => state.hydrated)
  const saveNow = useGameStore((state) => state.saveNow)
  const themePreference = useGameStore((state) => state.themePreference)
  const systemScheme = useGameStore((state) => state.systemScheme)
  const setSystemScheme = useGameStore((state) => state.setSystemScheme)
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true
    void init()
  }, [init])

  useEffect(
    () =>
      registerBackButton(async () => {
        if (!useGameStore.getState().world) return true
        return saveNow()
      }),
    [saveNow],
  )

  useEffect(() => watchSystemScheme(setSystemScheme), [setSystemScheme])

  useEffect(() => {
    applyTheme(themePreference, systemScheme)
    void syncStatusBar(resolveTheme(themePreference, systemScheme))
  }, [themePreference, systemScheme])

  if (!hydrated) return <Splash />

  return (
    <>
      <ScrollToTop />
      <Outlet />
      <Toast />
    </>
  )
}
