import { describe, expect, it } from 'vitest'
import { displayName } from '../../src/domain'
import { generateWorld } from '../../src/world/generator'
import { TEST_NOW, testOptions } from '../fixtures/career'

/** 需求：比赛与界面里出现的人名一律中文，拉丁原名只留在存档字段里。 */
describe('世界生成补齐中文名', () => {
  const world = generateWorld(testOptions(), TEST_NOW)

  it('每个球员的中文名非空且不含拉丁字母', () => {
    for (const player of Object.values(world.players)) {
      expect(player.nameZh, player.name).not.toBe('')
      expect(/[A-Za-z]/.test(player.nameZh), `${player.name} → ${player.nameZh}`).toBe(false)
    }
  })

  it('主角的显示名是中文', () => {
    const user = world.players[world.playerId]
    expect(displayName(user)).toBe(user.nameZh)
    expect(hasNoLatin(displayName(user))).toBe(true)
  })

  it('每家俱乐部主教练都有中文名', () => {
    for (const club of Object.values(world.clubs)) {
      expect(club.coach.nameZh, club.coach.name).not.toBe('')
      expect(/[A-Za-z]/.test(club.coach.nameZh), club.coach.name).toBe(false)
    }
  })

  it('每段关系对象都有中文名', () => {
    for (const relationship of Object.values(world.relationships)) {
      expect(relationship.nameZh, relationship.name).not.toBe('')
    }
  })

  it('拉丁原名保留在 name 字段，中文名不覆盖它', () => {
    const latin = Object.values(world.players).find((player) => /[A-Za-z]/.test(player.name))
    expect(latin).toBeDefined()
    expect(latin?.name).toMatch(/[A-Za-z]/)
    expect(latin?.nameZh).not.toBe(latin?.name)
  })

  it('同种子两次生成的中文名完全一致（不消耗随机数）', () => {
    const again = generateWorld(testOptions(), TEST_NOW)
    expect(Object.values(again.players).map((player) => `${player.name}\u0000${player.nameZh}`)).toEqual(
      Object.values(world.players).map((player) => `${player.name}\u0000${player.nameZh}`),
    )
  })
})

function hasNoLatin(value: string): boolean {
  return !/[A-Za-z]/.test(value)
}
