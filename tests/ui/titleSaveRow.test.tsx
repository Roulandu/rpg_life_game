import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import type { SaveSummary } from '../../src/domain'
import { TitleSaveList } from '../../src/ui/screens/title/TitleSaveList'
import { useGameStore } from '../../src/store/gameStore'
import { renderWithRouter } from './renderScreen'
import { resetUiStore } from './resetStore'

function summary(overrides: Partial<SaveSummary> = {}): SaveSummary {
  return {
    id: 'save:row',
    playerName: '林远',
    clubName: '北看台联',
    season: 2026,
    week: 2,
    day: 3,
    age: 19,
    overall: 62,
    seed: 2026,
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
    ...overrides,
  }
}

function renderRow(record: SaveSummary) {
  useGameStore.setState({ saves: [record], saveId: record.id, hydrated: true })
  return renderWithRouter(<TitleSaveList />)
}

afterEach(() => {
  cleanup()
  resetUiStore()
})

describe('标题页存档行', () => {
  it('一行同时给出俱乐部、第几周的星期几与能力值', () => {
    renderRow(summary())

    expect(screen.getByText(/林远/)).toBeInTheDocument()
    expect(screen.getByText(/北看台联/)).toBeInTheDocument()
    expect(screen.getByText(/第 2 周 · 周三/)).toBeInTheDocument()
    expect(screen.getByText(/能力 62/)).toBeInTheDocument()
  })

  it('标记当前存档并给出删除入口', () => {
    renderRow(summary())

    expect(screen.getByText('当前')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '删除林远的存档' })).toBeInTheDocument()
  })

  it('同赛季同周的两份存档靠种子与建档时间分得开', () => {
    useGameStore.setState({
      saves: [summary({ id: 'save:one' }), summary({ id: 'save:two', seed: 7, createdAt: '2026-07-01T00:00:00.000Z' })],
      hydrated: true,
    })
    renderWithRouter(<TitleSaveList />)

    expect(screen.getByText(/种子 2026 · 建于/)).toBeInTheDocument()
    expect(screen.getByText(/种子 7 · 建于/)).toBeInTheDocument()
    expect(screen.getAllByText(/保存于/)).toHaveLength(2)
  })
})
