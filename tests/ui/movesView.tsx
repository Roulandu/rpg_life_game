import { render, screen } from '@testing-library/react'
import type { ReactElement } from 'react'
import { MemoryRouter, Routes } from 'react-router-dom'
import { ATTR_KEYS } from '../../src/domain'
import type { Player, WorldState } from '../../src/domain'
import { useGameStore } from '../../src/store/gameStore'
import { freshWorld, userOf } from '../fixtures/growth'

/** 把主角摆成够门槛的样本：综合分 80 过 Ⅰ/Ⅱ 级的线，但离 Ⅲ 级的 84 还差着。 */
export function strong(world: WorldState, exp = 200): Player {
  const user = userOf(world)
  for (const key of ATTR_KEYS) user.attributes[key] = 80
  user.exp = exp
  user.lifetimeExp = 400
  return user
}

export function movesWorld(exp?: number): WorldState {
  const world = freshWorld()
  strong(world, exp ?? 200)
  return world
}

/** 绝技两页都跑在路由器里：列表与详情靠 `/moves/:moveId` 串联，路由表由用例给。 */
export function renderMoves(world: WorldState, routes: ReactElement, path = '/moves') {
  useGameStore.setState({ world, saveId: 'save:test', hydrated: true, saves: [] })
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>{routes}</Routes>
    </MemoryRouter>,
  )
}

export function storedUser(): Player {
  const world = useGameStore.getState().world
  if (!world) throw new Error('世界未写入')
  return userOf(world)
}

/** 行内的按钮：靠绝技名找到那一行，再取行内唯一的按钮。 */
export function rowButton(name: string): HTMLButtonElement {
  const row = screen.getByText(name).closest('li')
  const button = row?.querySelector('button')
  if (!button) throw new Error(`找不到 ${name} 的按钮`)
  return button as HTMLButtonElement
}
