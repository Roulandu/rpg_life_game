import type { SaveStorage } from './save'
import type { GameState } from './types'

export const ACHIEVEMENTS_KEY = 'rpg-life-game:achievements'

export interface Achievement {
  id: string
  title: string
  description: string
  check: (state: GameState) => boolean
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first-choice',
    title: '人生第一步',
    description: '做出人生中的第一个选择。',
    check: (state) => state.age >= 1,
  },
  {
    id: 'lifelong-learner',
    title: '终身学习',
    description: '报名进修，充实自己。',
    check: (state) => state.milestones.includes('studied'),
  },
  {
    id: 'serial-entrepreneur',
    title: '勇敢创业',
    description: '抓住创业的冲动，放手一搏。',
    check: (state) => state.milestones.includes('started-business'),
  },
  {
    id: 'prestige-graduate',
    title: '顶尖学府',
    description: '凭借优异的成绩进入名校。',
    check: (state) => state.milestones.includes('prestige-school'),
  },
  {
    id: 'socialite',
    title: '精英人脉',
    description: '踏入高端社交圈。',
    check: (state) => state.milestones.includes('vip-network'),
  },
  {
    id: 'wealthy',
    title: '家财万贯',
    description: '累计财富达到 1000。',
    check: (state) => state.wealth >= 1000,
  },
  {
    id: 'genius',
    title: '天纵奇才',
    description: '智力达到 90。',
    check: (state) => state.attributes.intelligence >= 90,
  },
  {
    id: 'athletic',
    title: '体格强健',
    description: '体力达到 90。',
    check: (state) => state.attributes.physique >= 90,
  },
  {
    id: 'charisma',
    title: '魅力四射',
    description: '魅力达到 90。',
    check: (state) => state.attributes.charm >= 90,
  },
  {
    id: 'all-rounder',
    title: '全面发展',
    description: '智力、体力、魅力全部达到 60。',
    check: (state) =>
      state.attributes.intelligence >= 60 &&
      state.attributes.physique >= 60 &&
      state.attributes.charm >= 60,
  },
]

export function achievementsFor(state: GameState): Achievement[] {
  return ACHIEVEMENTS.filter((achievement) => achievement.check(state))
}

export function newlyUnlocked(state: GameState, unlockedIds: string[]): Achievement[] {
  const already = new Set(unlockedIds)
  return achievementsFor(state).filter((achievement) => !already.has(achievement.id))
}

export function loadAchievements(storage: SaveStorage): string[] {
  const json = storage.getItem(ACHIEVEMENTS_KEY)
  if (json === null) return []
  try {
    const parsed: unknown = JSON.parse(json)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item): item is string => typeof item === 'string')
  } catch {
    return []
  }
}

export function saveAchievements(storage: SaveStorage, ids: string[]): void {
  storage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(ids))
}
