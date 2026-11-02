import { describe, expect, it } from 'vitest'
import { MOVES, moveById } from '../../src/domain'
import { parseEventPack } from '../../src/domain/eventContent'
import type { EventTemplateContent } from '../../src/domain/eventContent'

/**
 * 职责：守住「事件能授予绝技」这条内容契约——效果里必须带 moveId，且只能给声明了名宿路径的绝技。
 * 边界：这里只验数据包加载期的校验，真正的落地闸门在 src/engine/moveMentor.ts。
 * 依赖：src/domain/eventContent.ts 的可复用解析入口与 src/domain 的绝技索引。
 */

/** 一条真的把名宿传授列为获取路径、且中场练得动的绝技。 */
function mentorMove(): string {
  const move = MOVES.find(
    (item) => item.unlock.via.includes('mentor') && item.positions.includes('MID'),
  )
  if (!move) throw new Error('绝技数据里没有可被名宿传授的中场绝技')
  return move.id
}

/** 一条没把名宿传授列为获取路径的绝技：事件不该替它开门。 */
function outsideMove(): string {
  const move = MOVES.find(
    (item) => !item.unlock.via.includes('mentor') && item.positions.includes('MID'),
  )
  if (!move) throw new Error('绝技数据里没有排除名宿路径的中场绝技')
  return move.id
}

type EffectJson = Record<string, unknown>

/** 最小可用模板：只把要试的效果塞进第一个选项，其余字段一律给合法默认值。 */
function templateOf(effects: EffectJson[]): EventTemplateContent {
  const parsed = parseEventPack([
    {
      id: 'ev_gate',
      title: '训练场边的老将',
      body: '他看完你两脚触球，把手里的水瓶递过来。',
      sender: '名宿',
      weight: 1,
      expiresDays: 3,
      cooldownDays: 30,
      blocking: false,
      guaranteed: false,
      when: [],
      choices: [
        { id: 'learn', label: '留下来再练一组', effects },
        { id: 'polite', label: '道谢后回宿舍', effects: [{ op: 'morale', delta: 2 }] },
      ],
    },
  ])
  return parsed[0]!
}

describe('事件授予绝技的加载期校验', () => {
  it('learnMove 带真实 moveId 时通过校验并保留 moveId', () => {
    const moveId = mentorMove()

    const template = templateOf([{ op: 'learnMove', delta: 1, moveId }])

    expect(template.choices[0]!.effects[0]).toEqual({ op: 'learnMove', delta: 1, moveId })
  })

  it('moveProgress 与 legendTrust 一样是合法效果算子', () => {
    const template = templateOf([
      { op: 'moveProgress', delta: 2, moveId: mentorMove() },
      { op: 'legendTrust', delta: 6 },
    ])

    expect(template.choices[0]!.effects.map((effect) => effect.op)).toEqual([
      'moveProgress',
      'legendTrust',
    ])
  })

  it('learnMove 少了 moveId 直接被拒', () => {
    expect(() => templateOf([{ op: 'learnMove', delta: 1 }])).toThrow(/moveId/)
  })

  it('moveProgress 少了 moveId 同样被拒', () => {
    expect(() => templateOf([{ op: 'moveProgress', delta: 1 }])).toThrow(/moveId/)
  })

  it('moveId 指向不存在的绝技时被拒', () => {
    expect(() => templateOf([{ op: 'learnMove', delta: 1, moveId: 'mv_not_in_data' }])).toThrow(
      /不存在/,
    )
  })

  it('绝技没把名宿传授列为获取路径时被拒', () => {
    const outside = outsideMove()
    expect(() => templateOf([{ op: 'learnMove', delta: 1, moveId: outside }])).toThrow(
      /名宿传授/,
    )
    expect(() => templateOf([{ op: 'moveProgress', delta: 1, moveId: outside }])).toThrow(
      /名宿传授/,
    )
  })

  it('授予等级只允许 Ⅰ 到 Ⅲ 级', () => {
    const moveId = mentorMove()
    expect(() => templateOf([{ op: 'learnMove', delta: 0, moveId }])).toThrow(/等级/)
    expect(() => templateOf([{ op: 'learnMove', delta: 4, moveId }])).toThrow(/等级/)
    expect(() => templateOf([{ op: 'moveProgress', delta: 0, moveId }])).toThrow(/进度/)
  })

  it('授予等级不能越过绝技自己的档位数', () => {
    const move = moveById(mentorMove())!
    expect(move.levels.length).toBe(3)

    expect(() => templateOf([{ op: 'learnMove', delta: move.levels.length + 1, moveId: move.id }])).toThrow(
      /等级/,
    )
    expect(templateOf([{ op: 'learnMove', delta: move.levels.length, moveId: move.id }]).choices[0]!.effects[0]!.delta).toBe(3)
  })
})
