import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import type { MatchEventLine } from '../../src/domain'
import { MatchTimeline } from '../../src/ui/screens/matchday/MatchTimeline'
import { EVENT_TONE } from '../../src/ui/screens/matchday/matchdayUtils'

const events: MatchEventLine[] = [
  { minute: 8, type: 'shot', text: '主队远射偏出。', side: 'home' },
  { minute: 9, type: 'corner', text: '客队角球被解围。', side: 'away' },
  { minute: 10, type: 'info', text: '比赛继续。' },
]

afterEach(() => cleanup())

describe('match timeline sides', () => {
  it('显示主客徽标并使用对应的事件色调', () => {
    render(<MatchTimeline events={events} />)

    expect(screen.getByText('主')).toBeInTheDocument()
    expect(screen.getByText('客')).toBeInTheDocument()
    expect(screen.queryAllByText('主')).toHaveLength(1)

    const shot = screen.getByText('主队远射偏出。').closest('div')!
    expect(shot.className).toContain(EVENT_TONE.shot!.split(' ')[0])
    const corner = screen.getByText('客队角球被解围。').closest('div')!
    expect(corner.className).toContain(EVENT_TONE.corner!.split(' ')[0])
  })
})
