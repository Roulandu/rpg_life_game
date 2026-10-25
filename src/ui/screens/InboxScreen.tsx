import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  ChevronRight,
  Inbox,
  LoaderCircle,
  MessageCircle,
  Newspaper,
  Send,
  Sparkles,
} from 'lucide-react'
import { useGameStore } from '../../store/gameStore'
import { formatSeasonLabel } from '../../lib/format'
import { actionLabelFor } from '../../llm/actions'
import { Card, EmptyState, SectionTitle } from '../components/Card'
import { PageHeader } from '../components/PageHeader'
import { effectList } from '../labels'
import clsx from 'clsx'

const NEWS_KIND_LABEL: Record<string, string> = {
  match: '比赛',
  transfer: '转会',
  media: '媒体',
  club: '俱乐部',
  award: '荣誉',
  system: '系统',
}

const MAX_MESSAGE = 400

export function InboxScreen() {
  const navigate = useNavigate()
  const world = useGameStore((state) => state.world)
  const resolveChoice = useGameStore((state) => state.resolveChoice)
  const sendChat = useGameStore((state) => state.sendChat)
  const aiMode = world?.settings.aiMode
  const aiKeyReady = useGameStore((state) => state.aiKeyReady)
  const aiBusy = useGameStore((state) => state.aiBusy)
  const aiError = useGameStore((state) => state.aiError)
  const clearAiError = useGameStore((state) => state.clearAiError)
  const [tab, setTab] = useState<'events' | 'chat' | 'news'>('events')
  const [message, setMessage] = useState('')
  if (!world) return null

  const events = Object.values(world.events).sort((a, b) => b.week - a.week)
  const open = events.filter((event) => event.status === 'open')
  const history = events.filter((event) => event.status !== 'open').slice(0, 12)
  const news = world.news.slice(0, 40)
  const chat = world.aiChat ?? []
  const actionUsed =
    world.aiAction?.season === world.season && world.aiAction.week === world.week
  const canChat = aiMode === 'llm' && aiKeyReady

  function handleSend() {
    const text = message.trim()
    if (!text || !canChat || aiBusy) return
    setMessage('')
    void sendChat(text)
  }

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

      <div className="mb-4 grid grid-cols-3 gap-1 rounded-xl border border-line bg-card-2 p-1">
        {(
          [
            ['events', '事件'],
            ['chat', '对话'],
            ['news', '新闻'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={clsx(
              'min-h-9 rounded-lg text-xs font-medium transition',
              tab === key ? 'bg-accent text-accent-ink' : 'text-muted hover:text-text',
            )}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'events' ? (
        <>
          {open.length === 0 ? (
            <EmptyState title="没有待处理的事件" body="推进一周后，新的消息会出现在这里。事件会保留约两周。" />
          ) : (
            <div className="space-y-3">
              {open.map((event) => (
                <Card key={event.id} className="border-accent/25">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Inbox size={15} className="text-accent" />
                      <h2 className="text-sm font-semibold text-text">{event.title}</h2>
                    </div>
                    <span className="chip shrink-0">第 {event.week} 周</span>
                  </div>
                  <p className="text-[12px] leading-relaxed text-muted">{event.body}</p>
                  <div className="mt-3 space-y-1.5">
                    {event.choices.map((choice) => (
                      <button
                        key={choice.id}
                        type="button"
                        className="w-full rounded-xl border border-line bg-card-2 px-3 py-2.5 text-left transition hover:border-accent/50"
                        onClick={() => void resolveChoice(event.id, choice.id)}
                      >
                        <span className="flex items-center justify-between gap-2">
                          <span className="text-xs font-medium text-text">{choice.label}</span>
                          <ChevronRight size={14} className="shrink-0 text-dim" />
                        </span>
                        {choice.description ? (
                          <span className="mt-0.5 block text-[10px] leading-relaxed text-muted">{choice.description}</span>
                        ) : null}
                        {choice.effects.length > 0 ? (
                          <span className="mt-1 block text-[10px] text-teal">{effectList(choice.effects)}</span>
                        ) : null}
                      </button>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          )}

          {history.length > 0 ? (
            <section className="mt-5">
              <SectionTitle>已处理</SectionTitle>
              <div className="space-y-1.5">
                {history.map((event) => (
                  <Card key={event.id} className="p-3 opacity-80">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-xs font-medium text-text">{event.title}</p>
                      <span className="chip shrink-0">{event.status === 'expired' ? '已过期' : '已处理'}</span>
                    </div>
                    <p className="mt-1 text-[10px] leading-relaxed text-muted">
                      {event.resultText ?? '这件事已经翻篇了。'}
                    </p>
                  </Card>
                ))}
              </div>
            </section>
          ) : null}
        </>
      ) : tab === 'chat' ? (
        <div className="space-y-3">
          <Card className="p-3">
            <div className="flex items-start gap-2">
              <MessageCircle size={14} className="mt-0.5 shrink-0 text-teal" />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] leading-relaxed text-muted">
                  用自然语言告诉 GM 你想做什么，比如“去找教练谈谈我的位置”。对话可以影响关系与状态，但不会改变比分、合同或赛程。
                </p>
                <p className="mt-1 text-[10px] leading-relaxed text-dim">
                  每周最多执行 1 个带数值效果的行动；本周
                  {actionUsed ? `已使用「${actionLabelFor(world.aiAction?.actionId) ?? '本周行动'}」。` : '尚未使用。'}
                </p>
              </div>
            </div>
          </Card>

          {!canChat ? (
            <Card className="p-4 text-center">
              <p className="text-xs text-muted">
                {aiMode !== 'llm' ? 'AI 对话未启用。' : '还没有可用的 API Key。'}
              </p>
              <p className="mt-1 text-[10px] leading-relaxed text-dim">
                在设置里打开 AI 叙事并保存 Key 后，就能用自然语言和 GM 交流。
              </p>
              <button type="button" className="btn-secondary mt-3 w-full" onClick={() => navigate('/settings')}>
                去设置
              </button>
            </Card>
          ) : (
            <>
              {chat.length === 0 ? (
                <EmptyState
                  title="还没有对话"
                  body="这里的对话会保存在当前存档里。你可以问教练的想法、解释最近的状态，或安排一次加练。"
                />
              ) : (
                <div className="space-y-2">
                  {chat.map((item) => (
                    <div
                      key={item.id}
                      className={clsx('flex', item.role === 'user' ? 'justify-end' : 'justify-start')}
                    >
                      <div
                        className={clsx(
                          'max-w-[88%] rounded-2xl border px-3 py-2',
                          item.role === 'user'
                            ? 'border-teal/25 bg-teal/10'
                            : 'border-line bg-card',
                        )}
                      >
                        {item.role === 'assistant' ? (
                          <p className="mb-1 flex items-center gap-1 text-[9px] uppercase tracking-wider text-teal">
                            <Sparkles size={10} /> GM
                          </p>
                        ) : null}
                        <p className="whitespace-pre-line text-[12px] leading-relaxed text-text">{item.text}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[9px] text-dim">
                          <span>
                            {item.role === 'user' ? '你' : 'GM'} · 第 {item.week} 周
                          </span>
                          {item.actionLabel ? (
                            <span className="chip border-teal/30 px-1.5 py-0 text-[9px] text-teal">
                              {item.actionLabel}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {aiBusy ? (
                <Card className="flex items-center gap-2 p-3 text-[11px] text-muted">
                  <LoaderCircle size={14} className="animate-spin text-teal" />
                  GM 正在回应…
                </Card>
              ) : null}

              {aiError ? (
                <Card className="border-danger/25 p-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle size={14} className="mt-0.5 shrink-0 text-danger" />
                    <p className="flex-1 text-[11px] leading-relaxed text-danger">{aiError}</p>
                    <button type="button" className="shrink-0 text-[10px] text-dim" onClick={clearAiError}>
                      知道了
                    </button>
                  </div>
                </Card>
              ) : null}

              <Card className="p-3">
                <label className="label" htmlFor="gm-message">
                  对 GM 说
                </label>
                <textarea
                  id="gm-message"
                  className="input min-h-20 resize-none text-sm"
                  placeholder="例如：我想加练射门，但别把体能练垮。"
                  maxLength={MAX_MESSAGE}
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault()
                      handleSend()
                    }
                  }}
                />
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="text-[10px] text-dim">
                    {message.length}/{MAX_MESSAGE} · Enter 发送
                  </span>
                  <button
                    type="button"
                    className="btn-primary px-4 text-xs"
                    disabled={!message.trim() || aiBusy}
                    onClick={handleSend}
                  >
                    {aiBusy ? <LoaderCircle size={14} className="animate-spin" /> : <Send size={14} />}
                    发送
                  </button>
                </div>
              </Card>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-1.5">
          {news.length === 0 ? (
            <EmptyState title="还没有新闻" body="比赛、转会与荣誉都会出现在这里。" />
          ) : (
            news.map((item) => (
              <Card key={item.id} className="flex items-start gap-2.5 p-3">
                <Newspaper size={14} className="mt-0.5 shrink-0 text-dim" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-xs font-medium text-text">{item.title}</p>
                    <span className="chip shrink-0">{NEWS_KIND_LABEL[item.kind] ?? item.kind}</span>
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed text-muted">{item.body}</p>
                  <p className="mt-1 text-[9px] text-dim">
                    {formatSeasonLabel(item.season)} · 第 {item.week} 周
                  </p>
                </div>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  )
}
