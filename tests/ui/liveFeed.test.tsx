import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import type { MatchEventLine } from '../../src/domain'
import { LiveFeed } from '../../src/ui/screens/matchday/LiveFeed'

const events: MatchEventLine[] = [
  { minute: 12, type: 'shot', text: '主队中场远射被扑出。', side: 'home' },
  { minute: 13, type: 'corner', text: '客队获得角球。', side: 'away' },
  { minute: 14, type: 'goal', text: '主队前锋推射破门。', side: 'home', isUser: true },
]

afterEach(() => cleanup())

describe('live feed', () => {
  it('同时渲染双方事件并标记主客', () => {
    render(<LiveFeed events={events} />)

    expect(screen.getByTestId('live-feed')).toBeInTheDocument()
    expect(screen.getByText('主队中场远射被扑出。')).toBeInTheDocument()
    expect(screen.getByText('客队获得角球。')).toBeInTheDocument()
    expect(screen.getByText('主队前锋推射破门。')).toBeInTheDocument()
    expect(screen.getAllByText('主')).toHaveLength(2)
    expect(screen.getAllByText('客')).toHaveLength(1)
  })
})
