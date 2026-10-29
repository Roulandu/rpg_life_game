import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../../src/db/db'
import { useGameStore } from '../../src/store/gameStore'
import { persist } from '../../src/store/helpers'
import { testOptions } from '../fixtures/career'

const { saveWorldMock } = vi.hoisted(() => ({ saveWorldMock: vi.fn() }))

vi.mock('../../src/db', async (importActual) => {
  const actual = await importActual<typeof import('../../src/db')>()
  return { ...actual, saveWorld: saveWorldMock }
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

describe('保存失败反馈', () => {
  beforeEach(async () => {
    await db.saves.clear()
    await db.meta.clear()
    useGameStore.setState(INITIAL_STATE)
    const repository = await import('../../src/db/repository')
    saveWorldMock.mockReset()
    saveWorldMock.mockImplementation(repository.saveWorld)
  })

  it('persist 把写入异常转成结构化失败而不是吞掉', async () => {
    await useGameStore.getState().createCareer(testOptions())
    const world = useGameStore.getState().world
    expect(world).not.toBeNull()
    saveWorldMock.mockRejectedValueOnce(new Error('磁盘不可用'))

    const result = await persist(world!, null)

    expect(result).toEqual({ ok: false, error: '磁盘不可用' })
  })

  it('写入失败时 saveNow 返回 false 并给出保存失败原因', async () => {
    await useGameStore.getState().createCareer(testOptions())
    saveWorldMock.mockRejectedValueOnce(new Error('磁盘不可用'))

    const ok = await useGameStore.getState().saveNow()

    expect(ok).toBe(false)
    expect(useGameStore.getState().error).toContain('保存失败')
    expect(useGameStore.getState().error).toContain('磁盘不可用')
  })

  it('自动保存失败时仍推进周次，但明确提示未落盘', async () => {
    await useGameStore.getState().createCareer(testOptions())
    saveWorldMock.mockRejectedValueOnce(new Error('磁盘不可用'))

    const result = await useGameStore.getState().advance({ training: 'technical', extra: 'none' })

    expect(result).not.toBeNull()
    expect(useGameStore.getState().world?.week).toBe(2)
    expect(useGameStore.getState().error).toContain('保存失败')
  })
})
