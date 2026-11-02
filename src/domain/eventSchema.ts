import { z } from 'zod'
import { moveById } from './moveQueries'

/**
 * 事件内容包的 Zod 模式：从 `./eventContent` 拆出来，是为了让「内容长什么样」与「内容怎么注册」各自可读，
 * 也让新的内容门禁（绝技类效果）能在这里独立扩展而不撑大注册文件。
 */

/**
 * 绝技类效果的加载期闸门：必须点名绝技、绝技得真的把名宿传授列为获取路径、delta 落在档位与进度语义内。
 * 校验放在内容层而不是引擎层，是因为坏内容要在加载时就抛中文原因，而不是等玩家点到那一格才静默失效。
 */
function moveEffectIssues(effect: { op: string; delta: number; moveId?: string }): string[] {
  if (effect.op !== 'learnMove' && effect.op !== 'moveProgress') return []
  if (!effect.moveId) return [`${effect.op} 缺少 moveId：事件发绝技必须点名是哪一条`]
  const move = moveById(effect.moveId)
  if (!move) return [`事件引用的绝技不存在：${effect.moveId}`]
  if (!move.unlock.via.includes('mentor')) {
    return [`绝技没有把名宿传授列为获取路径：${effect.moveId}`]
  }
  if (effect.op === 'learnMove') {
    if (!Number.isInteger(effect.delta) || effect.delta < 1 || effect.delta > move.levels.length) {
      return [`learnMove 的授予等级要落在 1 到 ${move.levels.length} 之间：${effect.moveId}`]
    }
    return []
  }
  if (!Number.isInteger(effect.delta) || effect.delta < 1) {
    return [`moveProgress 的进度格数至少是 1：${effect.moveId}`]
  }
  return []
}

const effectSchema = z
  .object({
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
      'exp',
      'legendTrust',
      'learnMove',
      'moveProgress',
    ]),
    delta: z.number(),
    moveId: z.string().min(1).optional(),
  })
  .superRefine((effect, ctx) => {
    for (const message of moveEffectIssues(effect)) {
      ctx.addIssue({ code: 'custom', message, path: ['moveId'] })
    }
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

export const templateSchema = z
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
