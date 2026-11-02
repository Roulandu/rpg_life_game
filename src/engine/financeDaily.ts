import { DAYS_PER_WEEK, absoluteDay, clamp, round1 } from '../domain'
import type { WorldState } from '../domain'

export interface WeeklyFinanceResult {
  income: number
  expenses: number
  net: number
}

/** 欠款一天磨掉 0.15 点士气：一周约 1 点，量级与旧的周日一次扣 1 点一致，但玩家每天都能在主页看见。 */
const DEBT_MORALE_DROP_PER_DAY = 0.15
/** 告急新闻的下限：每 28 个绝对日一条，按日打 id 才不会和周账新闻挤在一起。 */
const DEBT_ALARM_EVERY_DAYS = 28
const LEDGER_KEEP = 120
const NEWS_KEEP = 80

/** 每日累计前的对齐步骤：周薪取自今天的合同，生活开销按周薪比例加固定项。 */
export function refreshWeeklyRates(world: WorldState): void {
  const user = world.players[world.playerId]
  world.finance.weeklyWage = user?.contract.wageWeekly ?? 0
  world.finance.weeklyExpenses = Math.round(world.finance.weeklyWage * 0.18) + 15000
}

export function weeklySponsorshipIncome(world: WorldState): number {
  return world.finance.sponsorships
    .filter((deal) => deal.endSeason >= world.season)
    .reduce((sum, deal) => sum + deal.weekly, 0)
}

function applyDebtPenalty(world: WorldState): void {
  const user = world.players[world.playerId]
  if (!user || world.finance.balance >= 0) return
  user.morale = clamp(round1(user.morale - DEBT_MORALE_DROP_PER_DAY), 0, 100)
  if (absoluteDay(world.week, world.day) % DEBT_ALARM_EVERY_DAYS !== 0) return
  world.news.unshift({
    id: `news:finance:debt:${world.season}:${world.week}:${world.day}`,
    season: world.season,
    week: world.week,
    day: world.day,
    title: '账户余额告急',
    body: '经纪人来电提醒你，最近的支出已经超过了收入。',
    kind: 'system',
  })
  world.news = world.news.slice(0, NEWS_KEEP)
}

/**
 * 每天把周薪、赞助与开销按 1/7 挂进待入账，余额一分不动。
 * 这样「本周已挣/已花」在周日之前就是可读的，而流水仍是一周一条。
 */
export function accrueDailyFinance(world: WorldState): void {
  refreshWeeklyRates(world)
  const income = world.finance.weeklyWage + weeklySponsorshipIncome(world)
  world.finance.pendingIncome += income / DAYS_PER_WEEK
  world.finance.pendingExpenses += world.finance.weeklyExpenses / DAYS_PER_WEEK
  applyDebtPenalty(world)
}

/** 周日一次入账：两个累计器各取整一次，因此七天份额加起来正好是周口径金额。 */
export function postWeeklyLedger(world: WorldState): WeeklyFinanceResult {
  const finance = world.finance
  const income = Math.round(finance.pendingIncome)
  const expenses = Math.round(finance.pendingExpenses)
  const net = income - expenses

  finance.balance += net
  finance.pendingIncome = 0
  finance.pendingExpenses = 0
  finance.ledger.unshift({
    week: world.week,
    season: world.season,
    type: 'wage',
    amount: net,
    label: weeklySponsorshipIncome(world) > 0 ? '周薪、赞助与开销' : '周薪与开销',
  })
  finance.ledger = finance.ledger.slice(0, LEDGER_KEEP)
  return { income, expenses, net }
}
