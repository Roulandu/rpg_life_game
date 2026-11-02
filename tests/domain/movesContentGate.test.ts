import { describe, expect, it } from 'vitest'
import {
  MOVE_PACK_NAMES,
  RARITY_CHANCE_BUDGET,
  buildMoveRegistry,
  movesOfPack,
  parseMovePack,
} from '../../src/domain'
import type { MoveDefinition } from '../../src/domain'

/**
 * 内容门禁的失败面：真实数据包只走 happy path，这里用故意写坏的样本把每条中文报错逼出来，
 * 保证「哪条规则拦住了哪份内容」在 CI 里是可执行的，而不是只写在注释里。
 */
function moveFixture(patch: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'mv_gate',
    nameZh: '门前假动作',
    family: 'dribbling',
    rarity: 'rare',
    positions: ['FWD'],
    targets: ['oneOnOne:round'],
    levels: [
      { level: 1, minOverall: 60, costExp: 60, chanceDelta: 0.02, riskDelta: 0.01, basisZh: '沉肩' },
      { level: 2, minOverall: 72, costExp: 120, chanceDelta: 0.04, riskDelta: 0.02, basisZh: '再沉肩' },
      { level: 3, minOverall: 84, costExp: 210, chanceDelta: 0.06, riskDelta: 0.03, basisZh: '反向趟球' },
    ],
    unlock: { via: ['exp'] },
    textZh: { success: '门将重心被晃开', fail: '趟大了' },
    ...patch,
  }
}

function parse(patch: Record<string, unknown> = {}): MoveDefinition[] {
  return parseMovePack([moveFixture(patch)])
}

function levelsPatched(patch: Record<string, unknown>) {
  const source = moveFixture()
  const levels = source.levels as Record<string, unknown>[]
  return { levels: levels.map((level) => ({ ...level, ...patch })) }
}

describe('绝技内容包：合法样本与分包注册', () => {
  it('合法样本原样落地，稀有度预算与三档等级都保留', () => {
    const [move] = parse()
    expect(move.id).toBe('mv_gate')
    expect(move.levels).toHaveLength(3)
    expect(move.levels[2].chanceDelta).toBeLessThanOrEqual(RARITY_CHANCE_BUDGET[move.rarity])
    expect(move.unlock.via).toEqual(['exp'])
  })

  it('带对手压制项与导师角色的样本同样合法', () => {
    const [move] = parse({
      counter: { role: 'keeper', attr: 'goalkeeping', coefficient: 0.003, labelZh: '站位' },
      unlock: { via: ['exp', 'mentor'], mentorRole: 'legend', eventTemplateId: 'ev_legend_tip' },
    })
    expect(move.counter?.attr).toBe('goalkeeping')
    expect(move.unlock.mentorRole).toBe('legend')
  })

  it('八个技术流派分包都能解析，未知包名给空数组', () => {
    for (const name of MOVE_PACK_NAMES) {
      expect(movesOfPack(name).length).toBeGreaterThan(0)
    }
    expect(movesOfPack('不存在的包')).toEqual([])
  })

  it('跨数据包撞 id 时注册表直接拒绝，不让索引互相覆盖', () => {
    const pack = [moveFixture()]
    expect(() => buildMoveRegistry([{ name: 'a', moves: pack }, { name: 'b', moves: pack }])).toThrow(
      /绝技 id 在不同数据包里重复：mv_gate（b）/,
    )
  })
})

describe('绝技内容包：结构与文本规则', () => {
  it('绝技名混进拉丁字母时拒绝', () => {
    expect(() => parse({ nameZh: 'Rainbow 过人' })).toThrow(/nameZh/)
  })

  it('多出来的字段不被静默接受', () => {
    expect(() => parse({ note: '顺手加的字段' })).toThrow(/Unrecognized key/)
  })

  it('目标少了选项段或写错关键回合类型都拒绝', () => {
    expect(() => parse({ targets: ['oneOnOne'] })).toThrow(/目标格式必须是 关键回合:选项：oneOnOne/)
    expect(() => parse({ targets: ['bogusKind:round'] })).toThrow(/未知关键回合类型：bogusKind/)
  })

  it('等级不足三档时给出中文原因，而不是读空数组崩掉', () => {
    const source = moveFixture()
    const levels = (source.levels as Record<string, unknown>[]).slice(0, 2)
    expect(() => parseMovePack([{ ...source, levels }])).toThrow(/等级必须凑满 3 档：mv_gate/)
    expect(() => parse(levelsPatched({ level: 2 }))).toThrow(/等级编号必须是 1\/2\/3/)
  })

  it('成功与失败文案缺一律拒绝', () => {
    expect(() => parse({ textZh: { success: '只写好了一半' } })).toThrow(/fail/)
  })
})

describe('绝技内容包：成长曲线与预算', () => {
  it('综合分门槛不抬高时拒绝', () => {
    expect(() => parse(levelsPatched({ minOverall: 60 }))).toThrow(/综合分门槛必须逐级抬高：mv_gate/)
  })

  it('升级花费不抬高时拒绝', () => {
    expect(() => parse(levelsPatched({ costExp: 60 }))).toThrow(/升级花费必须逐级抬高：mv_gate/)
  })

  it('成功率加成不抬高时拒绝', () => {
    expect(() => parse(levelsPatched({ chanceDelta: 0.02 }))).toThrow(/成功率加成必须逐级抬高：mv_gate/)
  })

  it('加成越过该稀有度的预算时拒绝', () => {
    expect(() => parse({ rarity: 'common', ...levelsPatched({ chanceDelta: 0.05 }) })).toThrow(
      /common 级绝技的加成越过预算：mv_gate L3/,
    )
  })

  it('不给经验解锁路径的绝技在商店里买不到，因此被拒', () => {
    expect(() => parse({ unlock: { via: ['matchDrop'], mentorRole: 'legend' } })).toThrow(
      /绝技必须至少能用经验解锁/,
    )
  })

  it('声称导师传授却没写导师角色时拒绝', () => {
    expect(() => parse({ unlock: { via: ['exp', 'mentor'] } })).toThrow(/导师传授必须写明导师角色/)
  })

  it('对手压制项引用了不存在的属性时拒绝', () => {
    expect(() =>
      parse({
        counter: { role: 'keeper', attr: 'wingplay', coefficient: 0.003, labelZh: '站位' },
      }),
    ).toThrow(/对手压制项的属性不在白名单：wingplay/)
  })
})
