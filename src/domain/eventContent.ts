import legacyJson from '../../data/events/legacy.json'
import matchweekJson from '../../data/events/matchweek.json'
import dailyLifeJson from '../../data/events/daily-life.json'
import mediaJson from '../../data/events/media.json'
import clubJson from '../../data/events/club.json'
import financeJson from '../../data/events/finance.json'
import staffJson from '../../data/events/staff.json'
import milestonesJson from '../../data/events/milestones.json'
import mentorJson from '../../data/events/mentor.json'
import type { Id } from './primitiveTypes'
import type { EventTemplateContent } from './eventSchema'
import { templateSchema } from './eventSchema'

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
  | 'exp'
  | 'legendTrust'
  | 'learnMove'
  | 'moveProgress'

export interface Effect {
  op: EffectOp
  delta: number
  /** 绝技类效果（learnMove / moveProgress）必须点名是哪一条绝技；delta 是授予等级或进度格数。 */
  moveId?: string
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

export type { EventCondition, EventTemplateContent } from './eventSchema'

const SCOPE_SET = new Set<string>(EVENT_SCOPE_FIELDS)

/** 玩家会读到的每一段文案里允许出现的插值占位符，与渲染器一一对应。 */
export const EVENT_TEXT_TOKENS = [
  '{coach}',
  '{teammate}',
  '{userName}',
  '{ratingSuffix}',
  '{restSuffix}',
]

const TOKEN_PATTERN = /\{[a-zA-Z_0-9]+\}/g

function templateTextFields(template: EventTemplateContent): string[] {
  return [
    template.title,
    template.body,
    ...template.choices.flatMap((choice) => [choice.label, choice.description ?? '']),
    ...Object.values(template.resultTexts ?? {}),
  ]
}

function assertWhitelist(templates: EventTemplateContent[]): EventTemplateContent[] {
  for (const template of templates) {
    for (const condition of template.when) {
      if (!SCOPE_SET.has(condition.field)) {
        throw new Error(`事件 ${template.id} 的条件字段不在白名单：${condition.field}`)
      }
    }
    const tokens = new Set(templateTextFields(template).flatMap((text) => text.match(TOKEN_PATTERN) ?? []))
    for (const token of tokens) {
      if (!EVENT_TEXT_TOKENS.includes(token)) {
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
export const EVENT_PACK_NAMES = [
  'legacy',
  'matchweek',
  'daily-life',
  'media',
  'club',
  'finance',
  'staff',
  'milestones',
  'mentor',
] as const

const EVENT_PACKS: { name: string; templates: unknown }[] = [
  { name: 'legacy', templates: legacyJson },
  { name: 'matchweek', templates: matchweekJson },
  { name: 'daily-life', templates: dailyLifeJson },
  { name: 'media', templates: mediaJson },
  { name: 'club', templates: clubJson },
  { name: 'finance', templates: financeJson },
  { name: 'staff', templates: staffJson },
  { name: 'milestones', templates: milestonesJson },
  { name: 'mentor', templates: mentorJson },
]

const PACK_INDEX = new Map<string, EventTemplateContent[]>()

/** 内容门禁的可复用入口：原始 JSON 数组 → 事件模板，坏数据直接抛中文原因。 */
export function parseEventPack(templates: unknown): EventTemplateContent[] {
  return assertWhitelist(templateSchema.array().parse(templates) as EventTemplateContent[])
}

function parsePacks(): EventTemplateContent[] {
  const list: EventTemplateContent[] = []
  for (const pack of EVENT_PACKS) {
    const templates = parseEventPack(pack.templates)
    for (const template of templates) {
      if (list.some((item) => item.id === template.id)) {
        throw new Error(`事件模板 id 在不同数据包里重复：${template.id}（${pack.name}）`)
      }
      list.push(template)
    }
    PACK_INDEX.set(pack.name, templates)
  }
  return list
}

export const EVENT_TEMPLATES: EventTemplateContent[] = parsePacks()

/** 按类别取包内模板：内容门禁与分类测试都用它，避免靠 id 前缀猜归属。 */
export function eventTemplatesOfPack(name: string): EventTemplateContent[] {
  return PACK_INDEX.get(name) ?? []
}

const TEMPLATE_INDEX = new Map(EVENT_TEMPLATES.map((template) => [template.id, template]))

export function eventTemplateById(id: string): EventTemplateContent | undefined {
  return TEMPLATE_INDEX.get(id)
}
