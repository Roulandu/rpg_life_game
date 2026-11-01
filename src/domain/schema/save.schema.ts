import { z } from 'zod'
import type { WorldState } from '../types'
import { CURRENT_SAVE_VERSION } from '../version'

export { CURRENT_SAVE_VERSION }
export const SAVE_FORMAT = 'pitch-life-save'

const attributesSchema = z.object({
  pace: z.number(),
  shooting: z.number(),
  passing: z.number(),
  dribbling: z.number(),
  defending: z.number(),
  physical: z.number(),
  mental: z.number(),
  technique: z.number(),
  stamina: z.number(),
  goalkeeping: z.number(),
})

const playerSchema = z
  .object({
    id: z.string().min(1),
    name: z.string(),
    /** v6 起必有；v5 及更早存档缺字段，由迁移补齐，所以这里只能是可选。 */
    nameZh: z.string().optional(),
    nationality: z.string(),
    age: z.number().int().min(14).max(60),
    position: z.string(),
    attributes: attributesSchema,
    potential: z.number(),
    fitness: z.number(),
    morale: z.number(),
    clubId: z.string().min(1),
    contract: z
      .object({
        clubId: z.string(),
        wageWeekly: z.number(),
        startSeason: z.number().int(),
        endSeason: z.number().int(),
      })
      .passthrough(),
    seasonStats: z
      .object({
        season: z.number().int(),
        appearances: z.number(),
        goals: z.number(),
        assists: z.number(),
      })
      .passthrough(),
    careerStats: z.array(z.unknown()),
    history: z.array(z.unknown()),
    isUser: z.boolean(),
  })
  .passthrough()

const clubSchema = z
  .object({
    id: z.string().min(1),
    nameZh: z.string(),
    nameEn: z.string(),
    city: z.string(),
    countryCode: z.string(),
    leagueId: z.string().min(1),
    tier: z.number().int(),
    reputation: z.number(),
    squadIds: z.array(z.string()),
    coach: z.object({ name: z.string() }).passthrough(),
    strength: z.object({ overall: z.number() }).passthrough(),
  })
  .passthrough()

const leagueSchema = z
  .object({
    id: z.string().min(1),
    nameZh: z.string(),
    countryCode: z.string(),
    tier: z.number().int(),
    clubIds: z.array(z.string()),
    promotionSlots: z.number(),
    relegationSlots: z.number(),
  })
  .passthrough()

const fixtureSchema = z
  .object({
    id: z.string().min(1),
    competitionId: z.string(),
    season: z.number().int(),
    week: z.number().int(),
    day: z.number().int().min(1).max(7).optional(),
    homeId: z.string(),
    awayId: z.string(),
    status: z.enum(['scheduled', 'live', 'played']),
  })
  .passthrough()

export const worldSchema = z
  .object({
    version: z.number().int().nonnegative(),
    seed: z.number().int(),
    engineVersion: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
    playerId: z.string().min(1),
    clubId: z.string().min(1),
    players: z.record(z.string(), playerSchema),
    clubs: z.record(z.string(), clubSchema),
    leagues: z.record(z.string(), leagueSchema),
    fixtures: z.record(z.string(), fixtureSchema),
    relationships: z.record(z.string(), z.object({ id: z.string(), role: z.string() }).passthrough()),
    events: z.record(z.string(), z.object({ id: z.string(), status: z.string() }).passthrough()),
    // v7 之前没有事件冷却记忆：旧档缺字段时放行，由迁移补成空表。
    eventMemory: z.record(z.string(), z.number()).optional(),
    finance: z
      .object({
        balance: z.number(),
        weeklyWage: z.number(),
        weeklyExpenses: z.number(),
        ledger: z.array(z.unknown()),
        assets: z.array(z.string()),
        sponsorships: z.array(z.unknown()),
      })
      .passthrough(),
    news: z.array(z.unknown()),
    season: z.number().int().positive(),
    week: z.number().int().positive(),
    // v5 之前没有日时钟：校验要放行旧结构，缺失字段由迁移补齐，不能在这里卡住导入。
    day: z.number().int().min(1).max(7).optional(),
    totalWeeks: z.number().int().positive(),
    weekPlan: z
      .object({ training: z.string().min(1), extra: z.string().min(1) })
      .passthrough()
      .optional(),
    pendingDayPlan: z
      .union([
        z.null(),
        z
          .object({
            training: z.string().min(1),
            extra: z.string().min(1),
            fixtureId: z.string().nullable(),
          })
          .passthrough(),
      ])
      .optional(),
    lastMatch: z.unknown().nullable(),
    seasonSummaries: z.array(z.unknown()),
    settings: z
      .object({
        provider: z.enum(['openai', 'anthropic', 'custom']),
        model: z.string(),
        narrativeDensity: z.enum(['off', 'lean', 'standard', 'rich']),
        aiMode: z.enum(['template', 'llm']),
      })
      .passthrough(),
  })
  .passthrough()
  .refine((world) => Boolean(world.players[world.playerId]), {
    message: '存档缺少玩家数据',
  })
  .refine((world) => Boolean(world.clubs[world.clubId]), {
    message: '存档缺少当前俱乐部数据',
  })
  .refine((world) => world.week <= world.totalWeeks, {
    message: '存档周次超出赛季范围',
  })

export const saveEnvelopeSchema = z.object({
  format: z.literal(SAVE_FORMAT),
  saveVersion: z.number().int().positive(),
  engineVersion: z.string(),
  exportedAt: z.string(),
  checksum: z.string(),
  world: worldSchema,
})

export interface SaveEnvelope {
  format: typeof SAVE_FORMAT
  saveVersion: number
  engineVersion: string
  exportedAt: string
  checksum: string
  world: WorldState
}

export function assertWorld(value: unknown): WorldState {
  return worldSchema.parse(value) as unknown as WorldState
}
