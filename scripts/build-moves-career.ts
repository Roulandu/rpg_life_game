/**
 * 职责：造一份「有真进度」的 v12 存档夹具，让绝技四条获取路径在一份可导入的存档里同时留痕。
 * 边界：只用生成时的默认属性与引擎公开入口（整周推进、investMove、名宿事件结算），不直接改 player.moves。
 * 依赖：src/world 生成器、src/engine 的推进与投资口、src/db 的导出口；输出物进 git 由 tests/db 的用例守住。
 */
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  DEFAULT_WEEK_PLAN,
  allMoves,
  eventTemplatesOfPack,
  investMoveCost,
  moveById,
  moveFitsPosition,
  moveLevelGatePassed,
  moveLevelOf,
  overall,
} from '../src/domain'
import type { CareerCreateOptions, GameEvent, MoveDefinition, WorldState } from '../src/domain'
import { exportWorld } from '../src/db/repository'
import { resolveEvent } from '../src/engine/events'
import { investMove } from '../src/engine/growth'
import { advanceWeeks } from '../src/engine/turn'
import { generateWorld } from '../src/world/generator'
import { repoRoot } from './quality/lib/manifest'

const TEST_NOW = '2026-08-01T00:00:00.000Z'
const SEED = 2026
const OUTPUT = 'tests/fixtures/career-with-moves.v12.json'

function careerOptions(): CareerCreateOptions {
  return {
    name: '绿茵夹具',
    nationality: '中国',
    age: 17,
    position: 'CM',
    archetype: 'technician',
    background: 'academy',
    clubId: 'club:ENG:2:04',
    seed: SEED,
  }
}

function userOf(world: WorldState) {
  return world.players[world.playerId]
}

/** 这个位置门槛最低、又允许特训的绝技：整季把周计划槽位对准它。 */
function easiestSpecializationMove(user: WorldState['players'][string]): MoveDefinition {
  const move = allMoves()
    .filter((item) => item.unlock.via.includes('specialization') && moveFitsPosition(item, user.position))
    .sort((a, b) => a.levels[0].minOverall - b.levels[0].minOverall)[0]
  if (!move) throw new Error('这个位置没有可特训的绝技')
  return move
}

/** 整季自然攒下的经验买得起、且综合分够得到的最便宜几档：逐个投一次经验。 */
function buyableMoves(world: WorldState, limit: number): MoveDefinition[] {
  const user = userOf(world)
  return allMoves()
    .filter((move) => moveFitsPosition(move, user.position) && moveLevelGatePassed(move, user))
    .map((move) => ({ move, cost: investMoveCost(move, moveLevelOf(user, move.id)) ?? Number.POSITIVE_INFINITY }))
    .filter((item) => item.cost <= user.exp)
    .sort((a, b) => a.cost - b.cost)
    .slice(0, limit)
    .map((item) => item.move)
}

/** 名宿包里这堂课教的绝技，当前综合分够得到 Ⅰ 级门槛。 */
function reachableMentorLesson(world: WorldState): { templateId: string; choiceId: string; moveId: string } | null {
  const user = userOf(world)
  for (const template of eventTemplatesOfPack('mentor')) {
    for (const choice of template.choices) {
      for (const effect of choice.effects) {
        if (effect.op !== 'learnMove' || !effect.moveId) continue
        const move = moveById(effect.moveId)
        if (!move || !moveFitsPosition(move, user.position)) continue
        if (moveLevelOf(user, move.id) > 0) continue
        if (overall(user) < move.levels[0].minOverall) continue
        return { templateId: template.id, choiceId: choice.id, moveId: move.id }
      }
    }
  }
  return null
}

/** 把数据包里的模板挂成一份待处理事件，走真实的事件结算口。 */
function mountMentorEvent(world: WorldState, templateId: string, eventId: string): GameEvent {
  const template = eventTemplatesOfPack('mentor').find((item) => item.id === templateId)
  if (!template) throw new Error(`名宿事件包缺少模板：${templateId}`)
  const event: GameEvent = {
    id: eventId,
    templateId: template.id,
    title: template.title,
    body: template.body,
    sender: template.sender,
    season: world.season,
    week: world.week,
    day: world.day,
    createdAtWeek: world.week,
    expiresWeek: world.week,
    status: 'open',
    choices: template.choices,
    source: 'template',
  }
  world.events[eventId] = event
  return event
}

function buildCareer(): WorldState {
  const start = generateWorld(careerOptions(), TEST_NOW)
  const target = easiestSpecializationMove(userOf(start))
  const plan = { ...DEFAULT_WEEK_PLAN, specialization: target.id }

  // 整季把特训槽对准同一条绝技，比赛掉落与日常事件在同一次推进里自然发生
  const world = advanceWeeks(start, plan, 38).at(-1)!.world

  for (const move of buyableMoves(world, 2)) {
    const outcome = investMove(world, move.id)
    if (!outcome.ok) throw new Error(`经验投资绝技失败：${move.id}/${outcome.reason}`)
  }

  const lesson = reachableMentorLesson(world)
  if (lesson) {
    mountMentorEvent(world, lesson.templateId, 'event:mentor:fixture')
    resolveEvent(world, 'event:mentor:fixture', lesson.choiceId)
  }
  return world
}

function main(): void {
  const outIndex = process.argv.indexOf('--out')
  const out = resolve(repoRoot, outIndex >= 0 ? process.argv[outIndex + 1] : OUTPUT)
  const world = buildCareer()
  const user = userOf(world)
  writeFileSync(out, `${exportWorld(world)}\n`, 'utf8')

  console.log(
    `夹具存档写出：${out}\n  version=${world.version} engineVersion=${world.engineVersion} season=${world.season} week=${world.week}`,
  )
  console.log(`  综合分=${overall(user).toFixed(1)} 经验余额=${user.exp} 绝技=${(user.moves ?? []).length} 条`)
  for (const record of user.moves ?? []) {
    const move = moveById(record.moveId)
    console.log(
      `  ${record.moveId} ${move?.nameZh ?? '?'} ${record.level} 级 / 进度 ${record.progress}（路径：${move?.unlock.via.join('、') ?? '?'}）`,
    )
  }
  if (!reachableMentorLesson(world)) console.log('  名宿路径：本次没有够得到门槛的名宿课（存档里仍留有点拨进度）')
}

main()
