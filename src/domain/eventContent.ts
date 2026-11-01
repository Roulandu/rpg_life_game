import { z } from 'zod'
import legacyJson from '../../data/events/legacy.json'
import matchweekJson from '../../data/events/matchweek.json'
import type { Id } from './primitiveTypes'

export type EffectOp =
  | 'morale'
  | 'fitness'
  | 'sharpness'
  | 'confidence'
  | 'coachTrust'
  | 'teammateTrust'
  | 'agentTrust'
  | 'familyTrust'
  | 'mediaRep'
  | 'fanRep'
  | 'money'
  | 'injuryDays'

export interface Effect {
  op: EffectOp
  delta: number
}

export interface EventChoice {
  id: string
  label: string
  description?: string
  effects: Effect[]
}

export interface GameEvent {
  id: Id
  templateId: string
  title: string
  body: string
  sender?: string
  season: number
  week: number
  /** 事件落在哪一天：日粒度推进与「今天」区都以此为准。 */
  day?: number
  createdAtWeek: number
  createdAtDay?: number
  expiresWeek: number
  expiresDay?: number
  blocking?: boolean
  status: 'open' | 'resolved' | 'expired'
  choices: EventChoice[]
  resultText?: string
  source: 'template' | 'llm'
}

/**
 * 事件条件的白名单投影：内容包只能读这二十几项，不能读写世界本身。
 * 白名单而不是表达式，是为了让条件可 JSON 校验、可枚举测试，也不会被写成图灵完备。
 */
export interface EventScope {
  absoluteDay: number
  weekday: number
  isMatchDay: boolean
  isDayAfterMatch: boolean
  daysSinceMatch: number
  injuryDaysLeft: number
  morale: number
  fitness: number
  sharpness: number
  confidence: number
  lastRating: number | null
  lastPlayed: number
  balance: number
  weeklyWage: number
  coachTrust: number
  teammateTrust: number
  agentTrust: number
  familyTrust: number
  mediaRep: number
  fanRep: number
  age: number
  positionGroup: string
  squadRole: string
  clubTier: number
  seasonProgress: number
  trainingFocus: string
  extraAction: string
}

export const EVENT_SCOPE_FIELDS = [
  'absoluteDay',
  'weekday',
  'isMatchDay',
  'isDayAfterMatch',
  'daysSinceMatch',
  'injuryDaysLeft',
  'morale',
  'fitness',
  'sharpness',
  'confidence',
  'lastRating',
  'lastPlayed',
  'balance',
  'weeklyWage',
  'coachTrust',
  'teammateTrust',
  'agentTrust',
  'familyTrust',
  'mediaRep',
  'fanRep',
  'age',
  'positionGroup',
  'squadRole',
  'clubTier',
  'seasonProgress',
  'trainingFocus',
  'extraAction',
] as const satisfies readonly (keyof EventScope)[]

/** 白名单字段名：拼错或多加字段会编译报错；漏项由投影测试兜住。 */
export type EventScopeField = (typeof EVENT_SCOPE_FIELDS)[number]

const effectSchema = z.object({
  op: z.enum([
    'morale',
    'fitness',
    'sharpness',
    'confidence',
    'coachTrust',
    'teammateTrust',
    'agentTrust',
    'familyTrust',
    'mediaRep',
    'fanRep',
    'money',
    'injuryDays',
  ]),
  delta: z.number(),
})

const choiceSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  description: z.string().min(1).optional(),
  effects: z.array(effectSchema),
})

const conditionSchema = z.object({
  field: z.string().min(1),
  op: z.enum(['eq', 'lt', 'lte', 'gte', 'between', 'in']),
  value: z.unknown(),
})

const templateSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1),
    body: z.string().min(1),
    sender: z.string().min(1),
    weight: z.number().positive(),
    expiresDays: z.number().int().min(1).max(21),
    cooldownDays: z.number().int().min(0).max(120),
    blocking: z.boolean(),
    guaranteed: z.boolean(),
    once: z.boolean().optional(),
    maxPerSeason: z.number().int().min(1).optional(),
    weekdays: z.array(z.number().int().min(1).max(7)).min(1).optional(),
    when: z.array(conditionSchema),
    choices: z.array(choiceSchema).min(2),
    resultTexts: z.record(z.string(), z.string().min(1)).optional(),
  })
  .strict()
  .superRefine((template, ctx) => {
    const seen = new Set<string>()
    for (const choice of template.choices) {
      if (seen.has(choice.id)) {
        ctx.addIssue({ code: 'custom', message: `选项 id 重复：${choice.id}`, path: ['choices'] })
      }
      seen.add(choice.id)
    }
    if (template.blocking && template.choices.some((choice) => choice.effects.length === 0)) {
      ctx.addIssue({ code: 'custom', message: '拦截性事件不能有空效果选项', path: ['choices'] })
    }
  })

export type EventCondition = z.infer<typeof conditionSchema>
export type EventTemplateContent = z.infer<typeof templateSchema>

const SCOPE_SET = new Set<string>(EVENT_SCOPE_FIELDS)

/** 正文里允许出现的插值占位符，与渲染器一一对应。 */
export const EVENT_BODY_TOKENS = [
  '{coach}',
  '{teammate}',
  '{userName}',
  '{ratingSuffix}',
  '{restSuffix}',
]

function assertWhitelist(templates: EventTemplateContent[]): EventTemplateContent[] {
  for (const template of templates) {
    for (const condition of template.when) {
      if (!SCOPE_SET.has(condition.field)) {
        throw new Error(`事件 ${template.id} 的条件字段不在白名单：${condition.field}`)
      }
    }
    const tokens = new Set(template.body.match(/\{[a-zA-Z]+\}/g) ?? [])
    for (const token of tokens) {
      if (!EVENT_BODY_TOKENS.includes(token)) {
        throw new Error(`事件 ${template.id} 使用了未知插值占位符：${token}`)
      }
    }
  }
  return templates
}

/**
 * 事件内容包按类别分文件：legacy 保持文案逐字不变，新类别一个文件一类，
 * 注册顺序即加载顺序，跨包 id 重复直接拒绝，避免出现「后一份覆盖前一份」。
 */
export const EVENT_PACK_NAMES = ['legacy', 'matchweek'] as const

const EVENT_PACKS: { name: string; templates: unknown }[] = [
  { name: 'legacy', templates: legacyJson },
  { name: 'matchweek', templates: matchweekJson },
]

function parsePacks(): EventTemplateContent[] {
  const list: EventTemplateContent[] = []
  for (const pack of EVENT_PACKS) {
    for (const template of templateSchema.array().parse(pack.templates)) {
      if (list.some((item) => item.id === template.id)) {
        throw new Error(`事件模板 id 在不同数据包里重复：${template.id}（${pack.name}）`)
      }
      list.push(template)
    }
  }
  return list
}

export const EVENT_TEMPLATES: EventTemplateContent[] = assertWhitelist(parsePacks())

const TEMPLATE_INDEX = new Map(EVENT_TEMPLATES.map((template) => [template.id, template]))

export function eventTemplateById(id: string): EventTemplateContent | undefined {
  return TEMPLATE_INDEX.get(id)
}
