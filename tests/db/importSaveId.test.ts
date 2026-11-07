import { describe, expect, it } from 'vitest'
import type { WorldState } from '../../src/domain'
import { exportWorld, importSave, summarizeWorld } from '../../src/db/repository'
import { generateWorld } from '../../src/world/generator'
import { TEST_NOW, testOptions } from '../fixtures/career'

/**
 * 导出/导入的「来源存档 id」是封装层元数据：它决定导入能不能原位覆盖那一条，
 * 因此必须在 schema、导出与读回三段上都对得上，而 checksum 只管 world 事实。
 */
function worldAtWeek(week: number): WorldState {
  const world = generateWorld(testOptions({ seed: 2026 }), TEST_NOW)
  world.week = week
  return world
}

describe('envelope 的来源存档 id', () => {
  it('exportWorld 的第二参数写进 envelope', () => {
    const text = exportWorld(worldAtWeek(2), 'save:alpha')

    expect(JSON.parse(text)).toMatchObject({ saveId: 'save:alpha' })
  })

  it('不带 id 导出的旧文件照旧合法，importSave 报 null', () => {
    const text = exportWorld(worldAtWeek(3))

    expect((JSON.parse(text) as { saveId?: string }).saveId).toBeUndefined()
    expect(importSave(text).saveId).toBeNull()
    expect(importSave(text).world.week).toBe(3)
  })

  it('id 不影响 checksum：改 id 不改变 world 校验结论', () => {
    const world = worldAtWeek(5)
    type Parsed = { checksum: string; world: unknown }
    const withId = JSON.parse(exportWorld(world, 'save:one')) as Parsed
    const without = JSON.parse(exportWorld(world)) as Parsed

    expect(withId.checksum).toBe(without.checksum)
    expect(withId.world).toEqual(without.world)
  })

  it('摘要投影出种子与建档时间', () => {
    const world = worldAtWeek(2)

    const summary = summarizeWorld(world, 'save:alpha')

    expect(summary.seed).toBe(world.seed)
    expect(summary.createdAt).toBe(world.createdAt)
    expect(summary.week).toBe(2)
  })
})
