import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { WorldState } from '../../src/domain'
import { ProfileGrowth } from '../../src/ui/screens/profile/ProfileGrowth'
import { useGameStore } from '../../src/store/gameStore'
import { freshWorld, tune, userOf } from '../fixtures/growth'
import { resetUiStore } from './resetStore'

beforeEach(() => resetUiStore())
afterEach(() => {
  cleanup()
  resetUiStore()
})

function renderGrowth(world: WorldState) {
  useGameStore.setState({ world, saveId: 'save:test', hydrated: true, saves: [] })
  return render(<ProfileGrowth world={world} user={userOf(world)} />)
}

function rowButton(label: string): HTMLButtonElement {
  const button = screen.getByText(label).closest('li')?.querySelector('button')
  if (!button) throw new Error(`找不到 ${label} 的投资按钮`)
  return button as HTMLButtonElement
}

function storedUser(): ReturnType<typeof userOf> {
  const world = useGameStore.getState().world
  if (!world) throw new Error('世界未写入')
  return userOf(world)
}

describe('档案页成长投资', () => {
  it('经验够时点 +1 真的把经验换成属性', async () => {
    const world = freshWorld()
    tune(world, { exp: 20 })
    renderGrowth(world)

    fireEvent.click(rowButton('传球'))

    await waitFor(() => expect(storedUser().exp).toBe(14))
    const user = storedUser()
    expect(user.attributes.passing).toBe(31)
    expect(user.attrInvestment.passing).toBe(1)
    expect(useGameStore.getState().notice).toBe('传球 +1（花 6 经验，剩 14）')
  })

  it('买不起的那一项写明价格而不是灰着不说', () => {
    const world = freshWorld()
    tune(world, { exp: 3 })
    renderGrowth(world)

    expect(rowButton('传球').disabled).toBe(true)
    expect(rowButton('传球').textContent).toContain('要 6 经验')
  })

  it('练到单项上限时把上限数字摆出来', () => {
    const world = freshWorld()
    const user = tune(world, { exp: 900, lifetimeExp: 0 })
    user.attributes.passing = 40
    renderGrowth(world)

    expect(rowButton('传球').disabled).toBe(true)
    expect(rowButton('传球').textContent).toContain('练到上限 40')
  })

  it('潜力见底时不再劝玩家攒经验，而是说明已到潜力', () => {
    const world = freshWorld()
    const user = tune(world, { exp: 900 })
    user.potential = user.attributes.passing
    renderGrowth(world)

    expect(rowButton('传球').disabled).toBe(true)
    expect(rowButton('传球').textContent).toContain('已到潜力')
  })

  it('停在开球的那天整排按钮锁住并给出理由', () => {
    const world = freshWorld()
    tune(world, { exp: 60 })
    world.pendingDayPlan = { ...world.weekPlan, fixtureId: 'fixture:test' }
    world.lastMatch = null
    renderGrowth(world)

    expect(rowButton('传球').disabled).toBe(true)
    expect(rowButton('传球').textContent).toContain('6 经验')
    expect(screen.getByText('比赛进行中不能改属性，先踢完今天。')).toBeInTheDocument()
  })

  it('中场看不到门将属性，门将看得到', () => {
    const outfield = freshWorld()
    tune(outfield)
    renderGrowth(outfield)
    expect(screen.queryByText('门将')).toBe(null)
    cleanup()

    const keeperWorld = freshWorld()
    userOf(keeperWorld).position = 'GK'
    tune(keeperWorld)
    renderGrowth(keeperWorld)

    expect(rowButton('门将')).toBeTruthy()
  })
})
