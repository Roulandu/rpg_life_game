import { describe, expect, it } from 'vitest'
import legacyJson from '../../data/events/legacy.json'
import {
  EVENT_TEXT_TOKENS,
  EVENT_PACK_NAMES,
  parseEventPack,
  EVENT_SCOPE_FIELDS,
  EVENT_TEMPLATES,
  eventTemplateById,
} from '../../src/domain/eventContent'

const LEGACY_IDS = [
  'coach_praise', 'coach_warning', 'bench_frustration', 'teammate_dinner', 'media_interview',
  'media_criticism', 'agent_sponsor', 'agent_call', 'family_visit', 'lifestyle_purchase', 'injury_concern',
]

describe('事件数据包的 legacy 契约', () => {
  it('legacy 十一条模板全部进入数据包并带权重、冷却与过期天数', () => {
    expect((legacyJson as { id: string }[]).map((template) => template.id).sort()).toEqual(
      [...LEGACY_IDS].sort(),
    )
    const ids = EVENT_TEMPLATES.map((template) => template.id)
    expect(ids).toEqual(expect.arrayContaining(LEGACY_IDS))
    expect(new Set(ids).size, '模板 id 全局唯一').toBe(ids.length)
    for (const id of LEGACY_IDS) {
      const template = eventTemplateById(id)
      expect(template, id).toBeTruthy()
      expect(template!.weight).toBeGreaterThan(0)
      expect(template!.cooldownDays).toBeGreaterThanOrEqual(0)
      expect(template!.expiresDays).toBeGreaterThanOrEqual(1)
      expect(template!.choices.length).toBeGreaterThanOrEqual(2)
      expect(template!.sender.length).toBeGreaterThan(0)
    }
  })

  it('队医建议的标题、正文与结果文案与硬编码时代逐字一致', () => {
    const template = eventTemplateById('injury_concern')
    expect(template?.title).toBe('队医的建议')
    expect(template?.body).toBe('队医建议你耐心康复，但下一场比赛很重要。{restSuffix}')
    expect(template?.choices.map((choice) => choice.id)).toEqual(['listen', 'rush'])
    expect(template?.resultTexts?.rush).toBe('你坚持提前复出。风险会由你的身体来承担。')
  })
})

describe('事件数据包的白名单与注册表', () => {
  it('条件字段与插值占位符都落在白名单里', () => {
    for (const template of EVENT_TEMPLATES) {
      for (const condition of template.when) {
        expect(EVENT_SCOPE_FIELDS, `${template.id}.${condition.field}`).toContain(condition.field)
      }
      for (const token of template.body.match(/\{[a-zA-Z]+\}/g) ?? []) {
        expect(EVENT_TEXT_TOKENS, `${template.id} ${token}`).toContain(token)
      }
    }
  })

  it('选项 id 不重复，拦截性事件没有空效果选项', () => {
    for (const template of EVENT_TEMPLATES) {
      const choiceIds = template.choices.map((choice) => choice.id)
      expect(new Set(choiceIds).size, template.id).toBe(choiceIds.length)
      if (template.blocking) {
        for (const choice of template.choices) {
          expect(choice.effects.length, `${template.id}.${choice.id}`).toBeGreaterThan(0)
        }
      }
    }
  })

  it('保证型事件都带条件，标题不残留拉丁字母', () => {
    for (const template of EVENT_TEMPLATES) {
      if (template.guaranteed) expect(template.when.length, template.id).toBeGreaterThan(0)
      expect(/[A-Za-z]/.test(template.title), template.title).toBe(false)
    }
  })

  it('数据包注册表条目唯一，legacy 包始终在册', () => {
    expect(new Set<string>(EVENT_PACK_NAMES).size).toBe(EVENT_PACK_NAMES.length)
    expect(EVENT_PACK_NAMES).toContain('legacy')
  })

  it('注册第二个数据包后模板池增长且 id 仍全局唯一', () => {
    expect(EVENT_PACK_NAMES.length).toBeGreaterThanOrEqual(2)
    expect(EVENT_TEMPLATES.length).toBeGreaterThan((legacyJson as { id: string }[]).length)
    const ids = EVENT_TEMPLATES.map((template) => template.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

function packTemplateWith(overrides: Record<string, unknown>): unknown[] {
  return [
    {
      id: 't_gate',
      title: '门禁样本',
      body: '正文只有一句。',
      sender: '队友',
      weight: 1,
      expiresDays: 1,
      cooldownDays: 0,
      blocking: false,
      guaranteed: false,
      when: [],
      choices: [
        { id: 'a', label: '甲', effects: [{ op: 'morale', delta: 1 }] },
        { id: 'b', label: '乙', effects: [{ op: 'morale', delta: -1 }] },
      ],
      ...overrides,
    },
  ]
}

describe('事件内容的占位符门禁', () => {
  it('标题、选项与结果文案里的未知占位符都在加载期拒绝', () => {
    expect(() => parseEventPack(packTemplateWith({ title: '{userNme} 的邀请' }))).toThrow(/未知插值占位符/)
    expect(() =>
      parseEventPack(
        packTemplateWith({
          choices: [
            { id: 'a', label: '甲', description: '交给{teamate}。', effects: [{ op: 'morale', delta: 1 }] },
            { id: 'b', label: '乙', effects: [{ op: 'morale', delta: -1 }] },
          ],
        }),
      ),
    ).toThrow(/未知插值占位符/)
    expect(() => parseEventPack(packTemplateWith({ resultTexts: { a: '{conch} 点头。' } }))).toThrow(
      /未知插值占位符/,
    )
  })

  it('带下划线与数字的占位符也会被抓出来', () => {
    expect(() => parseEventPack(packTemplateWith({ body: '你好 {first_name}。' }))).toThrow(/first_name/)
  })

  it('登记过的占位符出现在任何文案面都合法', () => {
    expect(() =>
      parseEventPack(
        packTemplateWith({
          title: '{userName} 的邀请',
          body: '{restSuffix}',
          choices: [
            { id: 'a', label: '{coach} 找你', description: '{teammate} 等你。', effects: [{ op: 'morale', delta: 1 }] },
            { id: 'b', label: '乙', effects: [{ op: 'morale', delta: -1 }] },
          ],
          resultTexts: { a: '{ratingSuffix}' },
        }),
      ),
    ).not.toThrow()
  })
})
