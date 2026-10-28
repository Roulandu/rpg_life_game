import {
  ATTR_KEYS,
  POSITION_GROUPS,
  POSITION_WEIGHTS,
  archetypeBonus,
  backgroundBonus,
  clamp,
  computeOverall,
  overall,
  round1,
} from '../domain/attributes'
import { generateFixtures } from '../domain/fixtures'
import { computeClubStrength } from '../domain/strength'
import type {
  AttrKey,
  Attributes,
  CareerCreateOptions,
  Club,
  Coach,
  Contract,
  Fixture,
  Finance,
  Id,
  League,
  Player,
  Position,
  Relationship,
  Reputation,
  SeasonStat,
  WorldState,
} from '../domain/types'
import { createRng, type Rng } from '../lib/rng'
import {
  ENGLAND_CLUBS,
  ENGLAND_LEAGUES,
  NAME_POOLS,
  NATIONALITY_WEIGHTS,
  type ClubSeed,
} from './data/england'

export const ENGINE_VERSION = '0.1.0'
export const START_SEASON = 2026
export const TOTAL_WEEKS = 38
const TOTAL_CLUBS_PER_LEAGUE = 20

const NO_SPACE_NATIONALITIES = new Set(['中国', '日本', '韩国'])

const SQUAD_POSITIONS: Position[] = [
  'GK', 'GK',
  'CB', 'CB', 'CB', 'CB',
  'LB', 'LB',
  'RB', 'RB',
  'DM', 'DM',
  'CM', 'CM', 'CM',
  'AM', 'AM',
  'LW', 'LW',
  'RW', 'RW',
  'ST', 'ST',
]

function zeroSeasonStat(season: number, clubId: Id): SeasonStat {
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

function makeName(rng: Rng, nationality: string): string {
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

function makeAttributes(position: Position, ability: number, rng: Rng): Attributes {
  const attrs = {} as Attributes
  for (const key of ATTR_KEYS) {
    if (position === 'GK') {
      if (key === 'goalkeeping') {
        attrs[key] = clamp(ability + rng.normal(2, 4), 20, 95)
      } else if (key === 'pace') {
        attrs[key] = clamp(ability - 25 + rng.normal(0, 5), 20, 70)
      } else if (key === 'shooting' || key === 'dribbling') {
        attrs[key] = clamp(ability - 30 + rng.normal(0, 5), 15, 60)
      } else if (key === 'passing' || key === 'technique') {
        attrs[key] = clamp(ability - 12 + rng.normal(0, 5), 20, 85)
      } else if (key === 'defending') {
        attrs[key] = clamp(ability - 5 + rng.normal(0, 5), 20, 90)
      } else {
        attrs[key] = clamp(ability + rng.normal(0, 5), 30, 95)
      }
    } else if (key === 'goalkeeping') {
      attrs[key] = clamp(12 + rng.normal(0, 5), 5, 35)
    } else {
      const weight = POSITION_WEIGHTS[position][key] ?? 0
      attrs[key] = clamp(ability + (weight > 0 ? 5 : -5) + rng.normal(0, 5), 20, 95)
    }
    attrs[key] = round1(attrs[key])
  }
  return attrs
}

function applyBonuses(attrs: Attributes, position: Position, bonuses: Array<Partial<Record<AttrKey, number>>>) {
  for (const bonus of bonuses) {
    for (const key of ATTR_KEYS) {
      const delta = bonus[key]
      if (delta) attrs[key] = clamp(round1(attrs[key] + delta), 10, 96)
    }
  }
  if (position !== 'GK') attrs.goalkeeping = Math.min(attrs.goalkeeping, 35)
}

function makeWeeklyWage(ability: number, tier: number, age: number): number {
  const tierFactor = tier === 1 ? 22 : 10
  const ageFactor = age < 20 ? 0.5 : age < 22 ? 0.75 : 1
  return Math.round(((ability / 10) ** 3 * tierFactor + (tier === 1 ? 500 : 300)) * ageFactor) * 100
}

function makeValue(wageWeekly: number, potential: number): number {
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

function squadRoleFor(ability: number, clubReputation: number, age: number): Player['squadRole'] {
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

function makeAiPlayer(
  club: Club,
  position: Position,
  index: number,
  seed: number,
): Player {
  const rng = createRng(seed, 'player', club.id, index)
  const nationality = pickNationality(rng)
  const name = makeName(rng, nationality)
  const age = randomAge(rng)
  const ability = clamp(club.reputation - 5 + rng.normal(0, 6), 30, 88)
  const potential = clamp(
    age <= 21 ? ability + rng.int(6, 19) : ability + rng.int(0, 4),
    35,
    95,
  )
  const attributes = makeAttributes(position, ability, rng)
  const wageWeekly = makeWeeklyWage(ability, club.tier, age)
  const contract: Contract = {
    clubId: club.id,
    wageWeekly,
    startSeason: START_SEASON,
    endSeason: START_SEASON + rng.int(1, 4),
  }
  const footRoll = rng.next()
  const foot = footRoll < 0.68 ? 'R' : footRoll < 0.94 ? 'L' : 'B'
  return {
    id: `player:${club.id}:${String(index + 1).padStart(2, '0')}`,
    name,
    nationality,
    birthYear: START_SEASON - age,
    age,
    position,
    foot,
    attributes,
    potential: round1(potential),
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

function makeCoach(club: Club, seed: number): Coach {
  const rng = createRng(seed, 'coach', club.id)
  return {
    id: `coach:${club.id}`,
    name: makeName(rng, '英格兰'),
    age: rng.int(38, 62),
    style: club.style,
    quality: rng.int(10, 18),
  }
}

function createClub(seedClub: ClubSeed, seed: number, players: Record<Id, Player>): Club {
  const club: Club = {
    id: seedClub.id,
    nameZh: seedClub.nameZh,
    nameEn: seedClub.nameEn,
    city: seedClub.city,
    countryCode: 'ENG',
    leagueId: `league:ENG:${seedClub.tier}`,
    tier: seedClub.tier,
    reputation: seedClub.reputation,
    budget: seedClub.reputation * 250000,
    wageBudget: seedClub.reputation * 180000,
    facilities: seedClub.tier === 1 ? 12 + Math.round((seedClub.reputation - 64) / 4) : 7 + Math.round((seedClub.reputation - 43) / 5),
    style: seedClub.style,
    colors: seedClub.colors,
    stadium: seedClub.stadium,
    squadIds: [],
    coach: { id: '', name: '', age: 0, style: clubStylePlaceholder(), quality: 0 },
    strength: { attack: 50, midfield: 50, defense: 50, overall: 50 },
  }
  club.coach = makeCoach(club, seed)
  for (let i = 0; i < SQUAD_POSITIONS.length; i += 1) {
    const player = makeAiPlayer(club, SQUAD_POSITIONS[i], i, seed)
    players[player.id] = player
    club.squadIds.push(player.id)
  }
  return club
}

function clubStylePlaceholder(): Club['style'] {
  return 'possession'
}

function makeUserPlayer(
  options: CareerCreateOptions,
  club: Club,
  players: Record<Id, Player>,
  seed: number,
): Player {
  const rng = createRng(seed, 'user', options.name, options.age, options.position)
  const age = clamp(options.age, 16, 21)
  const baseAbility = 46 + (age - 16) * 2 + rng.normal(0, 2.5)
  const attributes = makeAttributes(options.position, baseAbility, rng)
  applyBonuses(attributes, options.position, [archetypeBonus(options.archetype), backgroundBonus(options.background)])
  const playerOverall = computeOverall(options.position, attributes)
  const potential = clamp(
    baseAbility + 24 + rng.int(0, 10) - (age - 16) * 2,
    60,
    92,
  )
  const wageWeekly = makeWeeklyWage(baseAbility, club.tier, age)
  const contract: Contract = {
    clubId: club.id,
    wageWeekly,
    startSeason: START_SEASON,
    endSeason: START_SEASON + (age <= 18 ? 3 : 2),
    signingBonus: Math.round(wageWeekly * 4),
  }
  const footRoll = rng.next()
  const foot = footRoll < 0.65 ? 'R' : footRoll < 0.93 ? 'L' : 'B'
  const player: Player = {
    id: `player:user:${seed}`,
    name: options.name.trim() || '林远',
    nationality: options.nationality,
    birthYear: START_SEASON - age,
    age,
    position: options.position,
    foot,
    attributes,
    potential: round1(potential),
    form: 55,
    fitness: 88,
    sharpness: 52,
    morale: 70,
    confidence: 58,
    clubId: club.id,
    squadRole: squadRoleFor(playerOverall, club.reputation, age),
    contract,
    value: makeValue(wageWeekly, potential),
    reputation: {
      local: 18,
      national: 8,
      continental: 0,
      world: 0,
      fanbase: 12,
      media: 15,
    },
    traits: deriveTraits(attributes, options.position),
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

function createRelationships(
  user: Player,
  club: Club,
  players: Record<Id, Player>,
  seed: number,
): Record<Id, Relationship> {
  const rng = createRng(seed, 'relationships', user.id)
  const relationships: Record<Id, Relationship> = {}
  const coachTrust = 48 + (user.age <= 18 ? 6 : 2) + rng.int(-5, 7)
  relationships[`rel:coach:${user.id}`] = {
    id: `rel:coach:${user.id}`,
    name: club.coach.name,
    role: 'coach',
    trust: coachTrust,
    tension: 8,
    summary: '主教练对你的第一印象。训练和比赛表现会改变他的判断。',
    lastInteractionWeek: 0,
  }

  const teammates = club.squadIds
    .map((id) => players[id])
    .filter((p): p is Player => Boolean(p) && !p.isUser)
    .sort((a, b) => overall(b) - overall(a) || a.id.localeCompare(b.id))
    .slice(0, 3)
  teammates.forEach((mate, index) => {
    relationships[`rel:teammate:${mate.id}`] = {
      id: `rel:teammate:${mate.id}`,
      name: mate.name,
      role: 'teammate',
      trust: 50 + rng.int(-4, 10) - (index === 0 ? 4 : 0),
      tension: index === 0 ? 12 : 3,
      summary:
        index === 0
          ? `球队核心，和你竞争同一个位置。${mate.name} 会密切关注你的表现。`
          : `更衣室里的${index === 1 ? '老将' : '同龄人'}，关系从日常相处开始。`,
      lastInteractionWeek: 0,
    }
  })

  relationships[`rel:agent:${user.id}`] = {
    id: `rel:agent:${user.id}`,
    name: makeName(rng, '英格兰'),
    role: 'agent',
    trust: 55,
    tension: 0,
    summary: '你的经纪人，负责合同、赞助和转会机会。',
    lastInteractionWeek: 0,
  }
  relationships[`rel:family:${user.id}`] = {
    id: `rel:family:${user.id}`,
    name: '家人',
    role: 'family',
    trust: 78,
    tension: 0,
    summary: '无论你踢得好不好，他们都在看台上。',
    lastInteractionWeek: 0,
  }
  relationships[`rel:media:${user.id}`] = {
    id: `rel:media:${user.id}`,
    name: '英伦体育报',
    role: 'media',
    trust: 42,
    tension: 0,
    summary: '当地媒体，对你的潜力持观望态度。',
    lastInteractionWeek: 0,
  }
  relationships[`rel:fan:${user.id}`] = {
    id: `rel:fan:${user.id}`,
    name: '看台',
    role: 'fan',
    trust: 45,
    tension: 0,
    summary: '球迷还不太认识你，一次亮眼表现就能改变印象。',
    lastInteractionWeek: 0,
  }
  return relationships
}

function createFinance(user: Player): Finance {
  const weeklyWage = user.contract.wageWeekly
  const weeklyExpenses = Math.round(weeklyWage * 0.18) + 15000
  const signingBonus = user.contract.signingBonus ?? weeklyWage * 4
  return {
    balance: weeklyWage * 10 + signingBonus + 300000,
    weeklyWage,
    weeklyExpenses,
    ledger: [
      {
        week: 0,
        season: START_SEASON,
        type: 'other',
        amount: weeklyWage * 10,
        label: '起步资金',
      },
      {
        week: 0,
        season: START_SEASON,
        type: 'bonus',
        amount: signingBonus,
        label: '签约奖金',
      },
      {
        week: 0,
        season: START_SEASON,
        type: 'other',
        amount: 300000,
        label: '个人积蓄',
      },
    ],
    assets: ['一间租来的公寓'],
    sponsorships: [],
  }
}

function initialNews(user: Player, club: Club): WorldState['news'] {
  return [
    {
      id: `news:welcome:${user.id}`,
      season: START_SEASON,
      week: 1,
      title: `欢迎来到 ${club.nameZh}`,
      body: `${user.name} 与 ${club.nameZh} 签下了第一份职业合同。教练组希望你在训练中证明自己。`,
      kind: 'club',
    },
    {
      id: `news:coach:${user.id}`,
      season: START_SEASON,
      week: 1,
      title: '主教练的第一句话',
      body: `${club.coach.name}：“我不看年龄，只看训练和比赛。想上场，就先让我看到你。”`,
      kind: 'club',
    },
  ]
}

export function generateWorld(options: CareerCreateOptions, now: string): WorldState {
  const seed = options.seed
  const clubs: Record<Id, Club> = {}
  const players: Record<Id, Player> = {}
  const leagues: Record<Id, League> = {}

  for (const leagueSeed of ENGLAND_LEAGUES) {
    const clubSeeds = ENGLAND_CLUBS.filter((club) => club.tier === leagueSeed.tier)
    leagues[leagueSeed.id] = {
      id: leagueSeed.id,
      nameZh: leagueSeed.nameZh,
      countryCode: 'ENG',
      tier: leagueSeed.tier,
      clubIds: clubSeeds.map((club) => club.id).slice(0, TOTAL_CLUBS_PER_LEAGUE),
      promotionSlots: leagueSeed.promotionSlots,
      relegationSlots: leagueSeed.relegationSlots,
      reputation: leagueSeed.reputation,
    }
    for (const seedClub of clubSeeds) {
      const club = createClub(seedClub, seed, players)
      clubs[club.id] = club
    }
  }

  const chosenClub = clubs[options.clubId] ?? clubs['club:ENG:2:04']
  if (!chosenClub) throw new Error('No starting club available')

  const user = makeUserPlayer(options, chosenClub, players, seed)
  chosenClub.squadIds.push(user.id)

  for (const club of Object.values(clubs)) {
    club.strength = computeClubStrength(club, players)
  }

  const fixtures = generateFixtures(leagues, seed, START_SEASON)
  const relationships = createRelationships(user, chosenClub, players, seed)
  const finance = createFinance(user)

  return {
    version: 1,
    seed,
    engineVersion: ENGINE_VERSION,
    createdAt: now,
    updatedAt: now,
    playerId: user.id,
    clubId: chosenClub.id,
    players,
    clubs,
    leagues,
    fixtures,
    relationships,
    events: {},
    finance,
    news: initialNews(user, chosenClub),
    season: START_SEASON,
    week: 1,
    totalWeeks: TOTAL_WEEKS,
    lastMatch: null,
    seasonSummaries: [],
    settings: {
      provider: 'openai',
      model: 'gpt-4.1-mini',
      narrativeDensity: 'standard',
      aiMode: 'template',
      baseUrl: '',
      networkMode: 'auto',
      tokenParam: 'max_tokens',
      temperature: 0.85,
      rememberKey: false,
    },
  }
}

export function getPlayerWorldClub(world: WorldState): Club {
  return world.clubs[world.clubId] ?? Object.values(world.clubs)[0]
}

export function getUserPlayer(world: WorldState): Player {
  const player = world.players[world.playerId]
  if (!player) throw new Error('User player not found')
  return player
}

export function getLeague(world: WorldState, leagueId: Id): League | undefined {
  return world.leagues[leagueId]
}

export function getClubFixtures(world: WorldState, clubId: Id, season = world.season): Fixture[] {
  return Object.values(world.fixtures)
    .filter((fixture) => fixture.season === season && (fixture.homeId === clubId || fixture.awayId === clubId))
    .sort((a, b) => a.week - b.week || a.id.localeCompare(b.id))
}

export function getWeekFixtures(world: WorldState, week = world.week, season = world.season): Fixture[] {
  return Object.values(world.fixtures)
    .filter((fixture) => fixture.season === season && fixture.week === week)
    .sort((a, b) => a.competitionId.localeCompare(b.competitionId) || a.id.localeCompare(b.id))
}

export function ageGroupWeight(position: Position): number {
  return POSITION_GROUPS[position] === 'FWD' ? 3 : POSITION_GROUPS[position] === 'MID' ? 1.5 : 0.4
}
