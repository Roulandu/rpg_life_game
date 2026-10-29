import { overall } from '../domain'
import type { Club, Finance, Id, Player, Relationship, WorldState } from '../domain'
import { createRng, type Rng } from '../lib'
import { START_SEASON } from './constants'
import { makeName } from './playerFactory'

interface RelationshipContext {
  user: Player
  club: Club
  players: Record<Id, Player>
  rng: Rng
  relationships: Record<Id, Relationship>
}

function addCoachRelationship(context: RelationshipContext): void {
  const { user, club, rng, relationships } = context
  const coachTrust = 48 + (user.age <= 18 ? 6 : 2) + rng.int(-5, 7)
  relationships[`rel:coach:${user.id}`] = {
    id: `rel:coach:${user.id}`,
    name: club.coach.name,
    role: 'coach',
    trust: coachTrust,
    tension: 8,
    summary: '主教练对你的第一印象。训练和比赛表现会改变他的判断。',
    lastInteractionWeek: 0,
  }
}

function addTeammateRelationships(context: RelationshipContext): void {
  const { club, players, rng, relationships } = context
  const teammates = club.squadIds
    .map((id) => players[id])
    .filter((player): player is Player => Boolean(player) && !player.isUser)
    .sort((a, b) => overall(b) - overall(a) || a.id.localeCompare(b.id))
    .slice(0, 3)
  teammates.forEach((mate, index) => {
    relationships[`rel:teammate:${mate.id}`] = {
      id: `rel:teammate:${mate.id}`,
      name: mate.name,
      role: 'teammate',
      trust: 50 + rng.int(-4, 10) - (index === 0 ? 4 : 0),
      tension: index === 0 ? 12 : 3,
      summary:
        index === 0
          ? `球队核心，和你竞争同一个位置。${mate.name} 会密切关注你的表现。`
          : `更衣室里的${index === 1 ? '老将' : '同龄人'}，关系从日常相处开始。`,
      lastInteractionWeek: 0,
    }
  })
}

function addAgentRelationship(context: RelationshipContext): void {
  const { user, rng, relationships } = context
  relationships[`rel:agent:${user.id}`] = {
    id: `rel:agent:${user.id}`,
    name: makeName(rng, '英格兰'),
    role: 'agent',
    trust: 55,
    tension: 0,
    summary: '你的经纪人，负责合同、赞助和转会机会。',
    lastInteractionWeek: 0,
  }
}

function addFixedRelationships(context: RelationshipContext): void {
  const { user, relationships } = context
  relationships[`rel:family:${user.id}`] = {
    id: `rel:family:${user.id}`,
    name: '家人',
    role: 'family',
    trust: 78,
    tension: 0,
    summary: '无论你踢得好不好，他们都在看台上。',
    lastInteractionWeek: 0,
  }
  relationships[`rel:media:${user.id}`] = {
    id: `rel:media:${user.id}`,
    name: '英伦体育报',
    role: 'media',
    trust: 42,
    tension: 0,
    summary: '当地媒体，对你的潜力持观望态度。',
    lastInteractionWeek: 0,
  }
  relationships[`rel:fan:${user.id}`] = {
    id: `rel:fan:${user.id}`,
    name: '看台',
    role: 'fan',
    trust: 45,
    tension: 0,
    summary: '球迷还不太认识你，一次亮眼表现就能改变印象。',
    lastInteractionWeek: 0,
  }
}

export function createRelationships(
  user: Player,
  club: Club,
  players: Record<Id, Player>,
  seed: number,
): Record<Id, Relationship> {
  const rng = createRng(seed, 'relationships', user.id)
  const relationships: Record<Id, Relationship> = {}
  const context: RelationshipContext = { user, club, players, rng, relationships }
  addCoachRelationship(context)
  addTeammateRelationships(context)
  addAgentRelationship(context)
  addFixedRelationships(context)
  return relationships
}

export function createFinance(user: Player): Finance {
  const weeklyWage = user.contract.wageWeekly
  const weeklyExpenses = Math.round(weeklyWage * 0.18) + 15000
  const signingBonus = user.contract.signingBonus ?? weeklyWage * 4
  return {
    balance: weeklyWage * 10 + signingBonus + 300000,
    weeklyWage,
    weeklyExpenses,
    ledger: [
      {
        week: 0,
        season: START_SEASON,
        type: 'other',
        amount: weeklyWage * 10,
        label: '起步资金',
      },
      {
        week: 0,
        season: START_SEASON,
        type: 'bonus',
        amount: signingBonus,
        label: '签约奖金',
      },
      {
        week: 0,
        season: START_SEASON,
        type: 'other',
        amount: 300000,
        label: '个人积蓄',
      },
    ],
    assets: ['一间租来的公寓'],
    sponsorships: [],
  }
}

export function initialNews(user: Player, club: Club): WorldState['news'] {
  return [
    {
      id: `news:welcome:${user.id}`,
      season: START_SEASON,
      week: 1,
      title: `欢迎来到 ${club.nameZh}`,
      body: `${user.name} 与 ${club.nameZh} 签下了第一份职业合同。教练组希望你在训练中证明自己。`,
      kind: 'club',
    },
    {
      id: `news:coach:${user.id}`,
      season: START_SEASON,
      week: 1,
      title: '主教练的第一句话',
      body: `${club.coach.name}：“我不看年龄，只看训练和比赛。想上场，就先让我看到你。”`,
      kind: 'club',
    },
  ]
}

export function createSettings(): WorldState['settings'] {
  return {
    provider: 'openai',
    model: 'gpt-4.1-mini',
    narrativeDensity: 'standard',
    aiMode: 'template',
    baseUrl: '',
    networkMode: 'auto',
    tokenParam: 'max_tokens',
    temperature: 0.85,
    rememberKey: false,
  }
}
