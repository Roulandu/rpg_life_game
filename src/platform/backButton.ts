import { App } from '@capacitor/app'
import { isNativePlatform } from './native'

/**
 * 注册系统返回键。
 * `onIntercept` 在路由判断之前问一次：弹窗还开着就先关弹窗，这次返回不该变成退出或翻页。
 * 它返回 true 表示「这次返回我处理了」；不传或返回 false 时行为与原来完全一致。
 */
export function registerBackButton(
  onBeforeExit: () => Promise<boolean> | boolean,
  onIntercept?: () => boolean,
): () => void {
  if (!isNativePlatform()) return () => {}

  let disposed = false
  let remove: () => void = () => {}

  void App.addListener('backButton', () => {
    if (onIntercept?.()) return
    const route = window.location.hash.replace(/^#/, '')
    if (route === '' || route === '/' || route === '/game') {
      void Promise.resolve(onBeforeExit())
        .then((safeToExit) => {
          if (safeToExit) void App.exitApp()
        })
        .catch(() => {})
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
