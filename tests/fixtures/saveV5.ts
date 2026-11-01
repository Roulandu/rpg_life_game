import type { MatchReport, WorldState } from '../../src/domain/types'
import { playToKeyMoments } from './matchday'
import { generateWorld } from '../../src/world/generator'
import { TEST_NOW, stripNameZh, testOptions } from './career'

/**
 * v5 存档的形状：实体没有中文名，历史文本里写的就是拉丁原名。
 * 这里先把现代存档“退回”去，再用来验证 v5→v6 迁移能把它汉化回来。
 */

type Named = { id: string; name: string; nameZh?: string }

/** 中文名 → 拉丁原名的反向表，用来把现代文本改写成老存档的样子。 */
function latinMap(world: WorldState): Map<string, string> {
  const pairs = new Map<string, string>()
  for (const player of Object.values(world.players) as Named[]) {
    if (player.nameZh) pairs.set(player.nameZh, player.name)
  }
  for (const club of Object.values(world.clubs)) {
    if (club.coach.nameZh) pairs.set(club.coach.nameZh, club.coach.name)
  }
  return pairs
}

function delatinize(text: string, pairs: Map<string, string>): string {
  let value = text
  for (const [nameZh, original] of pairs) {
    if (nameZh === original) continue
    value = value.split(nameZh).join(original)
  }
  return value
}

function delatinizeReport(report: MatchReport, pairs: Map<string, string>): void {
  for (const goal of report.goals) {
    goal.scorerName = delatinize(goal.scorerName, pairs)
    if (goal.assistName) goal.assistName = delatinize(goal.assistName, pairs)
  }
  report.motmName = delatinize(report.motmName, pairs)
  if (report.mediaReaction) report.mediaReaction = delatinize(report.mediaReaction, pairs)
  for (const line of report.events) line.text = delatinize(line.text, pairs)
  for (const moment of report.keyMoments ?? []) {
    moment.titleZh = delatinize(moment.titleZh, pairs)
    moment.promptZh = delatinize(moment.promptZh, pairs)
    if (moment.triggerZh) moment.triggerZh = delatinize(moment.triggerZh, pairs)
    if (moment.outcome) moment.outcome.textZh = delatinize(moment.outcome.textZh, pairs)
  }
}

/** 先把文本退回拉丁原名，再抹掉中文名，得到一份真正的 v5 存档。 */
function asV5(world: WorldState): WorldState {
  delatinizeWorld(world)
  world.version = 5
  return stripNameZh(world)
}

/** 存档文本整体退回“只有拉丁原名”的状态。 */
function delatinizeWorld(world: WorldState): void {
  const pairs = latinMap(world)
  for (const report of [
    world.lastMatch,
    ...Object.values(world.fixtures).map((fixture) => fixture.report),
  ].filter((report): report is MatchReport => Boolean(report))) {
    delatinizeReport(report, pairs)
  }
  for (const item of world.news) {
    item.title = delatinize(item.title, pairs)
    item.body = delatinize(item.body, pairs)
  }
  for (const event of Object.values(world.events)) {
    event.title = delatinize(event.title, pairs)
    event.body = delatinize(event.body, pairs)
    if (event.resultText) event.resultText = delatinize(event.resultText, pairs)
  }
  for (const relationship of Object.values(world.relationships)) {
    relationship.summary = delatinize(relationship.summary, pairs)
  }
}

/** 造一份 v5 开季存档：新闻与事件正文里点名的是拉丁原名。 */
export function v5World(seed = 2026): WorldState {
  const world = asV5(structuredClone(generateWorld(testOptions({ seed }), TEST_NOW)))
  const latinPlayer = Object.values(world.players).find((player) => /[A-Za-z]/.test(player.name))
  if (!latinPlayer) throw new Error('v5 fixture 需要一个拉丁原名球员')
  world.news = [
    {
      id: `news:${seed}:fixture`,
      season: world.season,
      week: world.week,
      day: world.day,
      kind: 'media',
      title: 'Round 1 report',
      body: `${latinPlayer.name} 在训练中被点名表扬。`,
    },
  ]
  const coach = world.relationships[`rel:coach:${world.playerId}`]
  world.events[`event:${seed}:fixture`] = {
    id: `event:${seed}:fixture`,
    templateId: 'legacy:coach_talk',
    title: '教练谈话',
    body: `${coach?.name ?? latinPlayer.name} 让你在训练后留下加练。`,
    season: world.season,
    week: world.week,
    createdAtWeek: world.week,
    expiresWeek: world.week + 1,
    status: 'open',
    choices: [{ id: 'accept', label: '留下加练', effects: [] }],
    source: 'template',
  }
  return world
}

/** 造一份停在关键回合的 v5 存档：战报文本里全是拉丁原名。 */
export function v5LiveWorld(seed = 2026): WorldState {
  const world = asV5(structuredClone(playToKeyMoments(seed).world))
  delatinizeWorld(world)
  return world
}

export function latinNameOf(world: WorldState): string {
  const player = Object.values(world.players).find((item) => /[A-Za-z]/.test(item.name))
  if (!player) throw new Error('v5 fixture 需要一个拉丁原名球员')
  return player.name
}
