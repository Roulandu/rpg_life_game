import { TRAINING_ATTRS, TRAINING_LABELS, clamp, overall, round1, roundAttr } from '../domain'
import type { Club, ExtraAction, Player, TrainingFocus, WorldState } from '../domain'
import type { Rng } from '../lib'
import { dailyId, dayRng } from './dayContext'
import { applyEffects } from './effects'

/** 一周有五个训练槽（周一到周五，减去比赛日），所以单次量 = 原周量 ÷ 5。 */
const PER_DAY = 1 / 5

export function advanceInjuries(world: WorldState): boolean {
  const user = world.players[world.playerId]
  if (!user?.injury) return false
  user.injury.daysLeft -= 1
  if (user.injury.daysLeft > 0) return false

  const kind = user.injury.kind
  user.injury = null
  user.fitness = clamp(user.fitness + 10, 0, 100)
  world.news.unshift({
    id: dailyId(world, 'news:recover'),
    season: world.season,
    week: world.week,
    day: world.day,
    title: '伤愈复出',
    body: `${user.name} 已经从${kind}中恢复，重新加入球队合练。`,
    kind: 'club',
  })
  return true
}

function trainInjury(world: WorldState, focus: TrainingFocus, rng: Rng): void {
  const user = world.players[world.playerId]
  if (!user) return
  const riskFactor =
    focus === 'physical' ? 1.5 : focus === 'technical' ? 0.8 : focus === 'tactical' ? 0.7 : 0.25
  const ageRisk = user.age >= 30 ? 1.3 : 1
  const chance = 0.012 * PER_DAY * (1 + ((100 - user.fitness) / 100) * 1.2) * riskFactor * ageRisk
  if (!rng.chance(chance)) return

  const kind = rng.pick(['脚踝扭伤', '大腿肌肉拉伤', '膝盖不适', '腹股沟拉伤', '疲劳性损伤'])
  const days = rng.int(7, 35)
  user.injury = { kind, daysLeft: days, severity: rng.int(1, 3) }
  world.news.unshift({
    id: dailyId(world, 'news:injury'),
    season: world.season,
    week: world.week,
    day: world.day,
    title: '训练中受伤',
    body: `${user.name} 在${TRAINING_LABELS[focus]}中${kind}，预计缺阵 ${days} 天。`,
    kind: 'club',
  })
}

function ageFactor(age: number): number {
  if (age <= 20) return 1.25
  if (age <= 24) return 1
  if (age <= 28) return 0.72
  return 0.35
}

/** 单次训练的成长量：潜力余量越大、设施与教练越好、年龄越小，长得越多。 */
function dailyGrowth(user: Player, club: Club, focus: TrainingFocus): number {
  const headroom = Math.max(0, user.potential - overall(user))
  const intensity = focus === 'recovery' ? 0.35 : 1
  const fitnessFactor = user.fitness < 40 ? 0.6 : 1
  return (
    (0.014 + headroom * 0.0022) *
    ageFactor(user.age) *
    (0.78 + club.facilities / 40) *
    (0.88 + club.coach.quality / 60) *
    intensity *
    fitnessFactor *
    PER_DAY
  )
}

function applyConditionDeltas(user: Player, focus: TrainingFocus): void {
  const fitnessDelta = focus === 'physical' ? -9 : focus === 'technical' ? -6 : focus === 'tactical' ? -5 : 15
  user.fitness = clamp(user.fitness + (fitnessDelta + 3) * PER_DAY, 0, 100)
  const sharpnessDelta = focus === 'physical' ? 3 : focus === 'technical' ? 4 : focus === 'tactical' ? 4 : -2
  user.sharpness = clamp(round1(user.sharpness + sharpnessDelta * PER_DAY), 0, 100)
  if (focus === 'recovery') user.morale = clamp(user.morale + 1 * PER_DAY, 0, 100)
  if (focus === 'tactical') user.morale = clamp(user.morale + 0.5 * PER_DAY, 0, 100)
}

export function applyDailyTraining(world: WorldState, focus: TrainingFocus): void {
  const user = world.players[world.playerId]
  const club = world.clubs[world.clubId]
  if (!user || !club) return
  if (user.injury) {
    user.fitness = clamp(user.fitness + 3 * PER_DAY, 0, 100)
    user.sharpness = clamp(user.sharpness - 1 * PER_DAY, 0, 100)
    return
  }

  const rng = dayRng(world, 'training')
  const growth = dailyGrowth(user, club, focus)
  if (user.potential - overall(user) > 0) {
    for (const attr of TRAINING_ATTRS[focus]) {
      const delta = roundAttr(growth * rng.float(0.6, 1.4))
      user.attributes[attr] = clamp(roundAttr(user.attributes[attr] + delta), 10, 96)
    }
  }

  applyConditionDeltas(user, focus)
  trainInjury(world, focus, rng)
}

function announce(world: WorldState, id: string, title: string, body: string, kind: 'media' | 'club'): void {
  world.news.unshift({
    id: dailyId(world, id),
    season: world.season,
    week: world.week,
    day: world.day,
    title,
    body,
    kind,
  })
}

export function applyDailyAction(world: WorldState, action: ExtraAction): void {
  const user = world.players[world.playerId]
  if (!user) return
  switch (action) {
    case 'media':
      applyEffects(world, [{ op: 'mediaRep', delta: 1.5 }, { op: 'fanRep', delta: 1 }], '媒体活动')
      announce(world, 'news:extra:media', '接受本地媒体采访', `${user.name} 在训练基地接受了《英伦体育报》的简短采访，表达了对出场机会的渴望。`, 'media')
      break
    case 'agent':
      applyEffects(world, [{ op: 'agentTrust', delta: 2 }, { op: 'money', delta: 200 }], '商业活动')
      announce(world, 'news:extra:agent', '经纪人带来一次商业活动', '你的经纪人安排了一次小型品牌活动，收入不高，但能增加曝光。', 'media')
      break
    case 'social':
      applyEffects(
        world,
        [{ op: 'teammateTrust', delta: 2 }, { op: 'morale', delta: 2 }, { op: 'fitness', delta: -2 }],
        '队友聚会',
      )
      announce(world, 'news:extra:social', '和队友一起吃饭', '你参加了队友组织的聚餐，更衣室里的气氛轻松了不少。', 'club')
      break
    case 'rest':
      applyEffects(
        world,
        [{ op: 'fitness', delta: 8 }, { op: 'sharpness', delta: -2 }, { op: 'morale', delta: 1 }],
        '休息恢复',
      )
      announce(world, 'news:extra:rest', '把时间留给恢复', '你减少了额外训练，专注于睡眠、拉伸和恢复。', 'club')
      break
    case 'family':
      applyEffects(
        world,
        [{ op: 'familyTrust', delta: 3 }, { op: 'morale', delta: 3 }, { op: 'fitness', delta: 2 }],
        '陪伴家人',
      )
      announce(world, 'news:extra:family', '回家看看', '你抽时间回家陪了家人。看台上的支持，有时候比训练更能让人安心。', 'club')
      break
    case 'none':
      break
  }
}
