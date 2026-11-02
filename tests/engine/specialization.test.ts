import { describe, expect, it } from 'vitest'
import {
  ATTR_KEYS,
  MOVE_MAX_LEVEL,
  MOVE_PROGRESS_PER_LEVEL,
  allMoves,
  moveById,
  moveLevelOf,
  weekDayRoles,
} from '../../src/domain'
import type { MoveDefinition, Player, WorldState } from '../../src/domain'
import { applySpecialization } from '../../src/engine/specialization'
import { advanceDay } from '../../src/engine/day'
import { freshWorld } from '../fixtures/growth'

/**
 * 职责：验证「特训槽」这条绝技获取路径——进度只在该练的那一天涨、只涨给练得动且允许特训的绝技，
 * 攒满一格并跨过综合分门槛时自动升级。
 * 边界：位置闸门与 unlock.via 闸门由 domain 负责，这里只验引擎接进日步进后的行为。
 * 依赖：src/engine/specialization.ts、src/engine/day.ts 的特训日与 src/domain 的特级常量。
 */
function requireMove(id: string): MoveDefinition {
  const move = moveById(id)
  if (!move) throw new Error(`绝技数据缺少测试用的 id：${id}`)
  return move
}

const rainbow = requireMove('mv_rainbow')
const doorFrame = requireMove('mv_door_frame')

/** 一条真的把特训列为获取路径、且中场练得动的绝技。 */
function trainableMove(): MoveDefinition {
  const move = allMoves().find(
    (item) => item.unlock.via.includes('specialization') && item.positions.includes('MID'),
  )
  if (!move) throw new Error('没有可供中场特训的绝技')
  return move
}

/** 一条没把特训列为获取路径的绝技：特训槽不该替它开门。 */
function outsideMove(): MoveDefinition {
  const move = allMoves().find(
    (item) => !item.unlock.via.includes('specialization') && item.positions.includes('MID'),
  )
  if (!move) throw new Error('绝技数据里没有排除特训路径的中场绝技')
  return move
}

interface DraftPatch {
  level?: number
  progress?: number
  injury?: string
}

/** 直接改 world 里那个活对象，特训才看得到账上的进度。 */
function draft(patch: DraftPatch = {}, seed = 2026): { world: WorldState; user: Player } {
  const world = freshWorld(seed)
  const user = world.players[world.playerId]
  user.position = 'CM'
  for (const key of ATTR_KEYS) user.attributes[key] = 80
  user.moves = patch.level ? [{ moveId: rainbow.id, level: patch.level, progress: patch.progress ?? 0 }] : []
  if (patch.injury) user.injury = { kind: patch.injury, daysLeft: 14, severity: 2 }
  world.weekPlan.specialization = null
  return { world, user }
}

function specializationDay(world: WorldState): number {
  return weekDayRoles(Object.values(world.fixtures), world.season, world.week, world.clubId).specializationDay
}

describe('特训槽的日结算', () => {
  it('排了特训槽时，特训课给这条绝技攒 1 点进度并记下经验', () => {
    const { world, user } = draft({ level: 1 })
    world.weekPlan.specialization = rainbow.id
    const expBefore = user.exp

    applySpecialization(world)

    expect(user.moves?.[0].progress).toBe(1)
    expect(user.exp).toBe(expBefore + 1)
  })

  it('没排特训槽时这一步什么都不发生', () => {
    const { world, user } = draft({ level: 1, progress: 1 })

    applySpecialization(world)

    expect(user.moves?.[0].progress).toBe(1)
    expect(world.news[0]?.title).not.toContain(rainbow.nameZh)
  })

  it('受伤当天不练绝技', () => {
    const { world, user } = draft({ level: 1, injury: '脚踝扭伤' })
    world.weekPlan.specialization = rainbow.id

    applySpecialization(world)

    expect(user.moves?.[0].progress).toBe(0)
  })

  it('进度攒满且综合分过门槛时自动升一级，把进度清零并写一条新闻', () => {
    const { world, user } = draft({ level: 1, progress: MOVE_PROGRESS_PER_LEVEL - 1 })
    world.weekPlan.specialization = rainbow.id

    applySpecialization(world)

    expect(moveLevelOf(user, rainbow.id)).toBe(2)
    expect(user.moves?.[0].progress).toBe(0)
    expect(world.news[0]?.title).toContain('彩虹过人 练到 Ⅱ 级')
  })
})

describe('特训槽的位置与解锁闸门', () => {
  it('位置不符的绝技练了也不涨进度', () => {
    const { world, user } = draft()
    world.weekPlan.specialization = doorFrame.id

    applySpecialization(world)

    expect(user.moves).toEqual([])
  })

  it('还没学会的绝技只有把特训列为获取路径才允许从零攒进度', () => {
    const move = trainableMove()
    const { world, user } = draft()
    world.weekPlan.specialization = move.id

    applySpecialization(world)

    expect(user.moves).toEqual([{ moveId: move.id, level: 0, progress: 1 }])

    const outsider = outsideMove()
    const other = draft()
    other.world.weekPlan.specialization = outsider.id
    applySpecialization(other.world)
    expect(other.user.moves).toEqual([])
  })

  it('进度攒满后从没学会直接升到 1 级，新闻写「学会」', () => {
    const move = trainableMove()
    const { world, user } = draft({ level: 1 })
    user.moves = [{ moveId: move.id, level: 0, progress: MOVE_PROGRESS_PER_LEVEL - 1 }]
    world.weekPlan.specialization = move.id

    applySpecialization(world)

    expect(moveLevelOf(user, move.id)).toBe(1)
    expect(world.news[0]?.title).toBe(`学会${move.nameZh}`)
  })

  it('不存在的绝技 id 与满级都不给进度', () => {
    const ghost = draft()
    ghost.world.weekPlan.specialization = 'mv_not_a_move'
    expect(() => applySpecialization(ghost.world)).not.toThrow()
    expect(ghost.user.moves).toEqual([])

    const { world, user } = draft({ level: MOVE_MAX_LEVEL })
    world.weekPlan.specialization = rainbow.id
    applySpecialization(world)
    expect(user.moves?.[0].progress).toBe(0)
  })
})

describe('特训槽接进日步进', () => {
  it('只有特训日那一天会推进进度', () => {
    const { world } = draft({ level: 1 })
    world.weekPlan.specialization = rainbow.id
    world.day = specializationDay(world)

    const next = advanceDay(world).world
    const progress = next.players[next.playerId].moves?.[0].progress

    expect(progress).toBe(1)
  })

  it('非特训日整天不涨进度', () => {
    const { world } = draft({ level: 1, progress: 2 })
    world.weekPlan.specialization = rainbow.id
    const otherDay = specializationDay(world)
    world.day = otherDay === 7 ? 1 : otherDay + 1

    const next = advanceDay(world).world
    const progress = next.players[next.playerId].moves?.[0].progress

    expect(progress).toBe(2)
  })
})
