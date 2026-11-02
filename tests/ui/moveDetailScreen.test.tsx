import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import { Route } from 'react-router-dom'
import { MoveDetailScreen } from '../../src/ui/screens/MoveDetailScreen'
import { userOf } from '../fixtures/growth'
import { movesWorld, renderMoves, storedUser } from './movesView'
import { resetUiStore } from './resetStore'

const DETAIL_ROUTE = <Route path="/moves/:moveId" element={<MoveDetailScreen />} />

afterEach(() => {
  cleanup()
  resetUiStore()
})

function openRainbow(path = '/moves/mv_rainbow', exp?: number) {
  return renderMoves(movesWorld(exp), DETAIL_ROUTE, path)
}

describe('绝技详情页的牌面', () => {
  it('把三级的门槛、花费与成功率加成摊开写', () => {
    openRainbow()

    expect(screen.getByText('彩虹过人')).toBeInTheDocument()
    expect(screen.getByText('盘带')).toBeInTheDocument()
    expect(screen.getByText('+2.8%')).toBeInTheDocument()
    expect(screen.getByText('+10.0%')).toBeInTheDocument()
    expect(screen.getByText('从头顶把球捞过去')).toBeInTheDocument()
    expect(screen.getByText('综合分 84 起')).toBeInTheDocument()
    expect(screen.getByText('225 经验')).toBeInTheDocument()
  })

  it('写清这一招会被什么压住、能用在哪类回合、从哪些途径拿到', () => {
    openRainbow()

    expect(screen.getByText('身后后卫的回追')).toBeInTheDocument()
    expect(screen.getByText('单刀')).toBeInTheDocument()
    expect(screen.getByText('绝佳机会')).toBeInTheDocument()
    expect(screen.getByText('经验解锁')).toBeInTheDocument()
    expect(screen.getByText('名宿传授')).toBeInTheDocument()
    expect(screen.getByText('比赛掉落')).toBeInTheDocument()
  })

  it('成与败各留一句文案，让玩家知道练成了长什么样', () => {
    openRainbow()

    expect(screen.getByText(/你把球从身后卷起来/)).toBeInTheDocument()
    expect(screen.getByText(/球卷到一半被断下/)).toBeInTheDocument()
  })
})

describe('绝技详情页的投资与兜底', () => {
  it('详情页的解锁按钮同样走经验投资', async () => {
    openRainbow('/moves/mv_rainbow', 200)

    fireEvent.click(screen.getByRole('button', { name: /解锁 62 经验/ }))

    await waitFor(() => expect(storedUser().moves?.[0]?.level).toBe(1))
    expect(storedUser().exp).toBe(138)
  })

  it('练满三级后按钮换成练到尽头', () => {
    const world = movesWorld()
    userOf(world).moves = [{ moveId: 'mv_rainbow', level: 3, progress: 0 }]
    renderMoves(world, DETAIL_ROUTE, '/moves/mv_rainbow')

    expect(screen.getByText('已练到尽头')).toBeInTheDocument()
  })

  it('点了不存在的绝技 id 给出说明而不是白屏', () => {
    openRainbow('/moves/mv_not_exists')

    expect(screen.getByText('找不到这门绝技')).toBeInTheDocument()
    expect(screen.getByText('返回绝技列表')).toBeInTheDocument()
  })

  it('比赛进行中的那天把解锁按钮锁住并说明原因', () => {
    const world = movesWorld(200)
    world.pendingDayPlan = { ...world.weekPlan, fixtureId: 'fixture:test' }
    world.lastMatch = null
    renderMoves(world, DETAIL_ROUTE, '/moves/mv_rainbow')

    expect(screen.getByRole('button', { name: /解锁 62 经验/ })).toBeDisabled()
    expect(screen.getByText('比赛进行中不能改绝技，先把今天踢完。')).toBeInTheDocument()
  })
})
