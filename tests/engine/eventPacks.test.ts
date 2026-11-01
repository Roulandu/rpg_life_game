import { describe, expect, it } from 'vitest'
import { EVENT_PACK_NAMES, eventTemplatesOfPack } from '../../src/domain/eventContent'

interface PackExpectation {
  name: string
  prefix: string
  minCount: number
  maxExpiresDays: number
  senders: string[]
}

/** 每加一个类别包就在这里加一行：条数、id 前缀、最长保留天数与必须出现的发件人都是契约。 */
const EXPECTATIONS: PackExpectation[] = [
  {
    name: 'daily-life',
    prefix: 'dl_',
    minCount: 12,
    maxExpiresDays: 4,
    senders: ['家人', '青训旧友', '装备管理员'],
  },
  {
    name: 'media',
    prefix: 'md_',
    minCount: 12,
    maxExpiresDays: 5,
    senders: ['转播记者', '队报记者', '球迷会', '社交媒体'],
  },
]

describe('事件内容包的分类契约', () => {
  it('EXPECTATIONS 覆盖的包都已注册进数据包注册表', () => {
    for (const expectation of EXPECTATIONS) {
      expect(EVENT_PACK_NAMES, expectation.name).toContain(expectation.name)
    }
  })

  for (const expectation of EXPECTATIONS) {
    it(`${expectation.name} 包给出足够条数、统一 id 前缀与要求的发件人`, () => {
      const pack = eventTemplatesOfPack(expectation.name)
      expect(pack.length).toBeGreaterThanOrEqual(expectation.minCount)
      for (const template of pack) {
        expect(template.id.startsWith(expectation.prefix), template.id).toBe(true)
        expect(template.choices.length, template.id).toBeGreaterThanOrEqual(2)
        expect(template.sender.length, template.id).toBeGreaterThan(0)
        expect(template.expiresDays, template.id).toBeLessThanOrEqual(expectation.maxExpiresDays)
        expect(template.cooldownDays, template.id).toBeGreaterThanOrEqual(template.expiresDays)
        for (const choice of template.choices) {
          expect(choice.effects.length, `${template.id}.${choice.id}`).toBeGreaterThan(0)
        }
      }
      const senders = new Set(pack.map((template) => template.sender))
      for (const sender of expectation.senders) {
        expect(senders, `${expectation.name} 缺少发件人 ${sender}`).toContain(sender)
      }
    })
  }
})
