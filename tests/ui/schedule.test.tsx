import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, screen } from '@testing-library/react'
import { ScheduleScreen } from '../../src/ui/screens/ScheduleScreen'
import { useGameStore } from '../../src/store/gameStore'
import { generateWorld } from '../../src/world/generator'
import { TEST_NOW, testOptions } from '../fixtures/career'
import { renderWithRouter } from './renderScreen'
import { resetUiStore } from './resetStore'

function renderSchedule() {
  useGameStore.setState({ world: generateWorld(testOptions(), TEST_NOW), hydrated: true, saves: [] })
  return renderWithRouter(<ScheduleScreen />)
}

afterEach(() => {
  cleanup()
  resetUiStore()
})

describe('schedule responsive layout', () => {
  it('keeps both panels mounted and reveals them side by side on desktop', () => {
    renderSchedule()

    const fixtures = screen.getByTestId('schedule-fixtures')
    const table = screen.getByTestId('schedule-table')

    expect(fixtures.className).not.toContain('hidden')
    expect(table.className).toContain('hidden')
    expect(table.className).toContain('lg:block')
    expect(fixtures.className).toContain('lg:block')
    expect(screen.getByText('全部赛程')).toBeInTheDocument()
  })

  it('switches the visible panel on mobile and keeps the table scrollable', () => {
    renderSchedule()

    fireEvent.click(screen.getByRole('button', { name: '积分榜' }))

    expect(screen.getByTestId('schedule-fixtures').className).toContain('hidden')
    expect(screen.getByTestId('schedule-table').className).not.toContain('hidden')
    expect(screen.getByTestId('schedule-table').querySelector('.overflow-x-auto')).not.toBeNull()
  })
})
