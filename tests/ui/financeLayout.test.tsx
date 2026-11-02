import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, screen, within } from '@testing-library/react'
import { FinanceScreen } from '../../src/ui/screens/FinanceScreen'
import {
  minHeightPx,
  loadWorld,
  tokensIn,
  tooWideTokens,
  touchTargets,
} from './layoutHarness'
import { renderWithRouter } from './renderScreen'
import { resetUiStore } from './resetStore'

afterEach(() => {
  cleanup()
  resetUiStore()
})

describe('财务页手机契约', () => {
  it('财务页本体与开仓抽屉里的每个按钮都是 44px 触控目标', () => {
    loadWorld()

    const page = renderWithRouter(<FinanceScreen />, { initialEntries: ['/finance'] })
    const targets = touchTargets(page.container)
    expect(targets.length).toBeGreaterThan(0)
    for (const target of targets) {
      expect(minHeightPx(target.className)).toBeGreaterThanOrEqual(44)
    }

    fireEvent.click(screen.getByRole('button', { name: /把钱投出去/ }))
    const sheet = touchTargets(screen.getByRole('dialog', { name: '资金去处' }))
    expect(sheet.length).toBeGreaterThanOrEqual(6)
    for (const target of sheet) {
      expect(minHeightPx(target.className)).toBeGreaterThanOrEqual(44)
    }
  })

  it('抽屉展开后档位仍是两列，选中的条款行读得到年化与起投额', () => {
    loadWorld()
    renderWithRouter(<FinanceScreen />, { initialEntries: ['/finance'] })
    fireEvent.click(screen.getByRole('button', { name: /把钱投出去/ }))

    const sheet = screen.getByRole('dialog', { name: '资金去处' })
    const grids = tokensIn(sheet).filter((token) => /^grid-cols-\d+$/.test(token))
    expect(grids).toEqual(['grid-cols-2'])

    fireEvent.click(within(sheet).getByRole('button', { name: /银行活期存款/ }))
    expect(within(sheet).getByText('起投 £1,000')).toBeInTheDocument()
  })

  it('财务页手机端占满宽度、桌面收到 760px，且没有超过手机安全宽度的固定像素', () => {
    loadWorld()

    const page = renderWithRouter(<FinanceScreen />, { initialEntries: ['/finance'] })
    const root = page.container.firstElementChild as HTMLElement
    expect(root.className).toContain('page-pad')
    expect(root.className).toContain('sm:mx-auto')
    expect(root.className).toContain('sm:max-w-[760px]')
    expect(tooWideTokens(page.container)).toEqual([])
  })
})
