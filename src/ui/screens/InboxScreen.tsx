import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useGameStore } from '../../store'
import { selectActionLabel } from '../../store'
import { formatSeasonLabel } from '../../lib'
import { PageHeader } from '../components/PageHeader'
import { ChatTab } from './inbox/ChatTab'
import { EventsTab } from './inbox/EventsTab'
import { InboxTabs } from './inbox/InboxTabs'
import { parseInboxTab, type InboxTab } from './inbox/inboxTab'
import { NewsTab } from './inbox/NewsTab'

export function InboxScreen() {
  const navigate = useNavigate()
  const world = useGameStore((state) => state.world)
  const resolveChoice = useGameStore((state) => state.resolveChoice)
  const sendChat = useGameStore((state) => state.sendChat)
  const aiKeyReady = useGameStore((state) => state.aiKeyReady)
  const aiBusy = useGameStore((state) => state.aiBusy)
  const aiError = useGameStore((state) => state.aiError)
  const clearAiError = useGameStore((state) => state.clearAiError)
  const [params] = useSearchParams()
  const [tab, setTab] = useState<InboxTab>(() => parseInboxTab(params.get('tab')))

  if (!world) return null
  const events = Object.values(world.events).sort((a, b) => b.week - a.week)
  const open = events.filter((event) => event.status === 'open')
  const history = events.filter((event) => event.status !== 'open').slice(0, 12)
  const actionUsed = world.aiAction?.season === world.season && world.aiAction.week === world.week
  const usedActionLabel = actionUsed
    ? (selectActionLabel(world.aiAction?.actionId) ?? '本周行动')
    : null
  const aiEnabled = world.settings.aiMode === 'llm'

  return (
    <div className="page-pad pb-6">
      <PageHeader
        eyebrow={formatSeasonLabel(world.season)}
        title="收件箱"
        subtitle="教练、队友、经纪人和媒体都在这里等你回应。"
        right={
          open.length > 0 ? <span className="chip border-accent/30 text-accent">{open.length} 待处理</span> : undefined
        }
      />

      <InboxTabs tab={tab} onChange={setTab} />

      {tab === 'events' ? (
        <EventsTab
          open={open}
          history={history}
          onChoose={(eventId, choiceId) => void resolveChoice(eventId, choiceId)}
        />
      ) : tab === 'chat' ? (
        <ChatTab
          aiEnabled={aiEnabled}
          canChat={aiEnabled && aiKeyReady}
          aiBusy={aiBusy}
          aiError={aiError}
          chat={world.aiChat ?? []}
          usedActionLabel={usedActionLabel}
          onClearError={clearAiError}
          onOpenSettings={() => navigate('/settings')}
          onSend={(text) => void sendChat(text)}
        />
      ) : (
        <NewsTab news={world.news.slice(0, 40)} />
      )}
    </div>
  )
}
