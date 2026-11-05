import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, screen } from '@testing-library/react'
import type { SaveSummary } from '../../src/domain'
import { TitleScreen } from '../../src/ui'
import { useGameStore } from '../../src/store/gameStore'
import { renderWithRouter } from './renderScreen'
import { resetUiStore } from './resetStore'

/**
 * 职责：钉住标题页存档行的删除确认与「两个同名存档要分得开」，让误触删档和认错档都不再只靠手动点出来。
 * 边界：只渲染标题页并驱动真实按钮；删除走 db/repository 的 mock，不碰 IndexedDB。
 * 依赖：src/ui 的 TitleScreen（内含 TitleSaveList）。
 */
const deleteSaveMock = vi.fn().mockResolvedValue(true)

vi.mock('../../src/db/repository', () => ({
  deleteSave: (...args: unknown[]) => deleteSaveMock(...args),
  listSaves: async () => [],
}))

function summary(overrides: Partial<SaveSummary> = {}): SaveSummary {
  return {
    id: 'save:confirm',
    playerName: '林远',
    clubName: '北看台联',
    season: 2026,
    week: 2,
    day: 3,
    age: 19,
    overall: 62,
    updatedAt: '2026-11-04T12:30:00.000Z',
    ...overrides,
  }
}

function renderTitle(...saves: SaveSummary[]) {
  useGameStore.setState({ saves, saveId: saves[0]?.id ?? null, hydrated: true })
  return renderWithRouter(<TitleScreen />, { initialEntries: ['/'] })
}

function rowTexts(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll<HTMLElement>('[data-save-row]')).map((el) => el.textContent ?? '')
}

afterEach(() => {
  cleanup()
  resetUiStore()
  vi.unstubAllGlobals()
  deleteSaveMock.mockClear()
})

describe('标题页删除存档', () => {
  it('回归: 删除确认交给系统 confirm，按钮写着英文 CANCEL 与 OK', () => {
    const confirmSpy = vi.fn(() => true)
    vi.stubGlobal('confirm', confirmSpy)
    renderTitle(summary())

    fireEvent.click(screen.getByRole('button', { name: '删除林远的存档' }))

    expect(confirmSpy).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.queryByText('CANCEL')).toBeNull()
    expect(screen.queryByText('OK')).toBeNull()
  })

  it('确认框里点「取消」不删档，弹窗关掉', () => {
    renderTitle(summary())
    fireEvent.click(screen.getByRole('button', { name: '删除林远的存档' }))

    fireEvent.click(screen.getByRole('button', { name: '取消' }))

    expect(deleteSaveMock).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('确认框里点「删除」才删掉被选中的那一个存档', () => {
    renderTitle(summary())
    fireEvent.click(screen.getByRole('button', { name: '删除林远的存档' }))

    fireEvent.click(screen.getByRole('button', { name: '删除' }))

    expect(deleteSaveMock).toHaveBeenCalledTimes(1)
    expect(deleteSaveMock).toHaveBeenCalledWith('save:confirm')
  })

  it('回归: 存档行没有最近保存时间戳，两个同名存档几乎无法分辨', () => {
    const { container } = renderTitle(
      summary({ id: 'save:a', updatedAt: '2026-11-01T03:00:00.000Z' }),
      summary({ id: 'save:b', updatedAt: '2026-11-05T03:00:00.000Z' }),
    )

    const rows = rowTexts(container)
    expect(rows).toHaveLength(2)
    for (const row of rows) {
      expect(row).toMatch(/\d{2}-\d{2}/)
    }
    expect(new Set(rows).size).toBe(2)
  })
})
