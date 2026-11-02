import { z } from 'zod'
import shootingJson from '../../data/moves/shooting.json'
import dribblingJson from '../../data/moves/dribbling.json'
import passingJson from '../../data/moves/passing.json'
import aerialJson from '../../data/moves/aerial.json'
import defendingJson from '../../data/moves/defending.json'
import goalkeepingJson from '../../data/moves/goalkeeping.json'
import tempoJson from '../../data/moves/tempo.json'
import setpieceJson from '../../data/moves/setpiece.json'
import { ATTR_KEYS } from './attributes'
import { KEY_MOMENT_KINDS } from './keyMomentKinds'
import type { AttrKey, Player } from './types'

export type MoveRarity = 'common' | 'rare' | 'signature' | 'legendary'
export type MoveFamily =
  | 'shooting'
  | 'dribbling'
  | 'passing'
  | 'aerial'
  | 'defending'
  | 'goalkeeping'
  | 'tempo'
  | 'setpiece'
export type MoveUnlockPath = 'exp' | 'mentor' | 'specialization' | 'matchDrop'
export type MoveCounterRole = 'keeper' | 'marker' | 'shooter'

export const RARITY_ORDER: MoveRarity[] = ['common', 'rare', 'signature', 'legendary']
export const RARITY_LABELS: Record<MoveRarity, string> = {
  common: '常见',
  rare: '罕见',
  signature: '招牌',
  legendary: '传奇',
}
export const MOVE_POSITION_GROUPS = ['GK', 'DEF', 'MID', 'FWD'] as const
export type MovePositionGroup = (typeof MOVE_POSITION_GROUPS)[number]

/**
 * 每个稀有度的成功率预算上限（取满级 chanceDelta）。
 * 关键回合的选项概率本来就夹在上下界里，绝技若不受约束会把所有选项顶到天花板，
 * 所以这里按稀有度设一条硬上限，内容门禁与数据校验共用同一个口径。
 */
export const RARITY_CHANCE_BUDGET: Record<MoveRarity, number> = {
  common: 0.045,
  rare: 0.065,
  signature: 0.085,
  legendary: 0.11,
}

/** 攒满一格进度才允许升级；比赛掉落与周三特训各推进 1。 */
export const MOVE_PROGRESS_PER_LEVEL = 3
export const MOVE_MAX_LEVEL = 3

export interface MoveLevelSpec {
  level: number
  minOverall: number
  costExp: number
  chanceDelta: number
  riskDelta: number
  basisZh: string
}

export interface MoveCounter {
  role: MoveCounterRole
  attr: AttrKey
  coefficient: number
  labelZh: string
}

export interface MoveUnlock {
  via: MoveUnlockPath[]
  mentorRole?: string
  eventTemplateId?: string
}

export interface MoveDefinition {
  id: string
  nameZh: string
  family: MoveFamily
  rarity: MoveRarity
  positions: MovePositionGroup[]
  /** 目标写成 `关键回合:选项 id`：同一个选项 id 会在一类里重复出现，只记选项会串味。 */
  targets: string[]
  levels: MoveLevelSpec[]
  counter?: MoveCounter
  unlock: MoveUnlock
  textZh: { success: string; fail: string }
}

/** 绝技结算给概率表的一条依据：文本直接可渲染，delta 仍然以概率（0–1）计。 */
export interface MoveBonusTerm {
  text: string
  delta: number
}

export interface MoveOpponents {
  keeper: Player | null
  marker: Player | null
  shooter: Player | null
}

const NO_LATIN = /^[^A-Za-z]+$/

const levelSchema = z
  .object({
    level: z.number().int().min(1).max(MOVE_MAX_LEVEL),
    minOverall: z.number().int().min(1).max(96),
    costExp: z.number().int().min(1),
    chanceDelta: z.number().min(0).max(0.2),
    riskDelta: z.number().min(0).max(0.2),
    basisZh: z.string().min(1),
  })
  .strict()

const counterSchema = z
  .object({
    role: z.enum(['keeper', 'marker', 'shooter']),
    attr: z.string().min(1),
    coefficient: z.number().positive().max(0.004),
    labelZh: z.string().min(1).regex(NO_LATIN),
  })
  .strict()
  .superRefine((counter, ctx) => {
    if (!(ATTR_KEYS as string[]).includes(counter.attr)) {
      ctx.addIssue({ code: 'custom', message: `对手压制项的属性不在白名单：${counter.attr}` })
    }
  })

const unlockSchema = z
  .object({
    via: z.array(z.enum(['exp', 'mentor', 'specialization', 'matchDrop'])).min(1),
    mentorRole: z.string().min(1).optional(),
    eventTemplateId: z.string().min(1).optional(),
  })
  .strict()
  .superRefine((unlock, ctx) => {
    if (!unlock.via.includes('exp')) {
      ctx.addIssue({ code: 'custom', message: '绝技必须至少能用经验解锁，否则商店里永远买不到' })
    }
    if (unlock.via.includes('mentor') && !unlock.mentorRole) {
      ctx.addIssue({ code: 'custom', message: '导师传授必须写明导师角色' })
    }
  })

const moveSchema = z
  .object({
    id: z.string().min(1),
    nameZh: z.string().min(1).regex(NO_LATIN),
    family: z.enum([
      'shooting',
      'dribbling',
      'passing',
      'aerial',
      'defending',
      'goalkeeping',
      'tempo',
      'setpiece',
    ]),
    rarity: z.enum(['common', 'rare', 'signature', 'legendary']),
    positions: z.array(z.enum(['GK', 'DEF', 'MID', 'FWD'])).min(1),
    targets: z.array(z.string().min(1)).min(1),
    levels: levelSchema.array().length(MOVE_MAX_LEVEL),
    counter: counterSchema.optional(),
    unlock: unlockSchema,
    textZh: z.object({ success: z.string().min(1), fail: z.string().min(1) }).strict(),
  })
  .strict()
  .superRefine((move, ctx) => {
    for (const target of move.targets) {
      const parts = target.split(':')
      if (parts.length !== 2 || !parts[1]) {
        ctx.addIssue({ code: 'custom', message: `目标格式必须是 关键回合:选项：${target}`, path: ['targets'] })
        continue
      }
      if (!(KEY_MOMENT_KINDS as readonly string[]).includes(parts[0])) {
        ctx.addIssue({ code: 'custom', message: `未知关键回合类型：${parts[0]}`, path: ['targets'] })
      }
    }
    const [one, two, three] = move.levels
    const grows = (pick: (level: MoveLevelSpec) => number) =>
      pick(two) > pick(one) && pick(three) > pick(two)
    if (!grows((level) => level.minOverall)) {
      ctx.addIssue({ code: 'custom', message: `综合分门槛必须逐级抬高：${move.id}`, path: ['levels'] })
    }
    if (!grows((level) => level.costExp)) {
      ctx.addIssue({ code: 'custom', message: `升级花费必须逐级抬高：${move.id}`, path: ['levels'] })
    }
    if (!grows((level) => level.chanceDelta)) {
      ctx.addIssue({ code: 'custom', message: `成功率加成必须逐级抬高：${move.id}`, path: ['levels'] })
    }
    for (const level of move.levels) {
      if (level.chanceDelta > RARITY_CHANCE_BUDGET[move.rarity]) {
        ctx.addIssue({
          code: 'custom',
          message: `${move.rarity} 级绝技的加成越过预算：${move.id} L${level.level}`,
          path: ['levels'],
        })
      }
    }
    if (move.levels.some((level, index) => level.level !== index + 1)) {
      ctx.addIssue({ code: 'custom', message: `等级编号必须是 1/2/3：${move.id}`, path: ['levels'] })
    }
  })

export type MoveContent = z.infer<typeof moveSchema>

/** 绝技内容包按技术流派分文件，一包一族；加载顺序即注册顺序。 */
export const MOVE_PACK_NAMES = [
  'shooting',
  'dribbling',
  'passing',
  'aerial',
  'defending',
  'goalkeeping',
  'tempo',
  'setpiece',
] as const

export interface MovePack {
  name: string
  moves: unknown
}

export interface MoveRegistry {
  list: MoveDefinition[]
  index: Map<string, MoveDefinition[]>
}

/** 内容门禁的可复用入口：原始 JSON 数组 → 绝技定义，坏数据直接抛中文原因。 */
export function parseMovePack(moves: unknown): MoveDefinition[] {
  return moveSchema.array().parse(moves) as MoveDefinition[]
}

/** 逐包解析并跨包查重：id 撞车会让索引互相覆盖，所以宁可启动即失败。 */
export function buildMoveRegistry(packs: MovePack[]): MoveRegistry {
  const list: MoveDefinition[] = []
  const index = new Map<string, MoveDefinition[]>()
  for (const pack of packs) {
    const moves = parseMovePack(pack.moves)
    for (const move of moves) {
      if (list.some((item) => item.id === move.id)) {
        throw new Error(`绝技 id 在不同数据包里重复：${move.id}（${pack.name}）`)
      }
      list.push(move)
    }
    index.set(pack.name, moves)
  }
  return { list, index }
}

const MOVE_PACKS: MovePack[] = [
  { name: 'shooting', moves: shootingJson },
  { name: 'dribbling', moves: dribblingJson },
  { name: 'passing', moves: passingJson },
  { name: 'aerial', moves: aerialJson },
  { name: 'defending', moves: defendingJson },
  { name: 'goalkeeping', moves: goalkeepingJson },
  { name: 'tempo', moves: tempoJson },
  { name: 'setpiece', moves: setpieceJson },
]

const REGISTRY = buildMoveRegistry(MOVE_PACKS)

const PACK_INDEX = REGISTRY.index

export const MOVES: MoveDefinition[] = REGISTRY.list

/** 全表只读：调用方拿到的是同一份对象，不要原地改。 */
export function allMoves(): MoveDefinition[] {
  return MOVES
}

export function movesOfPack(name: string): MoveDefinition[] {
  return PACK_INDEX.get(name) ?? []
}
