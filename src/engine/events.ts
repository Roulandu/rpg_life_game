import type { GameEvent, WorldState } from '../domain'
import { buildDraftContext, interpolate, resultTextFor } from './data/eventTemplates'
import { applyEffects } from './effects'

/** 选项结算：效果落地 + 生活方式购置的资产登记。 */
export function resolveEvent(
  world: WorldState,
  eventId: string,
  choiceId: string,
): GameEvent | null {
  const event = world.events[eventId]
  if (!event || event.status !== 'open') return null
  const choice = event.choices.find((item) => item.id === choiceId)
  if (!choice) return null

  applyEffects(world, choice.effects, event.title)
  if (event.templateId === 'lifestyle_purchase') {
    if (choice.id === 'car') world.finance.assets.push('一辆跑车')
    if (choice.id === 'apartment') world.finance.assets.push('一套小公寓')
  }

  // 结果文案也走同一套插值：数据包里写 {coach}，落地时必须是真人的中文名。
  const resultText = interpolate(
    resultTextFor(event.templateId, choice.id) ?? `${choice.label}。`,
    buildDraftContext(world, null),
  )
  event.status = 'resolved'
  event.resultText = resultText
  world.news.unshift({
    id: `news:event:resolved:${event.id}`,
    season: world.season,
    week: world.week,
    day: world.day,
    title: `已处理：${event.title}`,
    body: resultText,
    kind: 'media',
  })
  world.news = world.news.slice(0, 80)
  return event
}
