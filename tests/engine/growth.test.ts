import { describe, expect, it } from 'vitest'
import { INVEST_FIRST_COST } from '../../src/domain'
import type { TrainingFocus } from '../../src/domain'
import { applyEffects } from '../../src/engine/effects'
import { grantExp, investAttribute, ratingToExp } from '../../src/engine/growth'
import { updateUserAfterMatch } from '../../src/engine/matchUser'
import { applyDailyTraining } from '../../src/engine/training'
import { createRng } from '../../src/lib'
import { freshWorld, keyAttrOf, tune } from '../fixtures/growth'

describe('训练课发放经验', () => {
  it('训练课每次给 2 点经验，恢复课给 1 点，且累计经验同步增长', () => {
    const focusExp: Record<TrainingFocus, number> = { physical: 2, technical: 2, tactical: 2, recovery: 1 }
    for (const focus of ['physical', 'technical', 'tactical', 'recovery'] as TrainingFocus[]) {
      const world = freshWorld()
      const user = tune(world, { exp: 0, lifetimeExp: 0 })
      applyDailyTraining(world, focus)
      expect(user.exp).toBe(focusExp[focus])
      expect(user.lifetimeExp).toBe(focusExp[focus])
    }
  })

  it('伤停期间合练不产出经验', () => {
    const world = freshWorld()
    const user = tune(world, { exp: 0, lifetimeExp: 0 })
    user.injury = { kind: '脚踝扭伤', daysLeft: 10, severity: 2 }
    applyDailyTraining(world, 'technical')
    expect(user.exp).toBe(0)
    expect(user.lifetimeExp).toBe(0)
  })
})

describe('经验播报与余额', () => {
  it('首次攒够第一笔可投资经验时播报一条当日新闻，投过一次之后不再重复', () => {
    const world = freshWorld()
    const user = tune(world, { exp: 0, lifetimeExp: 0 })
    const news = world.news.length

    grantExp(world, INVEST_FIRST_COST - 1, 'training')
    expect(world.news.length).toBe(news)

    grantExp(world, 1, 'training')
    expect(user.exp).toBe(INVEST_FIRST_COST)
    expect(world.news.length).toBe(news + 1)
    expect(world.news[0]!.day).toBe(world.day)

    investAttribute(world, keyAttrOf(user), 1)
    grantExp(world, 1, 'training')
    grantExp(world, 20, 'training')
    expect(world.news.length).toBe(news + 1)
  })

  it('非正值不写新闻也不改经验', () => {
    const world = freshWorld()
    const user = tune(world, { exp: 3, lifetimeExp: 3 })
    expect(grantExp(world, 0, 'match')).toBe(0)
    expect(grantExp(world, -5, 'event')).toBe(0)
    expect(user.exp).toBe(3)
    expect(user.lifetimeExp).toBe(3)
  })

  it('同一天的多次发经验合并进余额，播报只有一条', () => {
    const world = freshWorld()
    const user = tune(world, { exp: 0, lifetimeExp: 0 })
    grantExp(world, 4, 'training')
    grantExp(world, 3, 'specialization')
    expect(user.exp).toBe(7)
    const news = world.news.filter((item) => item.id.startsWith('news:exp'))
    expect(news).toHaveLength(1)
    expect(news[0]!.body).toContain('7 点')
  })
})

describe('比赛与事件的经验来源', () => {
  it('按评分与出场时间换算，进球与助攻另计，差评与未出场截到 0', () => {
    expect(ratingToExp({ rating: 7, minutes: 90, goals: 0, assists: 0 })).toBe(4)
    expect(ratingToExp({ rating: 6, minutes: 90, goals: 0, assists: 0 })).toBe(0)
    expect(ratingToExp({ rating: null, minutes: 90, goals: 2, assists: 1 })).toBe(0)
    expect(ratingToExp({ rating: 8, minutes: 45, goals: 1, assists: 1 })).toBe(20)
    expect(ratingToExp({ rating: 7.5, minutes: 20, goals: 1, assists: 0 })).toBe(8)
  })

  it('赛后结算把经验写进主角，未出场不发经验', () => {
    const world = freshWorld()
    const user = tune(world, { exp: 0, lifetimeExp: 0 })
    const rng = createRng(world.seed, 'test:exp')

    updateUserAfterMatch({
      world,
      user,
      rating: 8.4,
      goals: 1,
      assists: 0,
      goalsFor: 2,
      goalsAgainst: 1,
      played: true,
      minutes: 90,
      rng,
    })
    expect(user.exp).toBe(25)
    expect(user.lifetimeExp).toBe(25)

    user.exp = 0
    user.lifetimeExp = 0
    updateUserAfterMatch({
      world,
      user,
      rating: null,
      goals: 0,
      assists: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      played: false,
      minutes: 0,
      rng,
    })
    expect(user.exp).toBe(0)
    expect(user.lifetimeExp).toBe(0)
  })

  it('op 为 exp 的事件效果走同一个 grantExp 入口，负值不倒扣', () => {
    const world = freshWorld()
    const user = tune(world, { exp: 0, lifetimeExp: 0 })
    applyEffects(world, [{ op: 'exp', delta: 5 }], '名宿指点和训练')
    expect(user.exp).toBe(5)
    expect(user.lifetimeExp).toBe(5)

    applyEffects(world, [{ op: 'exp', delta: -3 }], '处罚')
    expect(user.exp).toBe(5)
  })
})
