import { describe, expect, it } from 'vitest'
import { formatSavedAt } from '../../src/ui/screens/title/saveStamp'

/**
 * 职责：钉住存档时间戳的口径——列表要靠它分辨同名存档，坏值不能渲染成 NaN-NaN。
 * 边界：只测纯函数，不渲染组件；组件侧由 tests/ui/titleSaveDelete.test.tsx 覆盖。
 * 依赖：src/ui/screens/title/saveStamp.ts。
 */
describe('存档时间戳', () => {
  it('给出「月-日 时:分」四段两位的本地时间戳', () => {
    expect(formatSavedAt('2026-11-04T00:00:00.000Z')).toMatch(/^\d{2}-\d{2} \d{2}:\d{2}$/)
  })

  it('隔四天的两份存档给出不同的时间戳', () => {
    expect(formatSavedAt('2026-11-01T03:00:00.000Z')).not.toBe(formatSavedAt('2026-11-05T03:00:00.000Z'))
  })

  it('无效时间戳渲染成空串，不出现 NaN', () => {
    expect(formatSavedAt('not-a-date')).toBe('')
    expect(formatSavedAt('')).toBe('')
  })
})
