import { positionGroup } from '../domain'
import type { AttrKey, Id, MatchLineupPlayer, MatchLineups, Player, WorldState } from '../domain'
import type { OpponentPair } from './data/scoreChance'

/** 只要能给出双方球门与阵容来源即可：MatchReport 与开场前的 setup 都满足。 */
export interface OpponentSource {
  homeId: Id
  awayId: Id
  lineups?: MatchLineups | null
}

function squadOf(world: WorldState, entries: MatchLineupPlayer[]): Player[] {
  const squad: Player[] = []
  for (const entry of entries) {
    const player = world.players[entry.id]
    if (player) squad.push(player)
  }
  return squad
}

function group(squad: Player[], line: 'GK' | 'DEF' | 'MID' | 'FWD'): Player[] {
  return squad.filter((player) => positionGroup(player.position) === line)
}

/** 同分时取先出现的人，保证同一份阵容永远解析出同一个对手。 */
function bestOf(squad: Player[], key: AttrKey): Player | null {
  let top: Player | null = null
  for (const player of squad) {
    if (!top || player.attributes[key] > top.attributes[key]) top = player
  }
  return top
}

/**
 * 关键回合要对抗的是「具体的人」：对方门将、盯防我的后卫、正在出手的前锋。
 * 纯读取，不消耗随机数，也不写任何状态。
 */
export function resolveOpponents(world: WorldState, source: OpponentSource): OpponentPair | null {
  const lineups = source.lineups
  if (!lineups) return null
  const isUserHome = source.homeId === world.clubId
  const squad = squadOf(world, isUserHome ? lineups.away : lineups.home)
  if (squad.length === 0) return null

  const defenders = group(squad, 'DEF')
  const forwards = group(squad, 'FWD')
  const shootPool = forwards.length > 0 ? forwards : group(squad, 'MID')
  return {
    keeper: group(squad, 'GK')[0] ?? null,
    marker: bestOf(defenders, 'defending'),
    shooter: bestOf(shootPool, 'shooting'),
  }
}
