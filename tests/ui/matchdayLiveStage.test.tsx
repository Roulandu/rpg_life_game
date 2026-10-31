import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import { MatchdayScreen } from '../../src/ui/screens/MatchdayScreen'
import { useGameStore } from '../../src/store/gameStore'
import { autoResolveKeyMoments } from '../../src/engine/keyMoments'
import { db } from '../../src/db/db'
import { renderWithRouter } from './renderScreen'
import { resetUiStore } from './resetStore'
import { liveKickoffWorld, worldWithKeyMoments } from './matchdayWorld'

afterEach(async () => {
  cleanup()
  resetUiStore()
  await db.saves.clear()
  await db.meta.clear()
})

describe('live matchday stage kickoff', () => {
  it('进入比赛后从 0 分钟自动开赛并显示球场、数据与直播', () => {
    useGameStore.setState({ world: liveKickoffWorld(), hydrated: true })

    renderWithRouter(<MatchdayScreen />)

    expect(useGameStore.getState().livePlayback.phase).toBe('playing')
    expect(screen.getByText('进行中 · 第 0 分钟')).toBeInTheDocument()
    expect(screen.getByTestId('pitch-map')).toBeInTheDocument()
    expect(screen.getByTestId('match-stats')).toBeInTheDocument()
    expect(screen.getByTestId('live-feed')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '暂停' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '1x' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '4x' })).toBeInTheDocument()
  })

  it('可以切换速度、暂停与继续', () => {
    useGameStore.setState({ world: liveKickoffWorld(), hydrated: true })
    renderWithRouter(<MatchdayScreen />)

    fireEvent.click(screen.getByRole('button', { name: '2x' }))
    expect(useGameStore.getState().livePlayback.speed).toBe(2)

    fireEvent.click(screen.getByRole('button', { name: '暂停' }))
    expect(useGameStore.getState().livePlayback.phase).toBe('paused')

    fireEvent.click(screen.getByRole('button', { name: '继续' }))
    expect(useGameStore.getState().livePlayback.phase).toBe('playing')
  })
})

describe('live matchday stage key moment', () => {
  it('关键回合到点自动暂停并弹出关键回合弹窗', async () => {
    useGameStore.setState({ world: worldWithKeyMoments(), hydrated: true })

    renderWithRouter(<MatchdayScreen />)

    await waitFor(() => expect(useGameStore.getState().livePlayback.phase).toBe('awaiting'))
    expect(screen.getByText('比赛日 · 关键回合')).toBeInTheDocument()
    expect(screen.getByText(/关键时刻/)).toBeInTheDocument()
    expect(screen.getAllByText(/成功率/)).toHaveLength(5)
  })

  it('选择后进入结果态，继续比赛恢复播放', async () => {
    useGameStore.setState({ world: worldWithKeyMoments(), hydrated: true, saveId: 'live-ui' })
    renderWithRouter(<MatchdayScreen />)
    await waitFor(() => expect(useGameStore.getState().livePlayback.phase).toBe('awaiting'))

    const moment = useGameStore
      .getState()
      .world!.lastMatch!.keyMoments!.find((item) => !item.outcome)!
    fireEvent.click(screen.getByText(moment.options[0]!.labelZh))

    await waitFor(() => expect(useGameStore.getState().livePlayback.phase).toBe('result'))
    expect(screen.getByText(/掷骰/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '继续比赛' }))
    expect(useGameStore.getState().livePlayback.phase).toBe('playing')
  })
})

describe('live matchday stage completion', () => {
  it('播到 90 分钟后提供完成比赛入口并结算整周', async () => {
    const world = worldWithKeyMoments()
    autoResolveKeyMoments(world)
    expect(world.lastMatch?.currentMinute).toBe(90)
    useGameStore.setState({ world, hydrated: true, saveId: 'live-ui' })
    const week = world.week

    renderWithRouter(<MatchdayScreen />)
    await waitFor(() => expect(useGameStore.getState().livePlayback.phase).toBe('ended'))

    fireEvent.click(screen.getByRole('button', { name: '完成比赛' }))

    await waitFor(() => expect(useGameStore.getState().world?.lastMatch?.status).toBe('final'))
    expect(useGameStore.getState().world?.week).toBe(week + 1)
  })

  it('替补球员看到登场分钟提示', () => {
    const world = liveKickoffWorld()
    world.lastMatch!.userStarted = false
    world.lastMatch!.userMinutes = 25
    useGameStore.setState({ world, hydrated: true })

    renderWithRouter(<MatchdayScreen />)

    expect(screen.getByText('你将在第 65 分钟登场')).toBeInTheDocument()
  })
})
