import type { GameEvent, WorldState } from '../../src/domain/types'
import { advanceDay } from '../../src/engine'
import { generateWorld } from '../../src/world/generator'
import { TEST_NOW, testOptions } from './career'

/**
 * v6 存档的形状：事件只有周字段，世界没有冷却表。
 * 先跑出现代存档，再把日维度抹掉，用来验证 v6→v7 迁移能补回来。
 */
type LegacyEvent = GameEvent & {
  day?: number
  createdAtDay?: number
  expiresDay?: number
  blocking?: boolean
  sender?: string
}

/** 老档里那种「只有周」的事件：日序、发件人、拦截性都还没有。 */
function weeklyOnly(id: string, templateId: string, week: number, expiresWeek: number): LegacyEvent {
  return {
    id,
    templateId,
    title: templateId === 'coach_praise' ? '主教练的认可' : '教练谈话',
    body: '教练在场边叫住了你。',
    season: 2026,
    week,
    createdAtWeek: week,
    expiresWeek,
    status: 'open',
    choices: [
      { id: 'listen', label: '点头记下', effects: [{ op: 'morale', delta: 2 }] },
      { id: 'shrug', label: '不置可否', effects: [{ op: 'confidence', delta: 1 }] },
    ],
    source: 'template',
  }
}

function asV6(world: WorldState): WorldState {
  const legacy = world as WorldState & { eventMemory?: Record<string, number> }
  legacy.version = 6
  // WorldState 里 eventMemory 是必填，删它要先站到一个「可缺省」的形状上。
  delete (legacy as { eventMemory?: Record<string, number> }).eventMemory
  for (const event of Object.values(legacy.events) as LegacyEvent[]) {
    delete event.day
    delete event.createdAtDay
    delete event.expiresDay
    delete event.blocking
    delete event.sender
  }
  return legacy
}

/** 造一份 v6 存档：推进若干天留下战报与新闻，再补两条老式周事件。 */
export function v6World(seed = 2026, days = 0): WorldState {
  let world = generateWorld(testOptions({ seed }), TEST_NOW)
  for (let index = 0; index < days; index += 1) world = advanceDay(world).world
  world.events['event:2026:6:coach_praise'] = weeklyOnly(
    'event:2026:6:coach_praise',
    'coach_praise',
    world.week,
    world.week + 2,
  )
  world.events['event:2026:6:custom_talk'] = weeklyOnly(
    'event:2026:6:custom_talk',
    'legacy:coach_talk',
    world.week,
    world.week + 1,
  )
  return asV6(world)
}

/** 时钟停在周日、当天已有一条未处理事件的 v6 存档。 */
export function v6BusySundayWorld(seed = 2026): WorldState {
  const world = v6World(seed)
  world.day = 7
  return world
}
