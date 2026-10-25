interface CapacitorWindow extends Window {
  Capacitor?: {
    isNativePlatform?: () => boolean
  }
}

export function isNativePlatform(): boolean {
  if (typeof window === 'undefined') return false
  return Boolean((window as CapacitorWindow).Capacitor?.isNativePlatform?.())
}
