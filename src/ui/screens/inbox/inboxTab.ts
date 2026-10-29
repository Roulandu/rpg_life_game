export type InboxTab = 'events' | 'chat' | 'news'

export const INBOX_CHAT_PATH = '/inbox?tab=chat'

const TABS: readonly InboxTab[] = ['events', 'chat', 'news']

export function parseInboxTab(value: string | null): InboxTab {
  return TABS.find((tab) => tab === value) ?? 'events'
}
