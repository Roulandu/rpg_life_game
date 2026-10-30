import type { AiChatMessage, GameEvent, NewsItem } from '../../../domain'
import { ChatTab } from './ChatTab'
import { EventsTab } from './EventsTab'
import { NewsTab } from './NewsTab'
import type { InboxTab } from './inboxTab'

interface Props {
  tab: InboxTab
  open: GameEvent[]
  history: GameEvent[]
  onChoose: (eventId: string, choiceId: string) => void
  aiEnabled: boolean
  canChat: boolean
  aiBusy: boolean
  aiError: string | null
  chat: AiChatMessage[]
  usedActionLabel: string | null
  onClearError: () => void
  onOpenSettings: () => void
  onSend: (text: string) => void
  news: NewsItem[]
}

export function InboxTabBody(props: Props) {
  if (props.tab === 'events') {
    return <EventsTab open={props.open} history={props.history} onChoose={props.onChoose} />
  }

  if (props.tab === 'chat') {
    return (
      <ChatTab
        aiEnabled={props.aiEnabled}
        canChat={props.canChat}
        aiBusy={props.aiBusy}
        aiError={props.aiError}
        chat={props.chat}
        usedActionLabel={props.usedActionLabel}
        onClearError={props.onClearError}
        onOpenSettings={props.onOpenSettings}
        onSend={props.onSend}
      />
    )
  }

  return <NewsTab news={props.news} />
}
