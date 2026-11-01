import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, screen } from '@testing-library/react'
import { DashboardScreen } from '../../src/ui/screens/DashboardScreen'
import { useGameStore } from '../../src/store/gameStore'
import { generateWorld } from '../../src/world/generator'
import { TEST_NOW, testOptions } from '../fixtures/career'
import { renderWithRouter } from './renderScreen'
import { resetUiStore } from './resetStore'

afterEach(() => {
  cleanup()
  resetUiStore()
})

function renderFreshDashboard() {
  const world = generateWorld(testOptions(), TEST_NOW)
  useGameStore.setState({ world, hydrated: true, saves: [] })
  return renderWithRouter(<DashboardScreen />)
}

describe('主页逐日推进', () => {
  it('推进区只保留一个区块标记并给出两个推进按钮', () => {
    renderFreshDashboard()

    expect(document.querySelectorAll('[data-dashboard-block="advance"]')).toHaveLength(1)
    expect(screen.getByRole('button', { name: /推进到下一件事/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /推进一天/ })).toBeInTheDocument()
  })

  it('推进按钮下方预告离下一场还有几天', () => {
    renderFreshDashboard()

    expect(screen.getByText(/距上场 \d+ 天/)).toBeInTheDocument()
  })

  it('安排本周仍然打开周计划弹窗', () => {
    renderFreshDashboard()

    fireEvent.click(screen.getByRole('button', { name: /安排本周/ }))

    expect(screen.getByText('训练重点')).toBeInTheDocument()
  })
})
