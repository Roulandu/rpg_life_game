import { App } from '@capacitor/app'
import { isNativePlatform } from './native'

export function registerBackButton(onBeforeExit: () => Promise<void> | void): () => void {
  if (!isNativePlatform()) return () => {}

  let disposed = false
  let remove: () => void = () => {}

  void App.addListener('backButton', () => {
    const route = window.location.hash.replace(/^#/, '')
    if (route === '' || route === '/' || route === '/game') {
      void Promise.resolve(onBeforeExit()).finally(() => {
        void App.exitApp()
      })
      return
    }
    window.history.back()
  }).then((listener) => {
    if (disposed) {
      void listener.remove()
    } else {
      remove = () => void listener.remove()
    }
  })

  return () => {
    disposed = true
    remove()
  }
}
