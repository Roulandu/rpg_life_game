import { describe, expect, it } from 'vitest'
import { determineUserSelection, selectionScore } from '../../src/engine/matchUser'
import { dailyGrowth } from '../../src/engine/training'
import { STYLE_LABELS, overall, styleFit } from '../../src/domain'
import type { Club, WorldState } from '../../src/domain/types'
import { createRng } from '../../src/lib'
import { generateWorld } from '../../src/world/generator'
import { TEST_NOW, testOptions } from '../fixtures/career'

const seed = 20260

function worldWithStyle(style: Club['style'], focus: 'technical' | 'physical'): WorldState {
  const world = generateWorld(testOptions({ seed }), TEST_NOW)
  world.clubs[world.clubId].style = style
  world.weekPlan = { ...world.weekPlan, training: focus }
  return world
}

/** 把用户改造成典型的"控球型"球员：传控与技术高，身体与速度平。 */
function toCreator(world: WorldState): void {
  const user = world.players[world.playerId]
  user.attributes.passing = 84
  user.attributes.technique = 82
  user.attributes.dribbling = 78
  user.attributes.mental = 74
  user.attributes.physical = 52
  user.attributes.pace = 58
  user.attributes.defending = 40
  user.attributes.stamina = 68
}

/**
 * 把球员钉在「主力边缘」：属性完全固定，教练风格成为唯一的自变量。
 * 用默认建号跑这条断言不行——那批球员整季都在门槛以下，风格带来的不到 1 分只影响
 * 四十分之一的抽签结果，一发抽签的噪声比信号大，测出来的先后是运气。
 */
function toBorderlineCreator(world: WorldState): void {
  const user = world.players[world.playerId]
  user.attributes.passing = 70
  user.attributes.technique = 68
  user.attributes.dribbling = 64
  user.attributes.mental = 60
  user.attributes.physical = 38
  user.attributes.pace = 44
  user.attributes.defending = 26
  user.attributes.stamina = 54
}

describe('教练风格进入选型与训练', () => {
  it('选型分数把风格契合度算进去，四种风格的得分互不相同', () => {
    const world = worldWithStyle('possession', 'technical')
    toCreator(world)
    const club = world.clubs[world.clubId]
    const user = world.players[world.playerId]
    const squadWithoutUser = 60
    const trust = 55

    const score = selectionScore(club, user, squadWithoutUser, trust)
    const fit = styleFit(user, club.style)

    expect(score).toBeCloseTo(
      (overall(user) - squadWithoutUser) * 2.2 +
        (trust - 50) * 0.22 +
        (user.fitness - 70) * 0.2 +
        (user.form - 50) * 0.12 +
        (user.sharpness - 50) * 0.08 +
        (fit - 0.5) * 4,
    )
    expect(selectionScore({ ...club, style: 'direct' }, user, squadWithoutUser, trust)).toBeLessThan(score)
    expect(STYLE_LABELS[club.style]).toBeTruthy()
  })

  it('训练成长把教练偏好加成算进去', () => {
    const matched = worldWithStyle('possession', 'technical')
    const mismatched = worldWithStyle('direct', 'technical')
    toCreator(matched)
    toCreator(mismatched)

    const user = matched.players[matched.playerId]
    const fitGrowth = dailyGrowth(user, matched.clubs[matched.clubId], 'technical')
    const coldGrowth = dailyGrowth(user, mismatched.clubs[mismatched.clubId], 'technical')

    expect(fitGrowth).toBeGreaterThan(coldGrowth)
    expect(fitGrowth / coldGrowth).toBeCloseTo(1.12)
    expect(dailyGrowth(user, { ...matched.clubs[matched.clubId], style: 'possession' }, 'physical') * 1.12).toBeCloseTo(
      dailyGrowth(user, { ...matched.clubs[matched.clubId], style: 'highPress' }, 'physical'),
    )
  })

  it('换教练真的会改变出场机会：同一批球员在四种打法下首发数不同', () => {
    const styles: Array<Club['style']> = ['possession', 'counter', 'highPress', 'direct']
    const starts: Record<Club['style'], number> = { possession: 0, counter: 0, highPress: 0, direct: 0 }
    const draws = 20

    for (let index = 1; index <= 40; index += 1) {
      const world = generateWorld(testOptions({ seed: index }), TEST_NOW)
      const club = world.clubs[world.clubId]
      toBorderlineCreator(world)
      for (const style of styles) {
        club.style = style
        for (let draw = 0; draw < draws; draw += 1) {
          const rng = createRng(index, 'coach-style', draw, world.week, world.day)
          if (determineUserSelection(world, club, rng).started) starts[style] += 1
        }
      }
    }

    // 技术型中场在控球体系下最吃香，长传冲吊最吃亏。
    expect(starts.possession).toBeGreaterThan(starts.direct)
    expect(new Set(Object.values(starts)).size).toBeGreaterThan(1)
  })
})
