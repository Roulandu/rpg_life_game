import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { Route } from 'react-router-dom'
import { ATTR_KEYS } from '../../src/domain'
import { MovesScreen } from '../../src/ui/screens/MovesScreen'
import { useGameStore } from '../../src/store/gameStore'
import { freshWorld, userOf } from '../fixtures/growth'
import { movesWorld, renderMoves, rowButton, storedUser } from './movesView'
import { resetUiStore } from './resetStore'

const MOVES_ROUTE = <Route path="/moves" element={<MovesScreen />} />

afterEach(() => {
  cleanup()
  resetUiStore()
})

describe('绝技页的账本区', () => {
  it('把已学会的绝技连同级数列在「我在练的」里', () => {
    const world = movesWorld()
    userOf(world).moves = [{ moveId: 'mv_rainbow', level: 2, progress: 0 }]
    renderMoves(world, MOVES_ROUTE)

    expect(screen.getByText('绝技')).toBeInTheDocument()
    expect(screen.getByText('我在练的')).toBeInTheDocument()
    const link = screen.getByRole('link', { name: /彩虹过人/ })
    expect(link).toHaveAttribute('href', '/moves/mv_rainbow')
    const row = link.closest('li')!
    expect(within(row).getByText('传奇')).toBeInTheDocument()
    expect(within(row).getByText('已练到 Ⅱ 级')).toBeInTheDocument()
  })

  it('0 级的记录读成修炼进度，不假装已经学会', () => {
    const world = movesWorld()
    userOf(world).moves = [{ moveId: 'mv_rainbow', level: 0, progress: 2 }]
    renderMoves(world, MOVES_ROUTE)

    expect(screen.getByText('修炼进度 2/3')).toBeInTheDocument()
    expect(screen.queryByText(/已练到/)).toBeNull()
  })

  it('一条绝技都没有时说明进度从哪里攒', () => {
    renderMoves(movesWorld(), MOVES_ROUTE)

    expect(screen.getByText('还没学会任何绝技')).toBeInTheDocument()
    expect(screen.getByText(/周三特训/)).toBeInTheDocument()
  })
})

describe('绝技页的位置闸门', () => {
  it('门将位置的中场绝技不会混进图鉴', () => {
    const keeper = freshWorld()
    userOf(keeper).position = 'GK'
    renderMoves(keeper, MOVES_ROUTE)

    expect(screen.queryByText('彩虹过人')).toBeNull()
    expect(screen.getByText('猫系反应')).toBeInTheDocument()
    cleanup()

    renderMoves(movesWorld(), MOVES_ROUTE)
    expect(screen.getByText('彩虹过人')).toBeInTheDocument()
  })
})

describe('绝技页的经验解锁', () => {
  it('经验够时点图鉴里的解锁真的扣经验并写进档案', async () => {
    renderMoves(movesWorld(200), MOVES_ROUTE)

    fireEvent.click(rowButton('彩虹过人'))

    await waitFor(() => expect(storedUser().exp).toBe(138))
    expect(storedUser().moves).toEqual([{ moveId: 'mv_rainbow', level: 1, progress: 0 }])
    expect(useGameStore.getState().notice).toBe('彩虹过人 练到 Ⅰ 级（花 62 经验，剩 138）')
  })

  it('买不起的那一行把价格写在按钮上，而不是灰着不说', () => {
    renderMoves(movesWorld(20), MOVES_ROUTE)

    expect(rowButton('彩虹过人').disabled).toBe(true)
    expect(rowButton('彩虹过人').textContent).toContain('要 62 经验')
  })

  it('综合分不够的那一行写明门槛', () => {
    const world = freshWorld()
    const user = userOf(world)
    for (const key of ATTR_KEYS) user.attributes[key] = 50
    user.exp = 900
    renderMoves(world, MOVES_ROUTE)

    expect(rowButton('彩虹过人').disabled).toBe(true)
    expect(rowButton('彩虹过人').textContent).toContain('要综合分 60')
  })
})
