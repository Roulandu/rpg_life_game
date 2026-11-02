import { describe, expect, it } from 'vitest'
import {
  ATTR_KEYS,
  DEFAULT_WEEK_PLAN,
  MOVE_MAX_LEVEL,
  MOVE_POSITION_GROUPS,
  MOVE_PROGRESS_PER_LEVEL,
  allMoves,
  moveById,
  moveFitsPosition,
  movesTargeting,
} from '../../src/domain'
import type {
  KeyMoment,
  KeyMomentKind,
  MatchReport,
  MoveDefinition,
  MovePositionGroup,
  Player,
  Position,
  WorldState,
} from '../../src/domain'
import { grantMoveDrops, MOVE_DROP_MIN_RATING } from '../../src/engine/moveDrops'
import { advanceWeek } from '../../src/engine/turn'
import { freshWorld } from '../fixtures/growth'

/**
 * 职责：验证第四条绝技获取路径——比赛表现掉落。只有评分够高的一场比赛里踢成功的关键回合，
 * 才会给命中该选项、且允许比赛掉落的绝技攒 1 点进度。
 * 边界：位置闸门、失败回合、低评分、满级都不发进度；同一 (fixtureId, momentId) 的抽取必须可回放。
 * 依赖：src/engine/moveDrops.ts、src/engine/moveProgress.ts 与 src/domain 的绝技索引。
 */
const GROUP_POSITION: Record<MovePositionGroup, Position> = { GK: 'GK', DEF: 'CB', MID: 'CM', FWD: 'ST' }

/** 一条真把比赛掉落列为获取路径的绝技，连带它的第一条目标。 */
function dropMove(): { move: MoveDefinition; kind: KeyMomentKind; optionId: string } {
  const move = allMoves().find((item) => item.unlock.via.includes('matchDrop'))
  if (!move) throw new Error('绝技数据里没有可掉落的绝技')
  const [kind, optionId] = move.targets[0].split(':')
  return { move, kind: kind as KeyMomentKind, optionId: optionId ?? '' }
}

/** 故意站在该绝技吃不到的位置组上，用来验证位置闸门。 */
function outsiderPosition(move: MoveDefinition): Position {
  const group = MOVE_POSITION_GROUPS.find((item) => !move.positions.includes(item))
  if (!group) throw new Error('这条绝技所有位置组都能练，测不出位置闸门')
  return GROUP_POSITION[group]
}

function draft(overrides: Partial<Player> = {}, seed = 2026): { world: WorldState; user: Player } {
  const { move } = dropMove()
  const world = freshWorld(seed)
  const user = world.players[world.playerId]
  user.position = GROUP_POSITION[move.positions[0]]
  user.moves = []
  for (const key of ATTR_KEYS) user.attributes[key] = 96
  user.injury = null
  Object.assign(user, overrides)
  return { world, user }
}

function momentOf(input: { move: MoveDefinition; kind: KeyMomentKind; optionId: string }, id: string, success: boolean): KeyMoment {
  return {
    id,
    minute: 63,
    kind: input.kind,
    titleZh: '单刀',
    promptZh: '怎么处理',
    options: [],
    defaultOptionId: input.optionId,
    roll: 0.5,
    outcome: {
      optionId: input.optionId,
      success,
      textZh: '成功了',
      ratingDelta: 0.5,
      moraleDelta: 0,
      coachDelta: 0,
      goal: false,
      assist: false,
    },
  }
}

function reportWith(rating: number | null, moments: KeyMoment[]): MatchReport {
  return {
    fixtureId: 'fx_test_1',
    season: 2026,
    week: 5,
    status: 'final',
    userPlayed: true,
    userRating: rating,
    keyMoments: moments,
  } as unknown as MatchReport
}

function totalProgress(user: Player): number {
  return (user.moves ?? []).reduce((sum, item) => sum + item.progress, 0)
}

/** 该回合真的能掉下来的绝技清单：选项命中 + 允许比赛掉落 + 位置对得上。 */
function dropCandidates(user: Player, input: { kind: KeyMomentKind; optionId: string }): MoveDefinition[] {
  return movesTargeting(input.kind, input.optionId).filter(
    (move) => move.unlock.via.includes('matchDrop') && moveFitsPosition(move, user.position),
  )
}

describe('比赛表现掉落的发放', () => {
  it('高评分加成功回合给命中的绝技攒 1 点进度', () => {
    const input = dropMove()
    const { world, user } = draft()

    grantMoveDrops(world, reportWith(MOVE_DROP_MIN_RATING, [momentOf(input, 'km_1', true)]))

    const [record] = user.moves ?? []
    expect(record?.level).toBe(0)
    expect(record?.progress).toBe(1)
    const picked = moveById(record?.moveId ?? '')
    expect(picked?.unlock.via).toContain('matchDrop')
    expect(picked?.targets).toContain(`${input.kind}:${input.optionId}`)
  })

  it('评分没过门槛时一点进度都不给', () => {
    const input = dropMove()
    const { world, user } = draft()

    grantMoveDrops(world, reportWith(MOVE_DROP_MIN_RATING - 0.1, [momentOf(input, 'km_1', true)]))

    expect(user.moves).toEqual([])
  })

  it('回合踢失败不给进度，没未出场也不给', () => {
    const input = dropMove()
    const failed = draft()
    grantMoveDrops(failed.world, reportWith(9, [momentOf(input, 'km_1', false)]))
    expect(failed.user.moves).toEqual([])

    const played = draft()
    grantMoveDrops(played.world, { ...reportWith(9, [momentOf(input, 'km_1', true)]), userPlayed: false })
    expect(played.user.moves).toEqual([])
  })

  it('每个成功回合各攒 1 点：两个成功回合给 2 点', () => {
    const input = dropMove()
    const { world, user } = draft()

    grantMoveDrops(world, reportWith(8.6, [momentOf(input, 'km_1', true), momentOf(input, 'km_2', true)]))

    expect(totalProgress(user)).toBe(2)
  })
})

describe('比赛表现掉落的闸门', () => {
  it('位置不符的绝技不会掉', () => {
    const input = dropMove()
    const { world, user } = draft()
    user.position = outsiderPosition(input.move)

    grantMoveDrops(world, reportWith(9, [momentOf(input, 'km_1', true)]))

    expect(user.moves).toEqual([])
  })

  it('进度攒满且综合分过门槛时自动升级并写一条新闻', () => {
    const input = dropMove()
    const { world, user } = draft()
    user.moves = dropCandidates(user, input).map((move) => ({
      moveId: move.id,
      level: 1,
      progress: MOVE_PROGRESS_PER_LEVEL - 1,
    }))

    grantMoveDrops(world, reportWith(9, [momentOf(input, 'km_1', true)]))

    expect(user.moves.some((item) => item.level === 2)).toBe(true)
    expect(user.moves.some((item) => item.level === 2 && item.progress === 0)).toBe(true)
    expect(world.news[0]?.title).toMatch(/练到|学会/)
  })

  it('满级绝技不再攒进度', () => {
    const input = dropMove()
    const { world, user } = draft()
    user.moves = dropCandidates(user, input).map((move) => ({
      moveId: move.id,
      level: MOVE_MAX_LEVEL,
      progress: 0,
    }))

    grantMoveDrops(world, reportWith(9, [momentOf(input, 'km_1', true)]))

    expect(totalProgress(user)).toBe(0)
  })

  it('同一场比赛重放给出同样的绝技与进度', () => {
    const input = dropMove()
    const first = draft()
    const second = draft()
    const report = reportWith(9, [momentOf(input, 'km_1', true), momentOf(input, 'km_2', true)])

    grantMoveDrops(first.world, report)
    grantMoveDrops(second.world, report)

    expect(first.user.moves).toEqual(second.user.moves)
    expect(totalProgress(first.user)).toBe(2)
    for (const item of first.user.moves ?? []) {
      expect(movesTargeting(input.kind, input.optionId).some((move) => move.id === item.moveId)).toBe(true)
    }
  })
})

describe('掉落接进比赛结算', () => {
  it('连着踢 12 周，高评分的比赛真的会掉下绝技进度', () => {
    const { world } = draft()
    let current = world
    for (let week = 0; week < 12; week += 1) current = advanceWeek(current, DEFAULT_WEEK_PLAN).world

    const user = current.players[current.playerId]

    expect((user.moves ?? []).length).toBeGreaterThan(0)
    expect(totalProgress(user) + (user.moves ?? []).filter((item) => item.level > 0).length).toBeGreaterThan(0)
  })
})
