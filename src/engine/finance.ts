import { clamp, overall, round1 } from '../domain'
import type { Player, WorldState } from '../domain'

export interface WeeklyFinanceResult {
  income: number
  expenses: number
  net: number
}

export function recomputeWeeklyExpenses(world: WorldState): void {
  const user = world.players[world.playerId]
  world.finance.weeklyWage = user?.contract.wageWeekly ?? 0
  world.finance.weeklyExpenses = Math.round(world.finance.weeklyWage * 0.18) + 15000
}

export function settleWeekFinance(world: WorldState): WeeklyFinanceResult {
  const user = world.players[world.playerId]
  recomputeWeeklyExpenses(world)
  const sponsorship = world.finance.sponsorships
    .filter((deal) => deal.endSeason >= world.season)
    .reduce((sum, deal) => sum + deal.weekly, 0)
  const income = world.finance.weeklyWage + sponsorship
  const expenses = world.finance.weeklyExpenses
  const net = income - expenses

  world.finance.balance += net
  world.finance.ledger.unshift({
    week: world.week,
    season: world.season,
    type: 'wage',
    amount: net,
    label: sponsorship > 0 ? '周薪、赞助与开销' : '周薪与开销',
  })
  world.finance.ledger = world.finance.ledger.slice(0, 120)

  if (user && world.finance.balance < 0) {
    user.morale = clamp(user.morale - 1, 0, 100)
    if (world.week % 4 === 0) {
      world.news.unshift({
        id: `news:finance:debt:${world.season}:${world.week}`,
        season: world.season,
        week: world.week,
        title: '账户余额告急',
        body: '经纪人来电提醒你，最近的支出已经超过了收入。',
        kind: 'system',
      })
      world.news = world.news.slice(0, 80)
    }
  }
  return { income, expenses, net }
}

export function estimateValue(player: Player): number {
  const ability = overall(player)
  const ageFactor =
    player.age <= 20 ? 1.4 : player.age <= 23 ? 1.25 : player.age <= 27 ? 1.05 : player.age <= 30 ? 0.85 : player.age <= 33 ? 0.55 : 0.3
  const formFactor = 0.85 + player.form / 400
  const raw = player.contract.wageWeekly * 52 * (1.1 + ability / 26) * ageFactor * formFactor
  return Math.round(raw / 10000) * 10000
}

export function updatePlayerValue(world: WorldState): void {
  const user = world.players[world.playerId]
  if (!user) return
  user.value = estimateValue(user)
}

export function paySeasonBonuses(world: WorldState, summary: {
  appearances: number
  goals: number
  assists: number
  champion: boolean
  promoted: boolean
}): number {
  const parts: { label: string; amount: number }[] = []
  if (summary.appearances > 0) {
    parts.push({ label: '赛季出场奖金', amount: summary.appearances * 50000 })
  }
  if (summary.goals > 0) {
    parts.push({ label: '赛季进球奖金', amount: summary.goals * 75000 })
  }
  if (summary.assists > 0) {
    parts.push({ label: '赛季助攻奖金', amount: summary.assists * 40000 })
  }
  if (summary.champion) {
    parts.push({ label: '联赛冠军奖金', amount: 2000000 })
  }
  if (summary.promoted) {
    parts.push({ label: '升级奖金', amount: 1000000 })
  }

  let total = 0
  for (const part of parts) {
    const cents = Math.round(part.amount)
    total += cents
    world.finance.ledger.unshift({
      week: world.totalWeeks,
      season: world.season,
      type: 'bonus',
      amount: cents,
      label: part.label,
    })
  }
  world.finance.balance += total
  world.finance.ledger = world.finance.ledger.slice(0, 120)
  return total
}

export function weeklySuffix(world: WorldState): string {
  return `${world.season}:${world.week}`
}

export function reputationAfterSeason(world: WorldState, averageRating: number): void {
  const user = world.players[world.playerId]
  if (!user) return
  const rating = round1(averageRating)
  const apps = user.seasonStats.appearances
  if (apps < 8) return
  const base = rating >= 7.4 ? 2.4 : rating >= 7 ? 1.6 : rating >= 6.6 ? 0.8 : -0.4
  const exposure = user.clubId ? world.clubs[user.clubId]?.tier === 1 ? 1.5 : 1 : 1
  user.reputation.local = clamp(user.reputation.local + base * exposure, 0, 100)
  user.reputation.national = clamp(user.reputation.national + base * 0.7 * exposure, 0, 100)
  user.reputation.fanbase = clamp(user.reputation.fanbase + base * 0.8, 0, 100)
  user.reputation.media = clamp(user.reputation.media + base * 0.6, 0, 100)
  user.reputation.continental = clamp(user.reputation.continental + base * 0.2, 0, 100)
}
