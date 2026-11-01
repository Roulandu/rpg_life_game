import { describe, expect, it } from 'vitest'
import {
  EVENT_BODY_TOKENS,
  EVENT_SCOPE_FIELDS,
  EVENT_TEMPLATES,
  eventTemplateById,
} from '../../src/domain/eventContent'

const LEGACY_IDS = [
  'coach_praise', 'coach_warning', 'bench_frustration', 'teammate_dinner', 'media_interview',
  'media_criticism', 'agent_sponsor', 'agent_call', 'family_visit', 'lifestyle_purchase', 'injury_concern',
]

describe('事件数据包', () => {
  it('legacy 十一条模板全部进入数据包并带权重、冷却与过期天数', () => {
    expect(EVENT_TEMPLATES.map((template) => template.id).sort()).toEqual([...LEGACY_IDS].sort())
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

  it('条件字段与插值占位符都落在白名单里', () => {
    for (const template of EVENT_TEMPLATES) {
      for (const condition of template.when) {
        expect(EVENT_SCOPE_FIELDS, `${template.id}.${condition.field}`).toContain(condition.field)
      }
      for (const token of template.body.match(/\{[a-zA-Z]+\}/g) ?? []) {
        expect(EVENT_BODY_TOKENS, `${template.id} ${token}`).toContain(token)
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
})
