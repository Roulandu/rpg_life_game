import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import type { GameEvent } from '../../src/domain'
import { OpenEventCard } from '../../src/ui/screens/inbox/OpenEventCard'

function makeEvent(patch: Partial<GameEvent>): GameEvent {
  return {
    id: 'event:2026:3:6:injury_concern',
    templateId: 'injury_concern',
    title: '队医的建议',
    body: '队医建议你耐心康复，但下一场比赛很重要。',
    sender: '队医',
    season: 2026,
    week: 3,
    day: 6,
    createdAtWeek: 3,
    createdAtDay: 20,
    expiresWeek: 4,
    expiresDay: 23,
    blocking: true,
    status: 'open',
    choices: [{ id: 'listen', label: '听队医的', effects: [{ op: 'morale', delta: 2 }] }],
    source: 'template',
    ...patch,
  }
}

describe('待处理事件卡片', () => {
  afterEach(() => {
    cleanup()
  })

  it('给出发件人与发生日，并按天显示剩余时间', () => {
    render(<OpenEventCard event={makeEvent({})} today={20} onChoose={vi.fn()} />)

    expect(screen.getByText('队医的建议')).toBeInTheDocument()
    expect(screen.getByText(/^队医 · 第 3 周 · 周六/)).toBeInTheDocument()
    expect(screen.getByText('剩 3 天')).toBeInTheDocument()
  })

  it('到期的最后一天不再写「剩 0 天」', () => {
    render(<OpenEventCard event={makeEvent({ expiresDay: 20 })} today={20} onChoose={vi.fn()} />)

    expect(screen.getByText('今天过期')).toBeInTheDocument()
  })

  it('选项按钮保持至少 44px 的触控高度', () => {
    render(<OpenEventCard event={makeEvent({})} today={20} onChoose={vi.fn()} />)

    expect(screen.getByRole('button', { name: /听队医的/ }).className).toContain('min-h-11')
  })
})
