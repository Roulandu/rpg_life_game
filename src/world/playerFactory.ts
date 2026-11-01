import {
  archetypeBonus,
  backgroundBonus,
  clamp,
  computeOverall,
  emptyAttrInvestment,
  nameZhFor,
  round1,
} from '../domain'
import { applyBonuses, makeAttributes } from './attributeFactory'
import { draftUserAttributes, makeUserContract } from './userDraft'
import type {
  Attributes,
  CareerCreateOptions,
  Club,
  Contract,
  Id,
  Player,
  Position,
  Reputation,
  SeasonStat,
} from '../domain'
import { createRng, type Rng } from '../lib'
import { NAME_POOLS, NATIONALITY_WEIGHTS } from './data/england'
import { NO_SPACE_NATIONALITIES, START_SEASON } from './constants'

export function zeroSeasonStat(season: number, clubId: Id): SeasonStat {
  return {
    season,
    clubId,
    appearances: 0,
    starts: 0,
    minutes: 0,
    goals: 0,
    assists: 0,
    ratingSum: 0,
    ratingCount: 0,
    yellowCards: 0,
    redCards: 0,
  }
}

function pickNationality(rng: Rng): string {
  return rng.weighted(NATIONALITY_WEIGHTS)
}

export function makeName(rng: Rng, nationality: string): string {
  const pool = NAME_POOLS[nationality] ?? NAME_POOLS['英格兰']
  const first = rng.pick(pool.first)
  const last = rng.pick(pool.last)
  return NO_SPACE_NATIONALITIES.has(nationality) ? `${last}${first}` : `${first} ${last}`
}

function randomAge(rng: Rng): number {
  const roll = rng.next()
  if (roll < 0.28) return rng.int(18, 21)
  if (roll < 0.78) return rng.int(22, 28)
  return rng.int(29, 34)
}

export function makeWeeklyWage(ability: number, tier: number, age: number): number {
  const tierFactor = tier === 1 ? 22 : 10
  const ageFactor = age < 20 ? 0.5 : age < 22 ? 0.75 : 1
  return Math.round(((ability / 10) ** 3 * tierFactor + (tier === 1 ? 500 : 300)) * ageFactor) * 100
}

export function makeValue(wageWeekly: number, potential: number): number {
  return Math.round(wageWeekly * 52 * (2.4 + potential / 42))
}

function makeReputation(ability: number, tier: number, age: number, rng: Rng): Reputation {
  const local = clamp(ability - 22 + (tier === 1 ? 10 : 0) + rng.normal(0, 5), 0, 100)
  const national = clamp(local * (tier === 1 ? 0.75 : 0.45) + (age >= 24 ? 5 : 0), 0, 100)
  const continental = clamp(national * (tier === 1 ? 0.5 : 0.12), 0, 100)
  return {
    local: round1(local),
    national: round1(national),
    continental: round1(continental),
    world: round1(continental * 0.3),
    fanbase: round1(local * 0.9),
    media: round1(national * 0.7),
  }
}

export function squadRoleFor(
  ability: number,
  clubReputation: number,
  age: number,
): Player['squadRole'] {
  if (age <= 19 && ability < clubReputation - 3) return 'youth'
  if (ability >= clubReputation + 1) return 'star'
  if (ability >= clubReputation - 6) return 'starter'
  return 'rotation'
}

function deriveTraits(attrs: Attributes, position: Position): string[] {
  const traits: string[] = []
  if (position === 'GK' && attrs.goalkeeping >= 72) traits.push('门线反应')
  if (attrs.pace >= 75) traits.push('速度优势')
  if (attrs.technique >= 75) traits.push('技术细腻')
  if (attrs.physical >= 76) traits.push('对抗强')
  if (attrs.mental >= 76) traits.push('大心脏')
  if (attrs.stamina >= 76) traits.push('跑不死')
  return traits.slice(0, 2)
}

function pickFoot(rng: Rng, rightCut: number, leftCut: number): Player['foot'] {
  const roll = rng.next()
  return roll < rightCut ? 'R' : roll < leftCut ? 'L' : 'B'
}

export function makeAiPlayer(
  club: Club,
  position: Position,
  index: number,
  seed: number,
): Player {
  const rng = createRng(seed, 'player', club.id, index)
  const nationality = pickNationality(rng)
  const name = makeName(rng, nationality)
  const nameZh = nameZhFor(name, nationality)
  const age = randomAge(rng)
  const ability = clamp(club.reputation - 5 + rng.normal(0, 6), 30, 88)
  const potential = clamp(age <= 21 ? ability + rng.int(6, 19) : ability + rng.int(0, 4), 35, 95)
  const attributes = makeAttributes(position, ability, rng)
  const wageWeekly = makeWeeklyWage(ability, club.tier, age)
  const contract: Contract = {
    clubId: club.id,
    wageWeekly,
    startSeason: START_SEASON,
    endSeason: START_SEASON + rng.int(1, 4),
  }
  const foot = pickFoot(rng, 0.68, 0.94)
  return {
    id: `player:${club.id}:${String(index + 1).padStart(2, '0')}`,
    name,
    nameZh,
    nationality,
    birthYear: START_SEASON - age,
    age,
    position,
    foot,
    attributes,
    potential: round1(potential),
    exp: 0,
    lifetimeExp: 0,
    attrInvestment: emptyAttrInvestment(),
    form: round1(rng.float(42, 64)),
    fitness: round1(rng.float(78, 96)),
    sharpness: round1(rng.float(45, 70)),
    morale: round1(rng.float(58, 82)),
    confidence: round1(rng.float(48, 70)),
    clubId: club.id,
    squadRole: squadRoleFor(ability, club.reputation, age),
    contract,
    value: makeValue(wageWeekly, potential),
    reputation: makeReputation(ability, club.tier, age, rng),
    traits: deriveTraits(attributes, position),
    injury: null,
    seasonStats: zeroSeasonStat(START_SEASON, club.id),
    careerStats: [],
    history: [],
    isUser: false,
  }
}

export function makeUserPlayer(
  options: CareerCreateOptions,
  club: Club,
  players: Record<Id, Player>,
  seed: number,
): Player {
  const rng = createRng(seed, 'user', options.name, options.age, options.position)
  const age = clamp(options.age, 16, 21)
  const baseAbility = 46 + (age - 16) * 2 + rng.normal(0, 2.5)
  const attributes = makeAttributes(options.position, baseAbility, rng)
  applyBonuses(attributes, options.position, [
    archetypeBonus(options.archetype),
    backgroundBonus(options.background),
  ])
  // 点买不消耗随机数：种子流位置与加点前完全一致，潜力仍由 baseAbility 决定。
  const potential = clamp(baseAbility + 24 + rng.int(0, 10) - (age - 16) * 2, 60, 92)
  const finalAttributes = draftUserAttributes(options, attributes, age, potential)
  const playerOverall = computeOverall(options.position, finalAttributes)
  const wageWeekly = makeWeeklyWage(baseAbility, club.tier, age)
  const foot = pickFoot(rng, 0.65, 0.93)
  const name = options.name.trim() || '林远'
  const player: Player = {
    id: `player:user:${seed}`,
    name,
    nameZh: nameZhFor(name, options.nationality),
    nationality: options.nationality,
    birthYear: START_SEASON - age,
    age,
    position: options.position,
    foot,
    attributes: finalAttributes,
    potential: round1(potential),
    exp: 0,
    lifetimeExp: 0,
    attrInvestment: emptyAttrInvestment(),
    form: 55,
    fitness: 88,
    sharpness: 52,
    morale: 70,
    confidence: 58,
    clubId: club.id,
    squadRole: squadRoleFor(playerOverall, club.reputation, age),
    contract: makeUserContract(club, wageWeekly, age),
    value: makeValue(wageWeekly, potential),
    reputation: initialUserReputation(),
    traits: deriveTraits(finalAttributes, options.position),
    injury: null,
    seasonStats: zeroSeasonStat(START_SEASON, club.id),
    careerStats: [],
    history: [],
    isUser: true,
  }
  // Make sure the user is part of the generated player table before strength calculation.
  players[player.id] = player
  return player
}

function initialUserReputation(): Reputation {
  return {
    local: 18,
    national: 8,
    continental: 0,
    world: 0,
    fanbase: 12,
    media: 15,
  }
}
