import { describe, expect, it } from 'vitest'
import type { WorldState } from '../../src/domain'
import { displayName, EVENT_PACK_NAMES, EVENT_TEMPLATES, eventTemplateById } from '../../src/domain'
import { getRelationshipByRole } from '../../src/engine/relationships'
import { resolveEvent } from '../../src/engine/events'
import { applyEffects } from '../../src/engine/effects'
import { buildDraftContext, renderEventDraft } from '../../src/engine/data/eventTemplates'
import { generateWorld } from '../../src/world/generator'
import { TEST_NOW, testOptions } from '../fixtures/career'

/** 把数据包里的模板原样挂成一个未处理事件，用来单测结算路径。 */
function openTemplateEvent(world: WorldState, templateId: string, eventId: string) {
  const template = eventTemplateById(templateId)!
  const event = {
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
    status: 'open' as const,
    choices: template.choices,
    source: 'template' as const,
  }
  world.events[eventId] = event
  return event
}

function injuredWorld(daysLeft: number, kind = '肌肉拉伤') {
  const world = generateWorld(testOptions({ seed: 2026 }), TEST_NOW)
  world.players[world.playerId].injury = { kind, severity: 2, daysLeft }
  return world
}

describe('事件效果落地', () => {
  it('injuryDays 效果按天增减伤情，没有伤病时不会凭空造伤', () => {
    const world = injuredWorld(14)

    applyEffects(world, [{ op: 'injuryDays', delta: -3 }], '队医的决定')
    expect(world.players[world.playerId].injury?.daysLeft).toBe(11)

    const healthy = generateWorld(testOptions({ seed: 2026 }), TEST_NOW)
    applyEffects(healthy, [{ op: 'injuryDays', delta: 5 }], '加练')
    expect(healthy.players[healthy.playerId].injury).toBeNull()
  })

  it('恢复效果不会把伤停压到一天以下', () => {
    const world = injuredWorld(2, '脚踝扭伤')

    applyEffects(world, [{ op: 'injuryDays', delta: -5 }], '提前复出')

    expect(world.players[world.playerId].injury?.daysLeft).toBe(1)
  })
})

describe('事件结算走数据驱动效果', () => {
  it('提前复出由数据包里的伤停效果落地，引擎不再有模板专属分支', () => {
    const world = injuredWorld(16)
    openTemplateEvent(world, 'injury_concern', 'event:resolve:rush')

    const resolved = resolveEvent(world, 'event:resolve:rush', 'rush')

    expect(resolved?.status).toBe('resolved')
    expect(world.players[world.playerId].injury?.daysLeft).toBe(9)
    expect(world.news[0]?.title).toBe('已处理：队医的建议')
  })

  it('听从队医不会改动伤停天数', () => {
    const world = injuredWorld(10, '脚踝扭伤')
    openTemplateEvent(world, 'injury_concern', 'event:resolve:listen')

    resolveEvent(world, 'event:resolve:listen', 'listen')

    expect(world.players[world.playerId].injury?.daysLeft).toBe(10)
  })
})

describe('事件结果文案插值', () => {
  it('结果文案里的占位符在结算时被换成真实人名', () => {
    const world = generateWorld(testOptions({ seed: 2026 }), TEST_NOW)
    openTemplateEvent(world, 'mw_coach_role_call', 'event:resolve:token')

    const resolved = resolveEvent(world, 'event:resolve:token', 'freedom')

    expect(resolved?.resultText).toBeTruthy()
    expect(resolved?.resultText).not.toContain('{coach}')
    expect(resolved?.resultText).toContain(displayName(getRelationshipByRole(world, 'coach')))
  })

  it('正文与结果文案共用同一套插值口径', () => {
    const world = generateWorld(testOptions({ seed: 2026 }), TEST_NOW)
    const ctx = buildDraftContext(world, null)

    const draft = renderEventDraft('mw_bench_name', ctx)

    expect(draft.body).not.toContain('{teammate}')
    expect(draft.body).toContain(ctx.teammate)
  })
})

describe('事件数据包注册表', () => {
  it('模板按数据包加载，跨包 id 不允许重复', () => {
    const ids = EVENT_TEMPLATES.map((template) => template.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(EVENT_PACK_NAMES.length).toBeGreaterThanOrEqual(2)
    expect(ids).toContain('injury_concern')
    expect(ids).toContain('mw_coach_role_call')
  })

  it('每个模板的结果文案键都指向真实选项，正文占位符都在白名单内', () => {
    for (const template of EVENT_TEMPLATES) {
      const choiceIds = new Set(template.choices.map((choice) => choice.id))
      for (const key of Object.keys(template.resultTexts ?? {})) {
        expect(choiceIds.has(key), `${template.id} 的结果文案 ${key}`).toBe(true)
      }
    }
  })
})
