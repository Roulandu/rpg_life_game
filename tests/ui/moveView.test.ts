import { describe, expect, it } from 'vitest'
import { ATTR_KEYS, moveById } from '../../src/domain'
import type { MoveDefinition, Player } from '../../src/domain'
import { chanceText, moveActionOf, moveStatusText } from '../../src/ui/screens/moves/moveView'
import { freshWorld, userOf } from '../fixtures/growth'

const RAINBOW = moveById('mv_rainbow') as MoveDefinition

/** 把主角摆成能对照门槛的样子：整体拉到某一分，只留经验这一位可变。 */
function userAt(overall: number, exp: number, level = 0, progress = 0): Player {
  const world = freshWorld()
  const user = userOf(world)
  for (const key of ATTR_KEYS) user.attributes[key] = overall
  user.exp = exp
  user.lifetimeExp = 400
  user.moves = level === 0 && progress === 0 ? [] : [{ moveId: RAINBOW.id, level, progress }]
  return user
}

describe('绝技按钮文案的取值', () => {
  it('带符号的百分数把正负与一位小数都写全', () => {
    expect(chanceText(0.028)).toBe('+2.8%')
    expect(chanceText(0.1)).toBe('+10.0%')
    expect(chanceText(-0.015)).toBe('-1.5%')
    expect(chanceText(0)).toBe('+0.0%')
  })

  it('一级没解锁时按钮报出解锁价', () => {
    expect(moveActionOf(RAINBOW, userAt(80, 200))).toEqual({ text: '解锁 62 经验', enabled: true })
    expect(moveActionOf(RAINBOW, userAt(80, 20))).toEqual({ text: '要 62 经验', enabled: false })
  })

  it('已经一级时按下一级价钱与罗马数字收费', () => {
    expect(moveActionOf(RAINBOW, userAt(80, 200, 1))).toEqual({ text: '升到 Ⅱ 130 经验', enabled: true })
  })

  it('综合分没到下一级门槛时先说门槛，不许让人白点', () => {
    expect(moveActionOf(RAINBOW, userAt(50, 900))).toEqual({ text: '要综合分 60', enabled: false })
    expect(moveActionOf(RAINBOW, userAt(80, 900, 2))).toEqual({ text: '要综合分 84', enabled: false })
  })

  it('练到 Ⅲ 级之后按钮只报尽头，不再出价', () => {
    expect(moveActionOf(RAINBOW, userAt(90, 900, 3))).toEqual({ text: '已练到尽头', enabled: false })
  })
})

describe('绝技进度文案的取值', () => {
  it('有级数读成级数，0 级只读成修炼进度', () => {
    expect(moveStatusText(RAINBOW, userAt(80, 200, 2))).toBe('已练到 Ⅱ 级')
    expect(moveStatusText(RAINBOW, userAt(80, 200, 0, 2))).toBe('修炼进度 2/3')
    expect(moveStatusText(RAINBOW, userAt(80, 200))).toBe('修炼进度 0/3')
  })
})
