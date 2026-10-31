import { generateFixtures } from '../domain'
import { computeClubStrength } from '../domain'
import type { CareerCreateOptions, Club, Id, League, Player, WorldState } from '../domain'
import { ENGLAND_CLUBS, ENGLAND_LEAGUES } from './data/england'
import { ENGINE_VERSION, START_SEASON, TOTAL_CLUBS_PER_LEAGUE, TOTAL_WEEKS } from './constants'
import { createClub } from './clubFactory'
import { makeUserPlayer } from './playerFactory'
import { createFinance, createRelationships, createSettings, initialNews } from './initialState'

export { ENGINE_VERSION } from './constants'

interface GeneratedUniverse {
  leagues: Record<Id, League>
  clubs: Record<Id, Club>
  players: Record<Id, Player>
}

function createLeaguesAndClubs(seed: number): GeneratedUniverse {
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

  return { leagues, clubs, players }
}

export function generateWorld(options: CareerCreateOptions, now: string): WorldState {
  const seed = options.seed
  const { leagues, clubs, players } = createLeaguesAndClubs(seed)

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
    version: 2,
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
    settings: createSettings(),
  }
}
