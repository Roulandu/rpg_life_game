import { describe, expect, it } from 'vitest'
import { effectsSummary, successBasisText } from '../../src/domain'
import type { KeyMomentOption } from '../../src/domain'

const option: KeyMomentOption = {
  id: 'shoot',
  labelZh: '直接射门',
  descriptionZh: '自己解决。',
  successChance: 0.74,
  successBasisZh: '射门 92、心理 92',
  ratingOnSuccess: 0.8,
  ratingOnFail: -0.4,
  goalOnSuccess: true,
  assistOnSuccess: true,
  coachOnSuccess: 0.5,
  coachOnFail: -0.5,
  moraleOnSuccess: 2,
  moraleOnFail: -1,
}

describe('key moment view helpers', () => {
  it('成功率依据包含属性名与最终百分比', () => {
    const text = successBasisText(option)
    expect(text).toContain('射门')
    expect(text).toContain('74%')
  })

  it('效果摘要覆盖进球、助攻、评分、士气与教练信任', () => {
    const text = effectsSummary(option)
    expect(text).toContain('进球')
    expect(text).toContain('助攻')
    expect(text).toContain('评分 +0.8')
    expect(text).toContain('士气 +2')
    expect(text).toContain('教练 +0.5')
  })
})
