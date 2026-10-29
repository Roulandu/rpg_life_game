import type { Club, Coach, Id, Player } from '../domain/types'
import { createRng } from '../lib/rng'
import type { ClubSeed } from './data/england'
import { SQUAD_POSITIONS } from './constants'
import { makeAiPlayer, makeName } from './playerFactory'

function clubStylePlaceholder(): Club['style'] {
  return 'possession'
}

export function makeCoach(club: Club, seed: number): Coach {
  const rng = createRng(seed, 'coach', club.id)
  return {
    id: `coach:${club.id}`,
    name: makeName(rng, '英格兰'),
    age: rng.int(38, 62),
    style: club.style,
    quality: rng.int(10, 18),
  }
}

export function createClub(seedClub: ClubSeed, seed: number, players: Record<Id, Player>): Club {
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
    facilities:
      seedClub.tier === 1
        ? 12 + Math.round((seedClub.reputation - 64) / 4)
        : 7 + Math.round((seedClub.reputation - 43) / 5),
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
