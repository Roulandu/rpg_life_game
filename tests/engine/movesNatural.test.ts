import { describe, expect, it } from 'vitest'
import {
  DEFAULT_WEEK_PLAN,
  MOVE_PROGRESS_PER_LEVEL,
  allMoves,
  investMoveCost,
  moveById,
  moveFitsPosition,
  moveLevelGatePassed,
  moveLevelOf,
  overall,
} from '../../src/domain'
import type { MoveDefinition, Player, PlayerMove, WorldState } from '../../src/domain'
import { resolveEvent } from '../../src/engine/events'
import { investMove } from '../../src/engine/growth'
import { advanceWeek, advanceWeeks } from '../../src/engine/turn'
import { freshWorld } from '../fixtures/growth'
import { openMentorLessonEvent } from '../fixtures/mentorLesson'

/**
 * 职责：用生成时的默认属性（不改属性、不注入 moves）证明四条绝技获取路径在真实数值下真的会累积。
 * 边界：掉落要真出场、特训要攒满格且受综合分门槛、名宿课够不到门槛只给进度、经验投资花的是整季自然攒下的经验。
 * 依赖：src/engine/turn 的整季推进、src/engine/growth 的 investMove、src/engine/events 的名宿事件结算。
 */
const SEED = 2026
const NO_PLAY_SEED = 12345
/** 掉落要过 7.8 分评分门槛：这个种子整季有 9 场首发、6 场过线，默认属性也能自然掉出等级。 */
const DROP_SEED = 21

function userOf(world: WorldState): Player {
  return world.players[world.playerId]
}

function season(seed: number, weeks: number, plan = DEFAULT_WEEK_PLAN): WorldState {
  return advanceWeeks(freshWorld(seed), plan, weeks).at(-1)!.world
}

function heldOf(user: Player, moveId: string): PlayerMove | undefined {
  return user.moves?.find((item) => item.moveId === moveId)
}

/** 这条绝技实际的获取路径，用来核对「档案里这条只能从哪来」。 */
function viaOf(moveId: string): string[] {
  return moveById(moveId)?.unlock.via ?? []
}

/** 门槛最低、而且这个位置真能特训的那条绝技：特训槽每周对准它。 */
function easiestSpecializationMove(user: Player): MoveDefinition {
  const move = allMoves()
    .filter((item) => item.unlock.via.includes('specialization') && moveFitsPosition(item, user.position))
    .sort((a, b) => a.levels[0].minOverall - b.levels[0].minOverall)[0]
  if (!move) throw new Error('这个位置没有可特训的绝技')
  return move
}

function countUserPlayedFixtures(world: WorldState): number {
  const clubId = userOf(world).clubId
  return Object.values(world.fixtures).filter(
    (fixture) => (fixture.homeId === clubId || fixture.awayId === clubId) && fixture.report?.userPlayed,
  ).length
}

describe('整季自然推进的比赛掉落', () => {
  it('默认属性连踢一整季，比赛表现自己就把绝技掉进档案', () => {
    // 掉落只认高分出场：换成整季真首发且能过评分门槛的种子，属性仍是生成时那套，不做任何注入。
    const user = userOf(season(DROP_SEED, 38))
    const records = user.moves ?? []

    expect(records.length).toBeGreaterThan(0)
    expect(records.some((item) => item.level >= 1)).toBe(true)
    for (const record of records) {
      expect(viaOf(record.moveId)).toContain('matchDrop')
      expect(record.level >= 1 || record.progress > 0, record.moveId).toBe(true)
    }
  })

  it('整季一次都没被派上场，绝技档案就该是空的', () => {
    const world = season(NO_PLAY_SEED, 38)

    expect(countUserPlayedFixtures(world)).toBe(0)
    expect(userOf(world).moves ?? []).toEqual([])
  })
})

describe('每周特训槽的自然练级', () => {
  it('默认属性把特训槽对准最够得着的一条，十二周自然练到第二级', () => {
    const start = freshWorld(SEED)
    const target = easiestSpecializationMove(userOf(start))
    let current = start
    for (let week = 0; week < 12; week += 1) {
      current = advanceWeek(current, { ...DEFAULT_WEEK_PLAN, specialization: target.id }).world
    }

    const held = heldOf(userOf(current), target.id)
    expect(held?.level).toBeGreaterThanOrEqual(2)
    expect(held?.progress ?? 0).toBeGreaterThan(0)
    expect(current.news.some((item) => item.title.includes('练到'))).toBe(true)
  })

  it('攒满了进度但综合分够不到下一级门槛时，进度攒着不越门槛升级', () => {
    const start = freshWorld(SEED)
    const target = easiestSpecializationMove(userOf(start))
    let current = start
    for (let week = 0; week < 12; week += 1) {
      current = advanceWeek(current, { ...DEFAULT_WEEK_PLAN, specialization: target.id }).world
    }
    const user = userOf(current)
    const held = heldOf(user, target.id)
    const nextGate = target.levels[held?.level ?? 0]?.minOverall

    expect(held?.progress ?? 0).toBeGreaterThanOrEqual(MOVE_PROGRESS_PER_LEVEL)
    expect(nextGate).toBeDefined()
    expect(overall(user)).toBeLessThan(nextGate ?? Number.POSITIVE_INFINITY)
  })
})

describe('名宿点拨与经验投资在自然数值下的口径', () => {
  it('整季自然攒下的经验够买最低门槛的绝技，投资口扣经验并落级', () => {
    const world = season(SEED, 38)
    const user = userOf(world)
    const buyable = allMoves()
      .filter((move) => moveFitsPosition(move, user.position) && moveLevelGatePassed(move, user))
      .map((move) => ({ id: move.id, cost: investMoveCost(move, moveLevelOf(user, move.id)) ?? 0 }))
      .filter((item) => item.cost > 0 && item.cost <= user.exp)
      .sort((a, b) => a.cost - b.cost)[0]
    expect(buyable, '整季攒的经验买不起任何一条够门槛的绝技').toBeTruthy()

    const before = user.exp
    const beforeLifetime = user.lifetimeExp
    const outcome = investMove(world, buyable!.id)

    expect(outcome.ok).toBe(true)
    expect(moveLevelOf(user, buyable!.id)).toBe(1)
    expect(user.exp).toBe(before - buyable!.cost)
    expect(user.lifetimeExp).toBe(beforeLifetime)
  })

  it('默认属性接不住名宿那堂课的等级：只攒修炼进度，不发绝技等级', () => {
    const world = freshWorld(SEED)
    const user = userOf(world)
    const lesson = openMentorLessonEvent(world, 'mv_rainbow')
    const gate = moveById('mv_rainbow')?.levels[0].minOverall ?? 0

    resolveEvent(world, lesson.eventId, lesson.choiceId)

    expect(overall(user)).toBeLessThan(gate)
    expect(moveLevelOf(user, 'mv_rainbow')).toBe(0)
    expect(heldOf(user, 'mv_rainbow')?.progress).toBeGreaterThan(0)
    expect(world.news.some((item) => item.title.includes('彩虹过人'))).toBe(false)
  })
})
