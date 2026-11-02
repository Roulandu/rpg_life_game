import { z } from 'zod'
import candidatesJson from '../../data/staff/candidates.json'
import { createRng } from '../lib'
import { clamp, round1, round2 } from './attributes'
import type { Id } from './types'

export type StaffRole = 'doctor' | 'psychologist' | 'trainer'

export interface StaffRoleSpec {
  role: StaffRole
  label: string
  dutyZh: string
  /** 周薪基线（分）：真实价格还要乘水平系数，见 staffWeeklyCostOf。 */
  baseWeeklyCost: number
}

export interface StaffCandidate {
  id: Id
  role: StaffRole
  name: string
  nameZh: string
  quality: number
  weeklyCost: number
}

/** 在职成员 = 候选 + 雇佣那天的绝对日序；周薪与水平随人一起进存档，改市场不会影响已雇的人。 */
export interface StaffMember extends StaffCandidate {
  hiredDay: number
}

/** 团队对每日结算的全部影响，一次算清：任何一侧要加新挂钩，都得先在这里给一个默认值。 */
export interface StaffFactors {
  injuryRisk: number
  recoveryDays: number
  dailyFitness: number
  moraleFloor: number
  confidencePerDay: number
  psychBonus: number
  expFactor: number
  investDiscount: number
  specializationFactor: number
}

export const STAFF_ROLE_ORDER: StaffRole[] = ['doctor', 'psychologist', 'trainer']

export const STAFF_ROLE_SPECS: Record<StaffRole, StaffRoleSpec> = {
  doctor: {
    role: 'doctor',
    label: '队医',
    dutyZh: '盯训练负荷与康复节奏，伤停期间每天做一次体能维护。',
    baseWeeklyCost: 7000,
  },
  psychologist: {
    role: 'psychologist',
    label: '心理咨询师',
    dutyZh: '把士气托住下限，赛前疏导让高风险选择更稳。',
    baseWeeklyCost: 5500,
  },
  trainer: {
    role: 'trainer',
    label: '私人教练',
    dutyZh: '加练更划算，特训进度更快，属性投资的经验也更省。',
    baseWeeklyCost: 9000,
  },
}

/** 一季只给每个角色出 3 个候选：再多就把「招聘」变成了「全选」。 */
export const STAFF_POOL_SIZE = 3

const candidateSchema = z.object({
  id: z.string().startsWith('staff:'),
  role: z.enum(['doctor', 'psychologist', 'trainer']),
  name: z.string().min(1),
  nameZh: z.string().min(1),
  quality: z.number().int().min(40).max(95),
})
const poolSchema = z.object({ candidates: z.array(candidateSchema).min(12) })

/** 内容池的原始条目（还没有价格），由数据门禁保证结构。 */
const RAW_CANDIDATES = poolSchema.parse(candidatesJson).candidates

export const STAFF_CANDIDATES: StaffCandidate[] = RAW_CANDIDATES.map((item) => ({
  ...item,
  weeklyCost: staffWeeklyCostOf(item.role, item.quality),
}))

/** 周薪 = 基线 ×（0.5 + 水平/100）：同一角色里最贵约为最便宜的 1.5 倍， Rookie 周薪也付得起一个人。 */
export function staffWeeklyCostOf(role: StaffRole, quality: number): number {
  return Math.round(STAFF_ROLE_SPECS[role].baseWeeklyCost * (0.5 + quality / 100))
}

function candidatesOfRole(role: StaffRole): StaffCandidate[] {
  return STAFF_CANDIDATES.filter((item) => item.role === role)
}

/**
 * 本赛季的招聘池：每个角色从内容池里抽 3 个，域里带赛季，所以换季会换人但同一季反复打开是同一批。
 * 纯推导、不落盘——存档只记「雇了谁」，市场本身随时能从种子和赛季重算出来。
 */
export function buildStaffPool(seed: number, season: number): StaffCandidate[] {
  const pool: StaffCandidate[] = []
  for (const role of STAFF_ROLE_ORDER) {
    const rng = createRng(seed, 'staff-pool', season, role)
    const picked = rng.shuffle(candidatesOfRole(role)).slice(0, STAFF_POOL_SIZE)
    pool.push(...picked.sort((a, b) => b.quality - a.quality))
  }
  return pool
}

export function findStaffCandidate(id: string): StaffCandidate | null {
  return STAFF_CANDIDATES.find((item) => item.id === id) ?? null
}

export function staffWeeklyTotal(members: StaffMember[]): number {
  return members.reduce((sum, member) => sum + member.weeklyCost, 0)
}

export function hasStaffRole(members: StaffMember[], role: StaffRole): boolean {
  return members.some((member) => member.role === role)
}

/** 同一角色只认水平最高的那位：叠加会鼓励「囤三个队医」这种没有画面意义的操作。 */
function bestOfRole(members: StaffMember[], role: StaffRole): StaffMember | null {
  let best: StaffMember | null = null
  for (const member of members) {
    if (member.role === role && (!best || member.quality > best.quality)) best = member
  }
  return best
}

/**
 * 效果强度按「水平 90 拿满配」折算，最低只兑现四成：
 * 教练席上坐的是人不是开关，55 分的队医和 92 分的队医不该一样管用。
 */
export function staffPotency(quality: number): number {
  return clamp(round2(quality / 90), 0.4, 1)
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000
}

/** 不在岗的角色折算成 0，下面的每条公式都会自动退回恒等值，所以这里不需要分支。 */
function rolePotency(members: StaffMember[], role: StaffRole): number {
  const best = bestOfRole(members, role)
  return best ? staffPotency(best.quality) : 0
}

/** 心理咨询师的士气下限：低于这条线的一天会被拉回 45，再低也低不过去。 */
const PSYCH_MORALE_FLOOR = 45

export function staffFactors(members: StaffMember[]): StaffFactors {
  const doctor = rolePotency(members, 'doctor')
  const psychologist = rolePotency(members, 'psychologist')
  const trainer = rolePotency(members, 'trainer')

  return {
    injuryRisk: round2(1 - 0.3 * doctor),
    recoveryDays: round2(1 - 0.2 * doctor),
    dailyFitness: doctor > 0 ? 1 : 0,
    moraleFloor: psychologist > 0 ? PSYCH_MORALE_FLOOR : 0,
    confidencePerDay: round1(0.2 * psychologist),
    psychBonus: round3(0.012 * psychologist),
    expFactor: round2(1 + 0.5 * trainer),
    investDiscount: round2(0.1 * trainer),
    specializationFactor: round2(1 + 0.5 * trainer),
  }
}
