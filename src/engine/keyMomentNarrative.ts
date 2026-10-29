import type { KeyMoment, KeyMomentOption, MatchReport, WorldState } from '../domain'

interface OutcomeVariant {
  success: string
  fail: string
}

const OUTCOME_TEXTS: Record<string, OutcomeVariant> = {
  'bigChance:hold': {
    success: '{player} 护住球权，等待队友压上。',
    fail: '{player} 护球时被对手从身后捅走。',
  },
  bigChance: {
    success: '{player} 的射门擦着立柱出了底线。',
    fail: '{player} 的射门被门将封出。',
  },
  penalty: {
    success: '{player} 稳稳罚进点球。',
    fail: '{player} 的点球被门将扑出。',
  },
  'throughBall:simple': {
    success: '{player} 把球分到边路，球队继续组织。',
    fail: '{player} 的转移球被对手预判。',
  },
  throughBall: {
    success: '{player} 带球推进，把球队带过中场。',
    fail: '{player} 在推进中被对手断下。',
  },
  'duel:foul': {
    success: '{player} 用战术犯规终止了反击，裁判口头警告。',
    fail: '{player} 的犯规慢了一步，裁判出示黄牌。',
  },
  duel: {
    success: '{player} 把球断下，立刻发动反击。',
    fail: '对手从 {player} 身边抹过，形成威胁。',
  },
  save: {
    success: '{player} 把对手的射门挡出底线！',
    fail: '{player} 判断慢了半拍，球从手边飞过。',
  },
  'clearance:calm': {
    success: '{player} 冷静地把球传出危险区域。',
    fail: '{player} 的出球被对手截下。',
  },
  clearance: {
    success: '{player} 把球踢向看台，化解险情。',
    fail: '{player} 的解围没有踢远。',
  },
}

function goalText(playerName: string, optionId: string): string {
  return optionId === 'panenka'
    ? `${playerName} 用一记勺子点球骗过门将！`
    : `${playerName} 把球送进网窝！`
}

function assistText(playerName: string, optionId: string): string {
  const phrase = optionId === 'thread' ? '送出一脚穿透防线的直塞' : '把球舒服地送到门前'
  return `${playerName} ${phrase}，队友破门得分！`
}

export function outcomeText(
  moment: KeyMoment,
  option: KeyMomentOption,
  success: boolean,
  playerName: string,
): string {
  if (success && option.goalOnSuccess) return goalText(playerName, option.id)
  if (success && option.assistOnSuccess) return assistText(playerName, option.id)
  const variant = OUTCOME_TEXTS[`${moment.kind}:${option.id}`] ?? OUTCOME_TEXTS[moment.kind]!
  return (success ? variant.success : variant.fail).replaceAll('{player}', playerName)
}

export function refreshMatchNews(world: WorldState, report: MatchReport, playerName: string): void {
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

export function refreshScoreTimeline(report: MatchReport): void {
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

export function buildMediaReaction(
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
