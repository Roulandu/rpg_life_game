import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { ATTR_KEYS } from '../../src/domain'
import type { WorldState } from '../../src/domain'
import { WeekPlannerModal } from '../../src/ui/components/WeekPlannerModal'
import { useGameStore } from '../../src/store/gameStore'
import { freshWorld, userOf } from '../fixtures/growth'
import { renderWithRouter } from './renderScreen'
import { resetUiStore } from './resetStore'

/** 踩单车可以靠周三特训攒进度，彩虹过人只走经验/名宿/比赛掉落。 */
function plannerWorld(position: 'ST' | 'GK'): WorldState {
  const world = freshWorld()
  const user = userOf(world)
  for (const key of ATTR_KEYS) user.attributes[key] = 70
  user.position = position
  user.moves = position === 'GK'
    ? [{ moveId: 'mv_fingertip_ledge', level: 1, progress: 2 }]
    : [{ moveId: 'mv_stepover', level: 1, progress: 2 }]
  world.weekPlan = { training: 'technical', extra: 'none', specialization: null }
  return world
}

function openPlanner(world: WorldState) {
  useGameStore.setState({ world, saveId: 'save:test', hydrated: true, saves: [] })
  renderWithRouter(<WeekPlannerModal open world={world} onClose={vi.fn()} />)
}

function plan() {
  return useGameStore.getState().world?.weekPlan
}

afterEach(() => {
  cleanup()
  resetUiStore()
})

describe('周计划里的周三特训槽', () => {
  it('只列这个位置真能靠特训攒进度的招式', () => {
    openPlanner(plannerWorld('ST'))

    expect(screen.getByText('周三特训')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /踩单车/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /彩虹过人/ })).toBeNull()
  })

  it('换位置就换一槽候选，门将看见自己的那一招', () => {
    openPlanner(plannerWorld('GK'))

    const keeperMove = screen.getByRole('button', { name: /指尖托横梁/ })
    expect(keeperMove).toBeInTheDocument()
    expect(within(keeperMove).getByText(/Ⅰ 级/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /踩单车/ })).toBeNull()
  })

  it('点中一招再保存，本周计划带上特训对象', async () => {
    openPlanner(plannerWorld('ST'))

    fireEvent.click(screen.getByRole('button', { name: /踩单车/ }))
    expect(screen.getByRole('button', { name: /踩单车/ })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: '只保存本周安排' }))

    await waitFor(() => expect(plan()?.specialization).toBe('mv_stepover'))
    expect(plan()?.training).toBe('technical')
    expect(plan()?.extra).toBe('none')
  })

  it('默认占位是不练，保存后仍是空槽', async () => {
    openPlanner(plannerWorld('ST'))

    expect(screen.getByRole('button', { name: '不练绝技' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: '只保存本周安排' }))

    await waitFor(() => expect(plan()).not.toBeUndefined())
    expect(plan()?.specialization).toBeNull()
  })

  it('选中后再点不练，槽清空', async () => {
    openPlanner(plannerWorld('ST'))

    fireEvent.click(screen.getByRole('button', { name: /踩单车/ }))
    fireEvent.click(screen.getByRole('button', { name: '不练绝技' }))
    fireEvent.click(screen.getByRole('button', { name: '只保存本周安排' }))

    await waitFor(() => expect(plan()?.specialization).toBeNull())
  })
})
