import { Sparkles } from 'lucide-react'
import clsx from 'clsx'
import type { AiChatMessage } from '../../../domain'
import { EmptyState } from '../../components/Card'

export function ChatMessages({ chat }: { chat: AiChatMessage[] }) {
  if (chat.length === 0) {
    return (
      <EmptyState
        title="还没有对话"
        body="这里的对话会保存在当前存档里。你可以问教练的想法、解释最近的状态，或安排一次加练。"
      />
    )
  }
  return (
    <div className="space-y-2">
      {chat.map((item) => (
        <div key={item.id} className={clsx('flex', item.role === 'user' ? 'justify-end' : 'justify-start')}>
          <div
            className={clsx(
              'max-w-[88%] rounded-2xl border px-3 py-2',
              item.role === 'user' ? 'border-teal/25 bg-teal/10' : 'border-line bg-card',
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
                <span className="chip border-teal/30 px-1.5 py-0 text-[9px] text-teal">{item.actionLabel}</span>
              ) : null}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
