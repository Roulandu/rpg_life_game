import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, screen, within } from '@testing-library/react'
import type { Investment } from '../../src/domain'
import type { InvestResult } from '../../src/engine'
import { useGameStore } from '../../src/store/gameStore'
import { FinanceScreen } from '../../src/ui/screens/FinanceScreen'
import { MorePrimaryColumn } from '../../src/ui/screens/more/MorePrimaryColumn'
import { generateWorld } from '../../src/world/generator'
import { TEST_NOW, testOptions } from '../fixtures/career'
import { renderWithRouter } from './renderScreen'
import { resetUiStore } from './resetStore'

afterEach(() => {
  cleanup()
  resetUiStore()
})

function holding(overrides: Partial<Investment> = {}): Investment {
  return {
    id: 'inv:property',
    kind: 'property',
    name: '城市公寓',
    principal: 3000000,
    rateBps: 190,
    openedDay: 3,
    termDays: 252,
    earlyExitFee: 0.05,
    risk: 0.035,
    value: 3900000,
    ...overrides,
  }
}

/** 动作走 spy：界面只负责把「点的是哪一档、多少钱」送到 store，结算与落盘另有测试。 */
function loadWorld(options: { balance?: number; investments?: Investment[] } = {}) {
  const world = structuredClone(generateWorld(testOptions({ seed: 424242 }), TEST_NOW))
  world.week = 1
  world.day = 3
  world.finance.balance = options.balance ?? 10000000
  world.finance.investments = options.investments ?? []
  useGameStore.setState({ world, hydrated: true })
  return world
}

function ok(result: Partial<InvestResult> = {}): InvestResult {
  return { ok: true, reason: null, investment: null, proceeds: 0, ...result }
}

function openSheet() {
  fireEvent.click(screen.getByRole('button', { name: /把钱投出去/ }))
  return screen.getByRole('dialog', { name: '资金去处' })
}

describe('财务页的开仓抽屉', () => {
  it('四档条款都摆在抽屉里，选中一档后按份数下单', async () => {
    const investMoney = vi.fn(async () => ok())
    useGameStore.setState({ investMoney })
    loadWorld()
    renderWithRouter(<FinanceScreen />, { initialEntries: ['/finance'] })

    const sheet = openSheet()
    for (const label of ['银行活期存款', '俱乐部债券', '球迷文创小店', '城市公寓']) {
      expect(within(sheet).getByRole('button', { name: new RegExp(label) })).toBeInTheDocument()
    }

    fireEvent.click(within(sheet).getByRole('button', { name: /银行活期存款/ }))
    fireEvent.click(within(sheet).getByRole('button', { name: '投入 £1,000' }))
    fireEvent.click(within(sheet).getByRole('button', { name: /确认开仓/ }))
    await vi.waitFor(() => expect(investMoney).toHaveBeenCalledWith('deposit', 100000))
  })

  it('余额只够最便宜一档时，贵的一档直接说明还差多少并且点不动', () => {
    loadWorld({ balance: 1000000 })
    renderWithRouter(<FinanceScreen />, { initialEntries: ['/finance'] })

    const sheet = openSheet()
    const apartment = within(sheet).getByRole('button', { name: /城市公寓/ })
    expect(apartment).toBeDisabled()
    expect(within(sheet).getByText(/还差 £20,000/)).toBeInTheDocument()
  })

  it('没选定金额前确认按钮不可点，选好后报出这一笔的锁定期', async () => {
    const investMoney = vi.fn(async () => ok())
    useGameStore.setState({ investMoney })
    loadWorld()
    renderWithRouter(<FinanceScreen />, { initialEntries: ['/finance'] })

    const sheet = openSheet()
    expect(within(sheet).getByRole('button', { name: /确认开仓/ })).toBeDisabled()

    fireEvent.click(within(sheet).getByRole('button', { name: /俱乐部债券/ }))
    fireEvent.click(within(sheet).getByRole('button', { name: '投入 £4,000' }))
    // 条款行是「年化 · 锁定 · 罚息」这一段，与卡片里那句中文说明分开写，断言只认前者。
    expect(within(sheet).getByText(/^年化 4\.3% · 锁定 168 天/)).toBeInTheDocument()
    expect(within(sheet).getByRole('button', { name: /确认开仓/ })).toBeEnabled()
    await vi.waitFor(() => expect(investMoney).not.toHaveBeenCalled())
  })
})

describe('财务页的赎回与入口', () => {
  it('持仓行上的赎回按钮带着这笔持仓的 id 调用 store', async () => {
    const redeemInvestment = vi.fn(async () => ok({ proceeds: 3900000 }))
    useGameStore.setState({ redeemInvestment })
    loadWorld({ investments: [holding()] })
    renderWithRouter(<FinanceScreen />, { initialEntries: ['/finance'] })

    const row = screen.getByRole('listitem', { name: /城市公寓/ })
    fireEvent.click(within(row).getByRole('button', { name: /赎回/ }))
    await vi.waitFor(() => expect(redeemInvestment).toHaveBeenCalledWith('inv:property'))
  })

  it('锁定期内的持仓先告知罚息，不让人赎回时才读到规则', () => {
    loadWorld({ investments: [holding({ openedDay: 3 })] })
    renderWithRouter(<FinanceScreen />, { initialEntries: ['/finance'] })

    const row = screen.getByRole('listitem', { name: /城市公寓/ })
    expect(within(row).getByText(/提前赎回要付罚息/)).toBeInTheDocument()
  })

  it('更多页给出资金运用入口', () => {
    const world = loadWorld()
    renderWithRouter(<MorePrimaryColumn world={world} />, { initialEntries: ['/more'] })

    expect(screen.getByText('资金运用')).toBeInTheDocument()
  })
})
