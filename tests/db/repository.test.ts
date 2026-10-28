import { describe, expect, it } from 'vitest'
import { createSaveId, summarizeWorld } from '../../src/db/repository'
import { generateWorld } from '../../src/world/generator'
import { TEST_NOW, testOptions } from '../fixtures/career'

describe('repository 摘要与存档 id', () => {
  it('summarizeWorld 映射球员与俱乐部字段', () => {
    const world = generateWorld(testOptions(), TEST_NOW)
    const summary = summarizeWorld(world, 'save:x')
    expect(summary.id).toBe('save:x')
    expect(summary.playerName).toBe('测试球员')
    expect(summary.clubName).toBe('伯明翰联')
    expect(summary.season).toBe(world.season)
    expect(summary.week).toBe(world.week)
  })

  it('createSaveId 生成 save: 前缀且每次唯一', () => {
    const world = generateWorld(testOptions(), TEST_NOW)
    const first = createSaveId(world)
    expect(first).toMatch(/^save:/)
    expect(first).not.toBe(createSaveId(world))
  })
})
