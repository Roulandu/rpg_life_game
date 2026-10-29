import { describe, expect, it } from 'vitest'
import { shouldSendOnEnter } from '../../src/ui/screens/inbox/composerKeys'

describe('shouldSendOnEnter', () => {
  it('does not send while an input method is composing', () => {
    expect(shouldSendOnEnter({ key: 'Enter', shiftKey: false, isComposing: true })).toBe(false)
    expect(shouldSendOnEnter({ key: 'Enter', shiftKey: false, isComposing: false, keyCode: 229 })).toBe(false)
  })

  it('keeps shift+enter for new lines', () => {
    expect(shouldSendOnEnter({ key: 'Enter', shiftKey: true, isComposing: false })).toBe(false)
  })

  it('sends on a plain enter', () => {
    expect(shouldSendOnEnter({ key: 'Enter', shiftKey: false, isComposing: false })).toBe(true)
    expect(shouldSendOnEnter({ key: 'a', shiftKey: false, isComposing: false })).toBe(false)
  })
})
