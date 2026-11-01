import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, screen } from '@testing-library/react'
import { ScheduleScreen } from '../../src/ui/screens/ScheduleScreen'
import { fixtureDayOf } from '../../src/domain'
import { useGameStore } from '../../src/store/gameStore'
import type { WorldState } from '../../src/domain'
import { generateWorld } from '../../src/world/generator'
import { TEST_NOW, testOptions } from '../fixtures/career'
import { renderWithRouter } from './renderScreen'
import { resetUiStore } from './resetStore'

function renderSchedule() {
  useGameStore.setState({ world: generateWorld(testOptions(), TEST_NOW), hydrated: true, saves: [] })
  return renderWithRouter(<ScheduleScreen />)
}

function renderAt(week: number, day: number) {
  const world = generateWorld(testOptions(), TEST_NOW)
  world.week = week
  world.day = day
  useGameStore.setState({ world, hydrated: true, saves: [] })
  return { world, view: renderWithRouter(<ScheduleScreen />) }
}

/** 该俱乐部本周那场比赛落在星期几，供「今天」用例取真实比赛日。 */
function matchDayOf(world: WorldState, week: number): number {
  const fixture = Object.values(world.fixtures).find(
    (item) =>
      item.season === world.season &&
      item.week === week &&
      (item.homeId === world.clubId || item.awayId === world.clubId),
  )
  if (!fixture) throw new Error(`第 ${week} 周没有本俱乐部赛程`)
  return fixtureDayOf(fixture)
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

describe('赛程按日显示', () => {
  it('每行给出星期几与日期，不再只有周数', () => {
    renderSchedule()

    const dates = screen.getAllByText(/\d{2}-\d{2}/)
    expect(dates.length).toBeGreaterThan(10)
    expect(screen.getAllByText(/周[一二三四五六日]/).length).toBeGreaterThan(10)
  })

  it('今天有比赛的那一行标成今天', () => {
    const world = generateWorld(testOptions(), TEST_NOW)
    const day = matchDayOf(world, 1)
    renderAt(1, day)

    expect(screen.getByText('今天')).toBeInTheDocument()
  })

  it('今天没有比赛时不出现今天标记', () => {
    const world = generateWorld(testOptions(), TEST_NOW)
    const matchDay = matchDayOf(world, 1)
    const idleDay = matchDay === 1 ? 2 : 1
    renderAt(1, idleDay)

    expect(screen.queryByText('今天')).not.toBeInTheDocument()
  })
})
