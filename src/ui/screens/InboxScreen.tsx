import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import clsx from 'clsx'
import { useGameStore } from '../../store'
import { selectActionLabel } from '../../store'
import { InboxHeader } from './inbox/InboxHeader'
import { InboxTabBody } from './inbox/InboxTabBody'
import { parseInboxTab, type InboxTab } from './inbox/inboxTab'

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
  const canChat = aiEnabled && aiKeyReady
  const lockChatHeight = tab === 'chat' && canChat

  return (
    <div
      className={clsx(
        'page-pad pb-6 sm:mx-auto sm:max-w-[760px]',
        lockChatHeight &&
          'md:flex md:h-[calc(100svh_-_var(--bottom-nav-h))] md:flex-col md:overflow-hidden md:mb-[calc(var(--bottom-nav-h)_-_6rem)] lg:h-svh lg:mb-0',
      )}
    >
      <InboxHeader season={world.season} openCount={open.length} tab={tab} onChange={setTab} />
      <InboxTabBody
        tab={tab}
        open={open}
        history={history}
        onChoose={(eventId, choiceId) => void resolveChoice(eventId, choiceId)}
        aiEnabled={aiEnabled}
        canChat={canChat}
        aiBusy={aiBusy}
        aiError={aiError}
        chat={world.aiChat ?? []}
        usedActionLabel={usedActionLabel}
        onClearError={clearAiError}
        onOpenSettings={() => navigate('/settings')}
        onSend={(text) => void sendChat(text)}
        news={world.news.slice(0, 40)}
      />
    </div>
  )
}
