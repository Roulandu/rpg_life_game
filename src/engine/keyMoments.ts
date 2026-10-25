import { clamp, positionGroup, round1 } from '../domain/attributes'
import type {
  KeyMoment,
  KeyMomentKind,
  KeyMomentOption,
  MatchReport,
  Player,
  WorldState,
} from '../domain/types'
import type { Rng } from './rng'
import { adjustRelationship, getRelationshipByRole } from './relationships'

interface KindContext {
  player: Player
  isHome: boolean
}

function chance(value: number, low: number, high: number): number {
  return round1(clamp(value, low, high) * 100) / 100
}

function option(
  id: string,
  labelZh: string,
  descriptionZh: string,
  successChance: number,
  ratingOnSuccess: number,
  ratingOnFail: number,
  extra: Partial<KeyMomentOption> = {},
): KeyMomentOption {
  return { id, labelZh, descriptionZh, successChance, ratingOnSuccess, ratingOnFail, ...extra }
}

function optionsFor(kind: KeyMomentKind, context: KindContext): KeyMomentOption[] {
  const { player } = context
  const attrs = player.attributes
  const mental = attrs.mental / 100

  switch (kind) {
    case 'bigChance':
      return [
        option(
          'shoot',
          '直接射门',
          '把握机会自己解决，角度被封堵时容易浪费。',
          chance(0.3 + attrs.shooting * 0.004 + mental * 0.08, 0.2, 0.74),
          0.75,
          -0.35,
          { goalOnSuccess: true, coachOnSuccess: 0.5, moraleOnSuccess: 2, moraleOnFail: -1 },
        ),
        option(
          'square',
          '横传队友',
          '把球送到更好的位置，可能收获一次助攻。',
          chance(0.48 + attrs.passing * 0.003, 0.4, 0.86),
          0.45,
          -0.1,
          { assistOnSuccess: true, coachOnSuccess: 0.4, moraleOnSuccess: 1.5 },
        ),
        option(
          'hold',
          '护球等待支援',
          '几乎不会丢球，但很难制造直接威胁。',
          0.92,
          0.05,
          -0.05,
          { moraleOnSuccess: 0.5 },
        ),
      ]
    case 'penalty':
      return [
        option(
          'placed',
          '推射死角',
          '稳妥的角度与力量，门将很难够到。',
          chance(0.68 + attrs.shooting * 0.002, 0.55, 0.88),
          0.9,
          -0.7,
          { goalOnSuccess: true, coachOnSuccess: 0.6, moraleOnSuccess: 3, moraleOnFail: -2 },
        ),
        option(
          'power',
          '大力抽射',
          '用力量压制门将，但容错更低。',
          chance(0.58 + attrs.shooting * 0.002, 0.45, 0.8),
          1,
          -0.8,
          { goalOnSuccess: true, coachOnSuccess: 0.5, moraleOnSuccess: 3, moraleOnFail: -2 },
        ),
        option(
          'panenka',
          '勺子点球',
          '如果能骗过门将，这会成为本轮话题。',
          chance(0.4 + attrs.technique * 0.003, 0.3, 0.7),
          1.35,
          -1.1,
          { goalOnSuccess: true, coachOnSuccess: 0.2, moraleOnSuccess: 4, moraleOnFail: -3 },
        ),
      ]
    case 'throughBall':
      return [
        option(
          'thread',
          '直塞身后',
          '最危险也最致命的选择，需要精准的脚法。',
          chance(0.34 + attrs.passing * 0.004, 0.28, 0.72),
          0.65,
          -0.4,
          { assistOnSuccess: true, coachOnSuccess: 0.5, moraleOnSuccess: 2 },
        ),
        option(
          'simple',
          '分边转移',
          '把球送到安全区域，保持球队的节奏。',
          chance(0.74 + attrs.passing * 0.0015, 0.6, 0.9),
          0.15,
          -0.1,
          { coachOnSuccess: 0.2 },
        ),
        option(
          'carry',
          '自己带球推进',
          '用盘带撕开空间，失败会把球权送回去。',
          chance(0.46 + attrs.dribbling * 0.003, 0.35, 0.75),
          0.35,
          -0.25,
          { moraleOnSuccess: 1, moraleOnFail: -0.5 },
        ),
      ]
    case 'duel':
      return [
        option(
          'commit',
          '贴身对抗',
          '主动上抢能直接终结进攻，也可能被一步过掉。',
          chance(0.3 + attrs.defending * 0.004 + attrs.physical * 0.002, 0.25, 0.72),
          0.55,
          -0.5,
          { coachOnSuccess: 1, coachOnFail: -0.5, moraleOnSuccess: 1.5, moraleOnFail: -1 },
        ),
        option(
          'contain',
          '保持站位',
          '不轻易出脚，把对手逼向边路。',
          chance(0.66 + attrs.defending * 0.002, 0.55, 0.85),
          0.15,
          -0.15,
          { coachOnSuccess: 0.3 },
        ),
        option(
          'foul',
          '战术犯规',
          '用犯规终止反击，代价是可能吃牌。',
          chance(0.84, 0.7, 0.9),
          -0.2,
          -0.65,
          { coachOnSuccess: 0.5, coachOnFail: -0.6, moraleOnSuccess: -0.5 },
        ),
      ]
    case 'save':
      return [
        option(
          'reflex',
          '飞身扑救',
          '用反应速度赌一个不可思议的扑救。',
          chance(0.3 + attrs.goalkeeping * 0.005, 0.2, 0.78),
          0.9,
          -0.7,
          { coachOnSuccess: 1, moraleOnSuccess: 2, moraleOnFail: -1 },
        ),
        option(
          'position',
          '封住近角',
          '先把角度封死，把难题交给对手。',
          chance(0.54 + attrs.goalkeeping * 0.003, 0.45, 0.82),
          0.45,
          -0.5,
          { coachOnSuccess: 0.4 },
        ),
        option(
          'rush',
          '出击干扰',
          '扩大防守范围，但身后会留下空门。',
          chance(0.42 + attrs.goalkeeping * 0.002 + attrs.mental * 0.002, 0.3, 0.76),
          0.6,
          -0.9,
          { coachOnSuccess: 0.6, coachOnFail: -0.6 },
        ),
      ]
    case 'clearance':
      return [
        option(
          'hoof',
          '大脚解围',
          '把危险踢远，最务实的选择。',
          0.9,
          0.1,
          -0.05,
          { coachOnSuccess: 0.2 },
        ),
        option(
          'calm',
          '控球出压',
          '冷静地把球传出去，能换来教练的信任。',
          chance(0.4 + attrs.passing * 0.004, 0.3, 0.78),
          0.4,
          -0.45,
          { coachOnSuccess: 0.5, coachOnFail: -0.4 },
        ),
        option(
          'shield',
          '护球造犯规',
          '用身体把对手挡在身后，争取定位球。',
          chance(0.68 + attrs.physical * 0.002, 0.55, 0.85),
          0.2,
          -0.2,
          {},
        ),
      ]
  }
}

const KIND_TITLES: Record<KeyMomentKind, string> = {
  bigChance: '禁区里的机会',
  penalty: '点球点前',
  throughBall: '中场的出球选择',
  duel: '防线前的对抗',
  save: '门前的考验',
  clearance: '禁区内的解围',
}

const KIND_PROMPTS: Record<KeyMomentKind, string> = {
  bigChance: '球落到你脚下，禁区内只剩一次触球的空间。你准备怎么处理？',
  penalty: '裁判指向点球点。全场安静下来，你抱起球走向十二码。',
  throughBall: '队友前插，防线之间露出一条缝隙。球在你脚下。',
  duel: '对手带球向你逼近，身后就是禁区。你必须做出选择。',
  save: '对手在近距离起脚，你只有一瞬间判断方向。',
  clearance: '禁区里一片混乱，球正滚向危险区域。',
}

function kindPool(player: Player): KeyMomentKind[] {
  switch (positionGroup(player.position)) {
    case 'GK':
      return ['save', 'save', 'clearance']
    case 'DEF':
      return ['duel', 'clearance', 'duel', 'bigChance']
    case 'MID':
      return ['throughBall', 'bigChance', 'duel', 'penalty']
    case 'FWD':
      return ['bigChance', 'bigChance', 'penalty', 'throughBall']
  }
}

export function generateKeyMoments(
  player: Player,
  rng: Rng,
  minutes: number,
  isHome: boolean,
  startMinute = 0,
): KeyMoment[] {
  if (minutes <= 0) return []
  const windowStart = Math.max(1, startMinute + 2)
  const windowEnd = Math.min(89, startMinute + minutes - 1)
  if (windowEnd <= windowStart) return []

  const maxCount = minutes >= 70 ? 4 : minutes >= 40 ? 3 : 2
  const count = Math.min(rng.int(2, 4), maxCount)
  const pool = rng.shuffle(kindPool(player))
  const moments: KeyMoment[] = []
  let lastMinute = windowStart - 1

  for (let index = 0; index < count; index += 1) {
    const kind = pool[index % pool.length] as KeyMomentKind
    const target =
      Math.round(windowStart + ((index + 1) * (windowEnd - windowStart)) / (count + 1)) +
      rng.int(-3, 3)
    const minute = Math.max(lastMinute + 1, Math.min(windowEnd, target))
    if (minute <= lastMinute) break
    lastMinute = minute
    const options = optionsFor(kind, { player, isHome })
    const safest = [...options].sort((a, b) => b.successChance - a.successChance)[0] as KeyMomentOption
    moments.push({
      id: `km:${player.id}:${index}`,
      minute,
      kind,
      titleZh: KIND_TITLES[kind],
      promptZh: KIND_PROMPTS[kind],
      options,
      defaultOptionId: safest.id,
      roll: Math.round(rng.next() * 10000) / 10000,
    })
  }
  return moments
}

function outcomeText(
  moment: KeyMoment,
  option: KeyMomentOption,
  success: boolean,
  playerName: string,
): string {
  const goal = success && Boolean(option.goalOnSuccess)
  const assist = success && Boolean(option.assistOnSuccess)

  if (goal) {
    return `${playerName} ${option.id === 'panenka' ? '用一记勺子点球骗过门将' : '把球送进网窝'}！`
  }
  if (assist) {
    return `${playerName} ${option.id === 'thread' ? '送出一脚穿透防线的直塞' : '把球舒服地送到门前'}，队友破门得分！`
  }

  switch (moment.kind) {
    case 'bigChance':
      if (option.id === 'hold') {
        return success
          ? `${playerName} 护住球权，等待队友压上。`
          : `${playerName} 护球时被对手从身后捅走。`
      }
      return success
        ? `${playerName} 的射门擦着立柱出了底线。`
        : `${playerName} 的射门被门将封出。`
    case 'penalty':
      return success ? `${playerName} 稳稳罚进点球。` : `${playerName} 的点球被门将扑出。`
    case 'throughBall':
      if (option.id === 'simple') {
        return success
          ? `${playerName} 把球分到边路，球队继续组织。`
          : `${playerName} 的转移球被对手预判。`
      }
      return success
        ? `${playerName} 带球推进，把球队带过中场。`
        : `${playerName} 在推进中被对手断下。`
    case 'duel':
      if (option.id === 'foul') {
        return success
          ? `${playerName} 用战术犯规终止了反击，裁判口头警告。`
          : `${playerName} 的犯规慢了一步，裁判出示黄牌。`
      }
      return success
        ? `${playerName} 把球断下，立刻发动反击。`
        : `对手从 ${playerName} 身边抹过，形成威胁。`
    case 'save':
      return success
        ? `${playerName} 把对手的射门挡出底线！`
        : `${playerName} 判断慢了半拍，球从手边飞过。`
    case 'clearance':
      if (option.id === 'calm') {
        return success
          ? `${playerName} 冷静地把球传出危险区域。`
          : `${playerName} 的出球被对手截下。`
      }
      return success ? `${playerName} 把球踢向看台，化解险情。` : `${playerName} 的解围没有踢远。`
  }
}

function userSide(report: MatchReport, world: WorldState): 'home' | 'away' {
  return report.homeId === world.clubId ? 'home' : 'away'
}

function refreshMatchNews(world: WorldState, report: MatchReport, playerName: string): void {
  const item = world.news.find((entry) => entry.id === `news:match:${report.fixtureId}`)
  if (item) {
    item.title = `${report.homeName} ${report.homeGoals}-${report.awayGoals} ${report.awayName}`
    item.body = report.userPlayed
      ? `${playerName} ${report.userStarted ? '首发' : '替补'}出场 ${report.userMinutes} 分钟，获得 ${report.userRating?.toFixed(1)} 分，${report.userGoals} 球 ${report.userAssists} 助攻。`
      : `${playerName} 未获得出场机会。`
  }
  const thriller = world.news.find((entry) => entry.id === `news:thriller:${report.fixtureId}`)
  if (thriller) {
    thriller.body = `${report.homeName} 与 ${report.awayName} 联手奉献了 ${report.homeGoals + report.awayGoals} 个进球。`
  }
}

function refreshScoreTimeline(report: MatchReport): void {
  for (const event of report.events) {
    if (event.type === 'fulltime') {
      event.text = `全场结束，${report.homeName} ${report.homeGoals}-${report.awayGoals} ${report.awayName}。`
    } else if (
      event.type === 'info' &&
      event.minute === 45 &&
      report.halfTimeHomeGoals !== undefined &&
      report.halfTimeAwayGoals !== undefined
    ) {
      event.text = `半场结束，${report.homeName} ${report.halfTimeHomeGoals}-${report.halfTimeAwayGoals} ${report.awayName}。`
    }
  }
}

function buildMediaReaction(
  report: MatchReport,
  playerName: string,
  successes: number,
  total: number,
  userIsHome: boolean,
): string {
  const rating = report.userRating ?? 0
  const momentNote = total > 0 ? `他在 ${total} 次关键回合中赢下 ${successes} 次。` : ''
  const userGoals = userIsHome ? report.homeGoals : report.awayGoals
  const opponentGoals = userIsHome ? report.awayGoals : report.homeGoals
  const resultNote =
    userGoals === opponentGoals
      ? '球队只拿到一场平局。'
      : userGoals > opponentGoals
        ? '球队拿到了胜利。'
        : '球队的结果并不理想。'

  if (rating >= 8.3) {
    return `《比赛日》把 ${playerName} 选入本轮焦点，认为他几乎凭一己之力改变了比赛。${momentNote}`
  }
  if (rating >= 7.2) {
    return `媒体称赞 ${playerName} 的表现“干净而有效”，特别提到了他在关键时刻的处理。${momentNote}`
  }
  if (rating >= 6.3) {
    return `评论认为 ${playerName} 完成了教练布置的任务，但还没有真正决定比赛。${momentNote}${resultNote}`
  }
  return `评论员对 ${playerName} 的表现提出疑问，认为他在关键回合里显得有些犹豫。${momentNote}${resultNote}`
}

export function pendingKeyMoments(world: WorldState): KeyMoment[] {
  return (world.lastMatch?.keyMoments ?? []).filter((moment) => !moment.outcome)
}

export function hasPendingKeyMoments(world: WorldState): boolean {
  return pendingKeyMoments(world).length > 0
}

export function resolveKeyMoment(
  world: WorldState,
  momentId: string,
  optionId: string,
): MatchReport | null {
  const report = world.lastMatch
  if (!report) return null
  const moments = report.keyMoments ?? []
  const nextMoment = moments.find((moment) => !moment.outcome)
  if (!nextMoment || nextMoment.id !== momentId) return null
  const choice = nextMoment.options.find((item) => item.id === optionId)
  if (!choice) return null

  const user = world.players[world.playerId]
  if (!user) return null

  const success = nextMoment.roll < choice.successChance
  const goal = success && Boolean(choice.goalOnSuccess)
  const assist = success && Boolean(choice.assistOnSuccess)
  const ratingDelta = success ? choice.ratingOnSuccess : choice.ratingOnFail
  const moraleDelta = success ? (choice.moraleOnSuccess ?? 0) : (choice.moraleOnFail ?? 0)
  const coachDelta = success ? (choice.coachOnSuccess ?? 0) : (choice.coachOnFail ?? 0)

  nextMoment.outcome = {
    optionId,
    success,
    textZh: outcomeText(nextMoment, choice, success, user.name),
    ratingDelta,
    moraleDelta,
    coachDelta,
    goal,
    assist,
  }

  if (goal || assist) {
    const side = userSide(report, world)
    if (side === 'home') {
      report.homeGoals += 1
      if (nextMoment.minute <= 45 && report.halfTimeHomeGoals !== undefined) {
        report.halfTimeHomeGoals += 1
      }
    } else {
      report.awayGoals += 1
      if (nextMoment.minute <= 45 && report.halfTimeAwayGoals !== undefined) {
        report.halfTimeAwayGoals += 1
      }
    }
    if (goal) {
      report.userGoals += 1
      user.seasonStats.goals += 1
    }
    if (assist) {
      report.userAssists += 1
      user.seasonStats.assists += 1
    }
    const fixture = world.fixtures[report.fixtureId]
    if (fixture) {
      fixture.homeGoals = report.homeGoals
      fixture.awayGoals = report.awayGoals
    }
  }

  if (report.userRating != null) {
    const previous = report.userRating
    report.userRating = clamp(round1(previous + ratingDelta), 4.3, 9.9)
    user.seasonStats.ratingSum += report.userRating - previous
    user.form = clamp(round1(user.form + ratingDelta * 4), 0, 100)
    if (report.userRating >= 8.3) {
      report.motmName = user.name
      report.motmRating = report.userRating
    }
  }

  user.morale = clamp(user.morale + moraleDelta, 0, 100)
  user.confidence = clamp(user.confidence + (success ? 1 : -1), 0, 100)
  adjustRelationship(getRelationshipByRole(world, 'coach'), coachDelta)
  if (goal || assist) {
    adjustRelationship(getRelationshipByRole(world, 'media'), goal ? 1.5 : 0.8)
    adjustRelationship(getRelationshipByRole(world, 'fan'), goal ? 1.2 : 0.6)
  }

  report.events.push({
    minute: nextMoment.minute,
    type: goal ? 'goal' : assist ? 'assist' : nextMoment.kind === 'save' ? 'save' : 'chance',
    text: nextMoment.outcome.textZh,
    isUser: true,
  })
  report.events.sort((a, b) => a.minute - b.minute)

  if (goal || assist) {
    refreshMatchNews(world, report, user.name)
    refreshScoreTimeline(report)
  }

  return report
}

export function autoResolveKeyMoments(world: WorldState): MatchReport | null {
  const report = world.lastMatch
  if (!report) return null
  for (const moment of report.keyMoments ?? []) {
    if (moment.outcome) continue
    resolveKeyMoment(world, moment.id, moment.defaultOptionId)
  }
  return report
}

export function finalizeMatchday(world: WorldState): MatchReport | null {
  const report = world.lastMatch
  if (!report) return null
  const moments = report.keyMoments ?? []
  if (moments.some((moment) => !moment.outcome)) return null
  const user = world.players[world.playerId]
  if (!user) return report
  const outcomes = moments.map((moment) => moment.outcome).filter((outcome) => Boolean(outcome))
  report.mediaReaction = buildMediaReaction(
    report,
    user.name,
    outcomes.filter((outcome) => outcome?.success).length,
    outcomes.length,
    report.homeId === world.clubId,
  )
  refreshMatchNews(world, report, user.name)
  refreshScoreTimeline(report)
  return report
}
