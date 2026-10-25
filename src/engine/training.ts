import {
  TRAINING_ATTRS,
  TRAINING_LABELS,
  clamp,
  overall,
  round1,
} from '../domain/attributes'
import type { ExtraAction, TrainingFocus, WorldState } from '../domain/types'
import { createRng } from './rng'
import { applyEffects } from './effects'

export function recoverInjuries(world: WorldState): void {
  const user = world.players[world.playerId]
  if (!user?.injury) return
  user.injury.weeksLeft -= 1
  if (user.injury.weeksLeft <= 0) {
    const kind = user.injury.kind
    user.injury = null
    user.fitness = clamp(user.fitness + 10, 0, 100)
    world.news.unshift({
      id: `news:recover:${world.season}:${world.week}`,
      season: world.season,
      week: world.week,
      title: '伤愈复出',
      body: `${user.name} 已经从${kind}中恢复，重新加入球队合练。`,
      kind: 'club',
    })
  }
}

export function applyTraining(world: WorldState, focus: TrainingFocus): void {
  const user = world.players[world.playerId]
  const club = world.clubs[world.clubId]
  if (!user || !club) return
  if (user.injury) {
    user.fitness = clamp(user.fitness + 3, 0, 100)
    user.sharpness = clamp(user.sharpness - 1, 0, 100)
    return
  }

  const rng = createRng(world.seed, 'training', world.season, world.week)
  const currentOverall = overall(user)
  const headroom = Math.max(0, user.potential - currentOverall)
  const ageFactor = user.age <= 20 ? 1.25 : user.age <= 24 ? 1 : user.age <= 28 ? 0.72 : 0.35
  const facilityFactor = 0.78 + club.facilities / 40
  const coachFactor = 0.88 + club.coach.quality / 60
  const intensity = focus === 'recovery' ? 0.35 : 1
  const fitnessFactor = user.fitness < 40 ? 0.6 : 1
  const baseGrowth = (0.014 + headroom * 0.0022) * ageFactor * facilityFactor * coachFactor * intensity * fitnessFactor

  if (headroom > 0) {
    for (const attr of TRAINING_ATTRS[focus]) {
      const delta = round1(baseGrowth * rng.float(0.6, 1.4))
      user.attributes[attr] = clamp(round1(user.attributes[attr] + delta), 10, 96)
    }
  }

  const fitnessDelta =
    focus === 'physical' ? -9 : focus === 'technical' ? -6 : focus === 'tactical' ? -5 : 15
  user.fitness = clamp(user.fitness + fitnessDelta + 3, 0, 100)
  const sharpnessDelta =
    focus === 'physical' ? 3 : focus === 'technical' ? 4 : focus === 'tactical' ? 4 : -2
  user.sharpness = clamp(round1(user.sharpness + sharpnessDelta), 0, 100)
  if (focus === 'recovery') user.morale = clamp(user.morale + 1, 0, 100)
  if (focus === 'tactical') user.morale = clamp(user.morale + 0.5, 0, 100)

  const riskFactor = focus === 'physical' ? 1.5 : focus === 'technical' ? 0.8 : focus === 'tactical' ? 0.7 : 0.25
  const ageRisk = user.age >= 30 ? 1.3 : 1
  const injuryChance = 0.012 * (1 + (100 - user.fitness) / 100 * 1.2) * riskFactor * ageRisk
  if (rng.chance(injuryChance)) {
    const kind = rng.pick(['脚踝扭伤', '大腿肌肉拉伤', '膝盖不适', '腹股沟拉伤', '疲劳性损伤'])
    const weeks = rng.int(1, 5)
    user.injury = { kind, weeksLeft: weeks, severity: rng.int(1, 3) }
    world.news.unshift({
      id: `news:injury:${world.season}:${world.week}`,
      season: world.season,
      week: world.week,
      title: '训练中受伤',
      body: `${user.name} 在${TRAINING_LABELS[focus]}中${kind}，预计缺阵 ${weeks} 周。`,
      kind: 'club',
    })
  }
}

export function applyExtraAction(world: WorldState, action: ExtraAction): void {
  const user = world.players[world.playerId]
  if (!user) return
  switch (action) {
    case 'media':
      applyEffects(world, [{ op: 'mediaRep', delta: 1.5 }, { op: 'fanRep', delta: 1 }], '媒体活动')
      world.news.unshift({
        id: `news:extra:media:${world.season}:${world.week}`,
        season: world.season,
        week: world.week,
        title: '接受本地媒体采访',
        body: `${user.name} 在训练基地接受了《英伦体育报》的简短采访，表达了对出场机会的渴望。`,
        kind: 'media',
      })
      break
    case 'agent':
      applyEffects(world, [{ op: 'agentTrust', delta: 2 }, { op: 'money', delta: 200 }], '商业活动')
      world.news.unshift({
        id: `news:extra:agent:${world.season}:${world.week}`,
        season: world.season,
        week: world.week,
        title: '经纪人带来一次商业活动',
        body: '你的经纪人安排了一次小型品牌活动，收入不高，但能增加曝光。',
        kind: 'media',
      })
      break
    case 'social':
      applyEffects(
        world,
        [{ op: 'teammateTrust', delta: 2 }, { op: 'morale', delta: 2 }, { op: 'fitness', delta: -2 }],
        '队友聚会',
      )
      world.news.unshift({
        id: `news:extra:social:${world.season}:${world.week}`,
        season: world.season,
        week: world.week,
        title: '和队友一起吃饭',
        body: '你参加了队友组织的聚餐，更衣室里的气氛轻松了不少。',
        kind: 'club',
      })
      break
    case 'rest':
      applyEffects(
        world,
        [{ op: 'fitness', delta: 8 }, { op: 'sharpness', delta: -2 }, { op: 'morale', delta: 1 }],
        '休息恢复',
      )
      world.news.unshift({
        id: `news:extra:rest:${world.season}:${world.week}`,
        season: world.season,
        week: world.week,
        title: '把时间留给恢复',
        body: '你减少了额外训练，专注于睡眠、拉伸和恢复。',
        kind: 'club',
      })
      break
    case 'family':
      applyEffects(
        world,
        [{ op: 'familyTrust', delta: 3 }, { op: 'morale', delta: 3 }, { op: 'fitness', delta: 2 }],
        '陪伴家人',
      )
      world.news.unshift({
        id: `news:extra:family:${world.season}:${world.week}`,
        season: world.season,
        week: world.week,
        title: '回家看看',
        body: '你抽时间回家陪了家人。看台上的支持，有时候比训练更能让人安心。',
        kind: 'club',
      })
      break
    case 'none':
      break
  }
}
