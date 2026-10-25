import { z } from 'zod'
import englandJson from '../../data/countries/england.json'
import poolsJson from '../../data/names/pools.json'
import nationalitiesJson from '../../data/names/nationalities.json'

const idPattern = /^[a-z]+:[A-Z]{3}:[12]:\d{2}$/
const colorPattern = /^#[0-9a-f]{6}$/i

const clubSeedSchema = z
  .object({
    id: z.string().regex(idPattern),
    city: z.string().min(1),
    nameZh: z.string().min(1),
    nameEn: z.string().min(1),
    tier: z.union([z.literal(1), z.literal(2)]),
    reputation: z.number().int().min(1).max(100),
    colors: z.object({
      primary: z.string().regex(colorPattern),
      secondary: z.string().regex(colorPattern),
    }),
    style: z.enum(['possession', 'counter', 'highPress', 'direct']),
    stadium: z.string().min(1),
  })
  .refine((club) => club.id.includes(`:${club.tier}:`), {
    message: '俱乐部 ID 中的层级必须与 tier 一致',
    path: ['id'],
  })

const leagueSeedSchema = z
  .object({
    id: z.string().regex(/^league:[A-Z]{3}:[12]$/),
    nameZh: z.string().min(1),
    tier: z.union([z.literal(1), z.literal(2)]),
    promotionSlots: z.number().int().min(0).max(6),
    relegationSlots: z.number().int().min(0).max(6),
    reputation: z.number().int().min(1).max(100),
  })
  .refine((league) => league.id.endsWith(`:${league.tier}`), {
    message: '联赛 ID 中的层级必须与 tier 一致',
    path: ['id'],
  })

const namePoolSchema = z.object({
  first: z.array(z.string().min(1)).min(1),
  last: z.array(z.string().min(1)).min(1),
})

const countryPackSchema = z
  .object({
    code: z.string().length(3),
    nameZh: z.string().min(1),
    leagues: z.array(leagueSeedSchema).min(1),
    clubs: z.array(clubSeedSchema).min(2),
    namePools: z.record(z.string(), namePoolSchema),
    nationalityWeights: z
      .array(z.object({ value: z.string().min(1), weight: z.number().positive() }))
      .min(1),
  })
  .superRefine((pack, ctx) => {
    const leagueTiers = new Set(pack.leagues.map((league) => league.tier))
    for (const club of pack.clubs) {
      if (!leagueTiers.has(club.tier)) {
        ctx.addIssue({
          code: 'custom',
          message: `俱乐部 ${club.id} 的层级 ${club.tier} 没有对应联赛`,
          path: ['clubs'],
        })
      }
    }
    if (!pack.namePools[pack.nameZh]) {
      ctx.addIssue({
        code: 'custom',
        message: `缺少本国姓名池：${pack.nameZh}`,
        path: ['namePools'],
      })
    }
  })

const poolsSchema = z.record(z.string(), namePoolSchema)

const nationalitiesSchema = z.object({
  weights: z
    .array(z.object({ value: z.string().min(1), weight: z.number().positive() }))
    .min(1),
})

export type ClubSeed = z.infer<typeof clubSeedSchema>
export type LeagueSeed = z.infer<typeof leagueSeedSchema>
export type CountryPack = z.infer<typeof countryPackSchema>
export type NamePool = z.infer<typeof namePoolSchema>

export const COUNTRY_PACKS: CountryPack[] = [countryPackSchema.parse(englandJson)]
export const NAME_POOLS: Record<string, NamePool> = poolsSchema.parse(poolsJson)
export const NATIONALITY_WEIGHTS = nationalitiesSchema.parse(nationalitiesJson).weights

export function getCountryPack(code: string): CountryPack | undefined {
  return COUNTRY_PACKS.find((pack) => pack.code === code)
}
