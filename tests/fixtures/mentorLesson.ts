import { eventTemplatesOfPack } from '../../src/domain'
import type { GameEvent, WorldState } from '../../src/domain'

/**
 * 职责：把数据包里的名宿模板挂成一份待处理事件，供绝技名宿路径的多份测试共用同一套挂法。
 * 边界：只从 `mentor` 包里按 moveId 反查模板与选项；找不到就抛错，不让测试靠模板 id 猜内容。
 * 依赖：src/domain 的 `eventTemplatesOfPack` 与 src/domain 的事件类型。
 */
export interface MentorLesson {
  templateId: string
  choiceId: string
}

/** 名宿包里教这条绝技的那一课，以及它对应的选项 id。 */
export function findMentorLesson(moveId: string): MentorLesson {
  const template = eventTemplatesOfPack('mentor').find((item) =>
    item.choices.some((choice) => choice.effects.some((effect) => effect.moveId === moveId)),
  )
  if (!template) throw new Error(`名宿事件包里没有教 ${moveId} 的一课`)
  const choice = template.choices.find((item) => item.effects.some((effect) => effect.moveId === moveId))
  if (!choice) throw new Error(`名宿事件 ${template.id} 的选项里找不到教 ${moveId} 的那一档`)
  return { templateId: template.id, choiceId: choice.id }
}

/** 按模板 id 挂成一个 open 状态的事件，写进 world.events 并返回它。 */
export function mountMentorEvent(world: WorldState, templateId: string, eventId: string): GameEvent {
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

/** 常用组合：按 moveId 找到那一课、挂上事件、给出 resolveEvent 需要的两个 id。 */
export function openMentorLessonEvent(
  world: WorldState,
  moveId: string,
  eventId = 'event:mentor:natural',
): MentorLesson & { eventId: string } {
  const lesson = findMentorLesson(moveId)
  mountMentorEvent(world, lesson.templateId, eventId)
  return { eventId, ...lesson }
}
