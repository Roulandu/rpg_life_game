import { describe, expect, it } from 'vitest'
import {
  ATTR_KEYS,
  MOVE_PROGRESS_PER_LEVEL,
  MOVES,
  eventTemplatesOfPack,
  moveById,
  moveLevelOf,
  overall,
} from '../../src/domain'
import type { Effect, EventTemplateContent, MoveDefinition, Player, WorldState } from '../../src/domain'
import { applyEffects } from '../../src/engine/effects'
import { resolveEvent } from '../../src/engine/events'
import { getRelationshipByRole, relationshipLabel } from '../../src/engine/relationships'
import { freshWorld } from '../fixtures/growth'
import { openMentorLessonEvent } from '../fixtures/mentorLesson'

/**
 * 职责：验证「名宿传授」这条绝技获取路径——事件给出的 learnMove 直接授予等级，moveProgress 只攒进度，
 * 两条都要过位置、路径与综合分门槛三道闸门。
 * 边界：综合分没到 Ⅰ 级门槛时不入库等级，只把进度攒着；已经练到的级数不会被一次点拨降下去。
 * 依赖：src/engine/effects.ts 的新算子、src/engine/moveMentor.ts 的闸门与 src/domain 的绝技索引。
 */
const RAINBOW_ID = 'mv_rainbow'

function requireMove(id: string): MoveDefinition {
  const move = moveById(id)
  if (!move) throw new Error(`绝技数据缺少测试用的 id：${id}`)
  return move
}

/** 一条没把名宿传授列为获取路径、但中场用得上的绝技。 */
function outsideMove(): MoveDefinition {
  const move = MOVES.find(
    (item) => !item.unlock.via.includes('mentor') && item.positions.includes('MID'),
  )
  if (!move) throw new Error('绝技数据里没有排除名宿路径的中场绝技')
  return move
}

interface DraftPatch {
  level?: number
  progress?: number
  position?: Player['position']
  attr?: number
}

/** 直接把 world 里那个活对象调成可控样本：位置、综合分与已有绝技记录都由用例决定。 */
function draft(patch: DraftPatch = {}, seed = 2026): { world: WorldState; user: Player } {
  const world = freshWorld(seed)
  const user = world.players[world.playerId]
  user.position = patch.position ?? 'CM'
  for (const key of ATTR_KEYS) user.attributes[key] = patch.attr ?? 80
  user.moves =
    patch.level === undefined
      ? []
      : [{ moveId: RAINBOW_ID, level: patch.level, progress: patch.progress ?? 0 }]
  return { world, user }
}

function progressOf(user: Player, moveId: string): number {
  return user.moves?.find((item) => item.moveId === moveId)?.progress ?? -1
}

/** 绝技类效果算子：learnMove 授予等级，moveProgress 攒进度。 */
function isMoveEffect(effect: Effect): boolean {
  return effect.op === 'learnMove' || effect.op === 'moveProgress'
}

function moveEffectsOf(template: EventTemplateContent): Effect[] {
  return template.choices.flatMap((choice) => choice.effects.filter(isMoveEffect))
}

describe('名宿授予绝技等级', () => {
  it('综合分够到 Ⅰ 级门槛时直接入门并播报名字', () => {
    const { world, user } = draft()

    applyEffects(world, [{ op: 'learnMove', delta: 1, moveId: RAINBOW_ID }], '名宿的一课')

    expect(moveLevelOf(user, RAINBOW_ID)).toBe(1)
    expect(progressOf(user, RAINBOW_ID)).toBe(0)
    expect(world.news.some((item) => item.title === `学会${requireMove(RAINBOW_ID).nameZh}`)).toBe(true)
  })

  it('一次点拨跳几级就要求几级的综合分门槛', () => {
    const move = requireMove(RAINBOW_ID)
    const { world, user } = draft()
    const tiers = move.levels.filter((level) => overall(user) >= level.minOverall).length

    applyEffects(world, [{ op: 'learnMove', delta: 3, moveId: move.id }], '名宿的一课')

    expect(moveLevelOf(user, move.id)).toBe(Math.min(3, Math.max(1, tiers)))
  })

  it('还接不住这课时不入库等级，只把修炼进度攒着', () => {
    const { world, user } = draft({ attr: 30 })

    applyEffects(world, [{ op: 'learnMove', delta: 1, moveId: RAINBOW_ID }], '名宿的一课')

    expect(moveLevelOf(user, RAINBOW_ID)).toBe(0)
    expect(progressOf(user, RAINBOW_ID)).toBe(1)
    expect(world.news.some((item) => item.id.includes('mentor'))).toBe(false)
  })

  it('已经练到更高的级数时，点拨只补进度不会降级', () => {
    const { world, user } = draft({ level: 2 })

    applyEffects(world, [{ op: 'learnMove', delta: 1, moveId: RAINBOW_ID }], '名宿的一课')

    expect(moveLevelOf(user, RAINBOW_ID)).toBe(2)
    expect(progressOf(user, RAINBOW_ID)).toBe(1)
  })

  it('满级的绝技再被点拨也不会继续攒进度', () => {
    const move = requireMove(RAINBOW_ID)
    const { world, user } = draft({ level: move.levels.length, progress: 3 })

    applyEffects(world, [{ op: 'moveProgress', delta: 2, moveId: move.id }], '名宿的一课')

    expect(progressOf(user, move.id)).toBe(3)
  })
})

describe('名宿路径的位置与路径闸门', () => {
  it('位置对不上的绝技，名宿点了也没用', () => {
    const { world, user } = draft({ position: 'GK' })

    applyEffects(world, [{ op: 'learnMove', delta: 1, moveId: RAINBOW_ID }], '门将的课')

    expect(user.moves ?? []).toEqual([])
    expect(world.news.some((item) => item.title.includes('彩虹过人'))).toBe(false)
  })

  it('没声明名宿获取路径的绝技不会被事件开门', () => {
    const outside = outsideMove()
    const { world, user } = draft()

    applyEffects(world, [{ op: 'learnMove', delta: 1, moveId: outside.id }], '越界的课')
    applyEffects(world, [{ op: 'moveProgress', delta: 2, moveId: outside.id }], '越界的课')

    expect(user.moves ?? []).toEqual([])
  })
})

describe('名宿点拨攒修炼进度', () => {
  it('moveProgress 攒满一格时把 0 级练成 Ⅰ 级并按名宿口径播报', () => {
    const { world, user } = draft({ level: 0, progress: MOVE_PROGRESS_PER_LEVEL - 1 })

    applyEffects(world, [{ op: 'moveProgress', delta: 1, moveId: RAINBOW_ID }], '名宿的一课')

    expect(moveLevelOf(user, RAINBOW_ID)).toBe(1)
    expect(progressOf(user, RAINBOW_ID)).toBe(0)
    const news = world.news.find((item) => item.id.includes('mentor'))
    expect(news?.title).toBe(`学会${requireMove(RAINBOW_ID).nameZh}`)
    expect(news?.body).toContain('名宿')
  })

  it('同一份种子给同样的效果，档案与播报都一致', () => {
    const first = draft({}, 4242)
    const second = draft({}, 4242)

    applyEffects(first.world, [{ op: 'moveProgress', delta: 2, moveId: RAINBOW_ID }], '同一课')
    applyEffects(second.world, [{ op: 'moveProgress', delta: 2, moveId: RAINBOW_ID }], '同一课')

    expect(first.user.moves).toEqual(second.user.moves)
    expect(first.world.news.map((item) => item.id)).toEqual(second.world.news.map((item) => item.id))
  })

  it('名宿的信任由 legendTrust 效果调整', () => {
    const { world } = draft()
    const legend = getRelationshipByRole(world, 'legend')

    expect(legend?.role).toBe('legend')
    expect(relationshipLabel('legend')).toBe('名宿')
    const before = legend?.trust ?? 0

    applyEffects(world, [{ op: 'legendTrust', delta: 6 }], '课后道谢')

    expect(getRelationshipByRole(world, 'legend')?.trust).toBe(before + 6)
  })
})

describe('名宿事件包', () => {
  it('mentor 包每条模板都真的发得出绝技效果', () => {
    const pack = eventTemplatesOfPack('mentor')
    expect(pack.length).toBeGreaterThanOrEqual(8)
    for (const template of pack) {
      expect(template.id.startsWith('mt_'), template.id).toBe(true)
      expect(template.sender, template.id).toBe('名宿')
      const granted = moveEffectsOf(template)
      expect(granted.length, `${template.id} 没有绝技选项`).toBeGreaterThan(0)
      for (const effect of granted) {
        const move = moveById(effect.moveId ?? '')
        expect(move, `${template.id} 的绝技不存在`).toBeTruthy()
        expect(move!.unlock.via, `${template.id} 的绝技没开门`).toContain('mentor')
      }
    }
  })

  it('主页上接受名宿的一课后，绝技进了球员档案', () => {
    const { world, user } = draft()
    const lesson = openMentorLessonEvent(world, RAINBOW_ID, 'event:mentor:learn')

    resolveEvent(world, lesson.eventId, lesson.choiceId)

    expect(moveLevelOf(user, RAINBOW_ID)).toBeGreaterThanOrEqual(1)
    expect(world.news.some((item) => item.title.includes('彩虹过人'))).toBe(true)
  })
})
