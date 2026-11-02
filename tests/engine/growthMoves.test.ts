import { describe, expect, it } from 'vitest'
import {
  ATTR_KEYS,
  investMoveCost,
  moveById,
  moveLevelOf,
  overall,
  positionGroup,
  round1,
} from '../../src/domain'
import type { Player, WorldState } from '../../src/domain'
import { investMove } from '../../src/engine/growth'
import { optionsFor } from '../../src/engine/data/keyMomentOptions'
import { freshWorld } from '../fixtures/growth'

/** 把主角调成一个可控样本：位置、综合分与余额各测各的，不受生成时的随机属性影响。 */
function draft(seed = 2026): { world: WorldState; user: Player } {
  const world = freshWorld(seed)
  const user = world.players[world.playerId]
  user.position = 'CM'
  user.moves = []
  for (const key of ATTR_KEYS) user.attributes[key] = 30
  user.potential = 96
  return { world, user }
}

function setLevel(user: Player, value: number): Player {
  for (const key of ATTR_KEYS) user.attributes[key] = value
  return user
}

function roundOption(user: Player) {
  const found = optionsFor('oneOnOne', { player: user, isHome: true }).find((o) => o.id === 'round')
  if (!found) throw new Error('选项不存在：oneOnOne:round')
  return found
}

const rainbow = moveById('mv_rainbow')
const doorFrame = moveById('mv_door_frame')
if (!rainbow || !doorFrame) throw new Error('绝技数据缺少测试用的 id')

describe('花经验解锁绝技', () => {
  it('第一次花经验把绝技从不会练到 Ⅰ 级，扣的就是这一档的价格', () => {
    const { world, user } = draft()
    setLevel(user, 80)
    user.exp = 500

    const outcome = investMove(world, 'mv_rainbow')

    expect(outcome.ok).toBe(true)
    expect(user.moves).toEqual([{ moveId: 'mv_rainbow', level: 1, progress: 0 }])
    expect(outcome.cost).toBe(rainbow.levels[0].costExp)
    expect(user.exp).toBe(500 - rainbow.levels[0].costExp)
    expect(moveLevelOf(user, 'mv_rainbow')).toBe(1)
  })

  it('解锁后关键回合的概率立刻把这一档算进去，依据行写出绝技名', () => {
    const { world, user } = draft()
    // 取门槛线的 60：属性再高就顶到选项上界，看不出绝技带来的那 2.8%。
    setLevel(user, 60)
    user.exp = 500
    const before = roundOption(user)

    investMove(world, 'mv_rainbow')
    const after = roundOption(user)

    expect(after.successChance).toBeGreaterThan(before.successChance)
    expect(after.successBasisZh).toContain(
      `彩虹过人 Ⅰ +${round1(rainbow.levels[0].chanceDelta * 100)}%`,
    )
  })

  it('解锁与升级各写一条当日新闻，标题用的是新等级', () => {
    const { world, user } = draft()
    setLevel(user, 92)
    const news = world.news.length

    user.exp = 500
    investMove(world, 'mv_rainbow')
    user.exp = 500
    investMove(world, 'mv_rainbow')

    expect(world.news.length).toBe(news + 2)
    expect(world.news[1].title).toBe('学会彩虹过人')
    expect(world.news[0].title).toBe('彩虹过人 练到 Ⅱ 级')
    expect(world.news[0].day).toBe(world.day)
  })
})

describe('绝技解锁的拒绝分支', () => {
  it('综合分没到门槛时整笔拒绝，经验一分不少', () => {
    const { world, user } = draft()
    setLevel(user, 40)
    user.exp = 500

    const outcome = investMove(world, 'mv_rainbow')

    expect(overall(user)).toBeLessThan(rainbow.levels[0].minOverall)
    expect(outcome.reason).toBe('overLevel')
    expect(user.exp).toBe(500)
    expect(user.moves).toEqual([])
  })

  it('经验不够时拒绝，绝技账本保持空的', () => {
    const { world, user } = draft()
    setLevel(user, 80)
    user.exp = rainbow.levels[0].costExp - 1

    const outcome = investMove(world, 'mv_rainbow')

    expect(outcome.reason).toBe('notEnoughExp')
    expect(user.exp).toBe(rainbow.levels[0].costExp - 1)
    expect(user.moves).toEqual([])
  })

  it('不存在的绝技 id 与比赛进行中都不给解锁', () => {
    const { world, user } = draft()
    setLevel(user, 92)
    user.exp = 500

    expect(investMove(world, 'mv_not_a_move').reason).toBe('unknownMove')

    world.pendingDayPlan = { training: 'technical', extra: 'none', fixtureId: null }
    const live = investMove(world, 'mv_rainbow')

    expect(live.ok).toBe(false)
    expect(live.reason).toBe('matchLive')
    expect(user.moves).toEqual([])
  })
})

describe('绝技的升级、上限与位置闸门', () => {
  it('升级到 Ⅱ 级要更贵的经验，概率条目也跟着变大', () => {
    const { world, user } = draft()
    setLevel(user, 80)
    user.exp = 500
    investMove(world, 'mv_rainbow')

    user.exp = 500
    const second = investMove(world, 'mv_rainbow')

    expect(second.ok).toBe(true)
    expect(second.level).toBe(2)
    expect(second.cost).toBe(rainbow.levels[1].costExp)
    expect(second.cost).toBeGreaterThan(investMoveCost(rainbow, 0) ?? 0)
    expect(user.exp).toBe(500 - rainbow.levels[1].costExp)
    expect(moveLevelOf(user, 'mv_rainbow')).toBe(2)
  })

  it('满级之后再投被拒，价格查询给 null 让界面换成「已练到尽头」', () => {
    const { world, user } = draft()
    setLevel(user, 92)
    for (const level of [1, 2, 3]) {
      user.exp = 500
      expect(investMove(world, 'mv_rainbow').ok).toBe(true)
      expect(moveLevelOf(user, 'mv_rainbow')).toBe(level)
    }
    expect(investMoveCost(rainbow, 3)).toBeNull()

    user.exp = 500
    const again = investMove(world, 'mv_rainbow')

    expect(again.reason).toBe('maxed')
    expect(again.level).toBe(3)
    expect(user.exp).toBe(500)
  })

  it('位置不符的绝技被拒，练了也不会出现在可用列表里', () => {
    const { world, user } = draft()
    setLevel(user, 92)
    user.exp = 500
    expect(positionGroup(user.position)).not.toContain('GK')

    const outcome = investMove(world, 'mv_door_frame')

    expect(outcome.reason).toBe('wrongPosition')
    expect(user.moves).toEqual([])
  })
})
