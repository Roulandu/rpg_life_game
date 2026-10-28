import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../../src/db/db'
import { listSaves } from '../../src/db/repository'
import { useGameStore } from '../../src/store/gameStore'
import { testOptions } from '../fixtures/career'

vi.mock('../../src/platform/keyStore', async (importActual) => {
  const actual = await importActual<typeof import('../../src/platform/keyStore')>()
  return { ...actual, getLoadedApiKey: () => 'test-key' }
})

vi.mock('../../src/llm/generate', async (importActual) => {
  const actual = await importActual<typeof import('../../src/llm/generate')>()
  return {
    ...actual,
    generateChatReply: vi.fn(async () => ({
      text: '教练点了点头。',
      actionId: 'talk_coach' as const,
      usage: { promptTokens: 10, completionTokens: 5 },
      model: 'test-model',
    })),
  }
})

const INITIAL_STATE = {
  world: null,
  saveId: null,
  saves: [],
  lastTurn: null,
  seasonTransition: null,
  busy: false,
  hydrated: false,
  notice: null,
  error: null,
}

describe('game store', () => {
  beforeEach(async () => {
    await db.saves.clear()
    await db.meta.clear()
    useGameStore.setState(INITIAL_STATE)
  })

  it('creates, advances and autosaves a career', async () => {
    await useGameStore.getState().init()
    expect(useGameStore.getState().hydrated).toBe(true)

    await useGameStore.getState().createCareer(testOptions())
    const created = useGameStore.getState()
    expect(created.world).not.toBeNull()
    expect(created.saveId).toBeTruthy()
    expect(created.world?.week).toBe(1)
    expect(await listSaves()).toHaveLength(1)

    const result = await useGameStore.getState().advance({ training: 'technical', extra: 'none' })
    expect(result).not.toBeNull()
    expect(result?.weekPlayed).toBe(1)
    expect(result?.match).not.toBeNull()
    expect(useGameStore.getState().world?.week).toBe(2)
    expect(useGameStore.getState().lastTurn?.match?.fixtureId).toBe(result?.match?.fixtureId)
    expect(await listSaves()).toHaveLength(1)
  })

  it('loads the last save during init', async () => {
    await useGameStore.getState().createCareer(testOptions())
    const saveId = useGameStore.getState().saveId

    useGameStore.setState(INITIAL_STATE)
    await useGameStore.getState().init()

    expect(useGameStore.getState().hydrated).toBe(true)
    expect(useGameStore.getState().saveId).toBe(saveId)
    expect(useGameStore.getState().world?.players[useGameStore.getState().world!.playerId].name).toBe('测试球员')
  })

  it('applies a resolved chat action proposal during sendChat', async () => {
    await useGameStore.getState().createCareer(testOptions())
    useGameStore.getState().updateSettings({ aiMode: 'llm' })

    await useGameStore.getState().sendChat('教练，我想多聊聊。')

    const world = useGameStore.getState().world
    expect(world?.aiAction?.actionId).toBe('talk_coach')
    const last = world?.aiChat?.[world.aiChat.length - 1]
    expect(last?.role).toBe('assistant')
    expect(last?.actionLabel).toBe('与教练谈话')
    expect(useGameStore.getState().aiBusy).toBe(false)
  })
})
