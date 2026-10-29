import { describe, expect, it } from 'vitest'
import { INBOX_CHAT_PATH, parseInboxTab } from '../../src/ui/screens/inbox/inboxTab'

describe('inbox tab routing', () => {
  it('points the continue shortcut at the chat tab', () => {
    expect(INBOX_CHAT_PATH).toBe('/inbox?tab=chat')
  })

  it('parses known tabs and falls back to events', () => {
    expect(parseInboxTab('chat')).toBe('chat')
    expect(parseInboxTab('news')).toBe('news')
    expect(parseInboxTab('events')).toBe('events')
    expect(parseInboxTab('unknown')).toBe('events')
    expect(parseInboxTab(null)).toBe('events')
  })
})
