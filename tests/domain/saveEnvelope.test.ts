import { describe, expect, it } from 'vitest'
import type { WorldState } from '../../src/domain'
import { saveEnvelopeSchema } from '../../src/domain/schema/save.schema'
import { exportWorld } from '../../src/db/repository'
import { generateWorld } from '../../src/world/generator'
import { TEST_NOW, testOptions } from '../fixtures/career'

/**
 * envelope 新增的 `saveId` 是可选元数据：它必须能让旧文件照常通过，
 * 又不能让脏值（空串、数字）混进来被当成「可以覆盖某条存档」。
 */
function world(): WorldState {
  return generateWorld(testOptions({ seed: 2026 }), TEST_NOW)
}

function envelope(patch: Record<string, unknown>): unknown {
  const base = JSON.parse(exportWorld(world(), 'save:origin')) as Record<string, unknown>
  return { ...base, ...patch }
}

describe('SaveEnvelope 的 saveId 字段', () => {
  it('旧文件不带 saveId 照旧合法', () => {
    const text = JSON.parse(exportWorld(world())) as Record<string, unknown>
    delete text.saveId

    expect(saveEnvelopeSchema.safeParse(text).success).toBe(true)
  })

  it('带上来源 id 时被原样读出', () => {
    const result = saveEnvelopeSchema.safeParse(envelope({ saveId: 'save:origin' }))

    expect(result.success).toBe(true)
    expect(result.data?.saveId).toBe('save:origin')
  })

  it.each([['空串', ''], ['数字', 123], ['null', null]])(
    '脏 id（%s）被拒，不会被当成可覆盖的目标',
    (_label, value) => {
      expect(saveEnvelopeSchema.safeParse(envelope({ saveId: value })).success).toBe(false)
    },
  )

  it('纯空白 id 只是「对不上任何存档」，不会让整份文件读不回来', () => {
    const result = saveEnvelopeSchema.safeParse(envelope({ saveId: '   ' }))

    expect(result.success).toBe(true)
    expect(result.data?.saveId).toBe('   ')
  })

  it('加了 saveId 没有放松 world 校验', () => {
    const broken = envelope({ saveId: 'save:origin' }) as { world: Record<string, unknown> }
    delete broken.world.seed

    expect(saveEnvelopeSchema.safeParse(broken).success).toBe(false)
  })

  it('id 与 world 事实分开记账：同 world 不同 id 的 checksum 相同', () => {
    const w = world()

    const a = saveEnvelopeSchema.parse(JSON.parse(exportWorld(w, 'save:one'))) as { checksum: string }
    const b = saveEnvelopeSchema.parse(JSON.parse(exportWorld(w, 'save:two'))) as { checksum: string }

    expect(a.checksum).toBe(b.checksum)
    expect(a).not.toBe(b)
  })
})
