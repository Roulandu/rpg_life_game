import { describe, expect, it } from 'vitest'
import { EFFECT_LABELS, effectList, effectText } from '../../src/ui/labels'

describe('事件效果的中文标签', () => {
  it('伤停天数按天读出方向，不把 injuryDays 这种字段名甩给玩家', () => {
    expect(effectText({ op: 'injuryDays', delta: -7 })).toBe('伤停缩短 7 天')
    expect(effectText({ op: 'injuryDays', delta: 4 })).toBe('伤停延长 4 天')
  })

  it('金钱按英镑显示并带正负号，状态效果保留符号与数值', () => {
    expect(effectText({ op: 'money', delta: -600 })).toBe('金钱 -£600')
    expect(effectText({ op: 'money', delta: 300 })).toBe('金钱 +£300')
    expect(effectText({ op: 'morale', delta: -2 })).toBe('士气 -2')
    expect(effectText({ op: 'coachTrust', delta: 2 })).toBe('教练信任 +2')
  })

  it('同一选项的多个效果串成一行，顺序与数据包一致', () => {
    expect(effectList([{ op: 'injuryDays', delta: -7 }, { op: 'fitness', delta: -5 }])).toBe(
      '伤停缩短 7 天 · 体能 -5',
    )
  })

  it('每个效果操作都有中文标签，界面不会露出裸字段名', () => {
    for (const [op, label] of Object.entries(EFFECT_LABELS)) {
      expect(label.length, op).toBeGreaterThan(0)
      expect(/[A-Za-z]/.test(label), `${op} → ${label}`).toBe(false)
    }
  })
})
