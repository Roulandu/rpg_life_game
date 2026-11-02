import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, screen } from '@testing-library/react'
import type { SeasonTransition } from '../../src/engine/season'
import { useGameStore } from '../../src/store'
import { SeasonSummaryModal } from '../../src/ui/components/SeasonSummaryModal'
import { renderWithRouter } from './renderScreen'

afterEach(() => cleanup())

/** 结算横幅只读 store，这里给一份「保级成功、踢了 30 场」的中游赛季。 */
function transition(overrides: Partial<SeasonTransition> = {}): SeasonTransition {
  return {
    season: 2026,
    newSeason: 2027,
    summary: {
      season: 2026,
      clubId: 'club:north',
      clubName: '北看台联',
      tier: 3,
      leaguePosition: 7,
      appearances: 30,
      goals: 12,
      assists: 5,
      averageRating: 7.1,
      awards: [],
    },
    champion: false,
    promoted: false,
    relegated: false,
    retired: false,
    retirementReason: null,
    awards: [],
    ...overrides,
  }
}

describe('赛季结算横幅', () => {
  beforeEach(() => useGameStore.setState({ seasonTransition: null }))

  it('报名字后就绪：横幅按 store 里的结算数据出现', () => {
    useGameStore.setState({ seasonTransition: transition() })

    renderWithRouter(<SeasonSummaryModal />)

    expect(screen.getByRole('dialog', { name: '2026/27 赛季结束' })).toBeInTheDocument()
    expect(screen.getByText('北看台联 · 联赛第 7 名')).toBeInTheDocument()
  })

  it('点「开始新赛季」把结算数据清空，横幅不再回来', () => {
    useGameStore.setState({ seasonTransition: transition() })
    renderWithRouter(<SeasonSummaryModal />)

    fireEvent.click(screen.getByRole('button', { name: '开始 2027/28 赛季' }))

    expect(useGameStore.getState().seasonTransition).toBeNull()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('退役那年的横幅只留「查看生涯时间线」，点它同样清掉结算数据', () => {
    useGameStore.setState({ seasonTransition: transition({ retired: true }) })
    renderWithRouter(<SeasonSummaryModal />)

    expect(screen.queryByRole('button', { name: /开始 \d/ })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '查看生涯时间线' }))

    expect(useGameStore.getState().seasonTransition).toBeNull()
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
