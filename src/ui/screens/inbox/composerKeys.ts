export interface ComposerKeyEvent {
  key: string
  shiftKey: boolean
  isComposing: boolean
  keyCode?: number
}

export function shouldSendOnEnter(event: ComposerKeyEvent): boolean {
  if (event.key !== 'Enter' || event.shiftKey) return false
  if (event.isComposing) return false
  return event.keyCode !== 229
}
