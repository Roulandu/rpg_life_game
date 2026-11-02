import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, screen, within } from '@testing-library/react'
import type { Investment, WorldState } from '../../src/domain'
import { useGameStore } from '../../src/store/gameStore'
import { FinanceScreen } from '../../src/ui/screens/FinanceScreen'
import { generateWorld } from '../../src/world/generator'
import { TEST_NOW, testOptions } from '../fixtures/career'
import { renderWithRouter } from './renderScreen'
import { resetUiStore } from './resetStore'

afterEach(() => {
  cleanup()
  resetUiStore()
})

function holding(overrides: Partial<Investment>): Investment {
  return {
    id: 'inv:test',
    kind: 'deposit',
    name: '银行活期存款',
    principal: 1000000,
    rateBps: 120,
    openedDay: 1,
    termDays: 0,
    earlyExitFee: 0,
    risk: 0,
    ...overrides,
  }
}

/** 造一份「投过钱」的世界：余额、持仓与本周累计都是写死的整数，断言只认这些数。 */
function loadWorld(investments: Investment[]): WorldState {
  const world = structuredClone(generateWorld(testOptions({ seed: 424242 }), TEST_NOW))
  world.week = 1
  world.day = 3
  world.finance.balance = 1000000
  world.finance.investments = investments
  world.finance.pendingIncome = 297000
  world.finance.pendingExpenses = 118000
  world.finance.ledger = [
    { season: world.season, week: world.week, type: 'wage', amount: 132000, label: '周薪与开销' },
    { season: world.season, week: world.week, type: 'investment', amount: -1000000, label: '开仓 城市公寓' },
  ]
  useGameStore.setState({ world, hydrated: true })
  return world
}

function renderFinance() {
  return renderWithRouter(<FinanceScreen />, { initialEntries: ['/finance'] })
}

describe('财务页的余额与本周累计', () => {
  it('页头报出可用余额，累计区把本周待入账的收支分开列', () => {
    loadWorld([])
    renderFinance()

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('资金运用')
    expect(screen.getByText('£10,000')).toBeInTheDocument()
    const region = screen.getByRole('region', { name: '本周累计' })
    expect(within(region).getByText('£2,970')).toBeInTheDocument()
    expect(within(region).getByText('£1,180')).toBeInTheDocument()
  })

  it('账本区按时间倒序列出流水标签与金额', () => {
    loadWorld([])
    renderFinance()

    const region = screen.getByRole('region', { name: '最近账目' })
    const rows = within(region).getAllByRole('listitem')
    expect(rows).toHaveLength(2)
    expect(rows[0]).toHaveTextContent('周薪与开销')
    expect(rows[0]).toHaveTextContent('£1,320')
    expect(rows[1]).toHaveTextContent('开仓 城市公寓')
    expect(rows[1]).toHaveTextContent('-£10,000')
  })
})

describe('财务页的持仓区', () => {
  it('一笔没投时说明钱还在余额里，不假装有能力生息', () => {
    loadWorld([])
    renderFinance()

    expect(screen.getByText('还没有投出去的钱')).toBeInTheDocument()
    expect(screen.queryByRole('listitem', { name: /持仓/ })).toBeNull()
  })

  it('持仓行报出现值、与本金的差和锁定期剩余天数', () => {
    loadWorld([
      holding({
        id: 'inv:property',
        kind: 'property',
        name: '城市公寓',
        principal: 3000000,
        value: 3900000,
        risk: 0.035,
        termDays: 252,
        earlyExitFee: 0.05,
        openedDay: 3,
      }),
    ])
    renderFinance()

    const row = screen.getByRole('listitem', { name: /城市公寓/ })
    expect(within(row).getByText('£39,000')).toBeInTheDocument()
    expect(within(row).getByText('+£9,000')).toBeInTheDocument()
    expect(within(row).getByText('锁定期还剩 252 天')).toBeInTheDocument()
  })

  it('不波动的品种不报现值差，只报年化利率', () => {
    loadWorld([holding({ id: 'inv:deposit', openedDay: 3 })])
    renderFinance()

    const row = screen.getByRole('listitem', { name: /银行活期存款/ })
    expect(within(row).getByText('年化 1.2%')).toBeInTheDocument()
    expect(within(row).queryByText(/^[+-]£/)).toBeNull()
  })

  it('持仓合计与未实现盈亏走同一份口径，多笔一起列', () => {
    loadWorld([
      holding({ id: 'inv:a' }),
      holding({ id: 'inv:b', kind: 'property', name: '城市公寓', principal: 3000000, value: 2700000, risk: 0.035 }),
    ])
    renderFinance()

    const region = screen.getByRole('region', { name: '持仓' })
    expect(within(region).getAllByRole('listitem')).toHaveLength(2)
    // 现值合计 1,000,000 + 2,700,000 = £37,000，未实现盈亏 -£3,000。
    const totals = within(screen.getByRole('group', { name: '现值合计' }))
    expect(totals.getByText('£37,000')).toBeInTheDocument()
    expect(totals.getByText('-£3,000')).toBeInTheDocument()
  })
})
