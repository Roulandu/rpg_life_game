import type { GameState } from './types'

export const TERMINAL_AGE = 80

export interface Ending {
  id: string
  title: string
  description: string
}

export const ENDING_TITLES: Record<string, string> = {
  'career-success': '事业有成',
  impoverished: '穷困潦倒',
  'family-happiness': '家庭美满',
  'balanced-life': '圆满充实',
  'plain-life': '平淡人生',
  'entrepreneur-legend': '创业传奇',
  'scholar-life': '学术人生',
  celebrity: '声名显赫',
  recluse: '隐世智者',
}

export function isLifeOver(state: GameState): boolean {
  return state.age >= TERMINAL_AGE
}

export function evaluateEnding(state: GameState): Ending {
  const { wealth, milestones } = state
  const { intelligence, physique, charm } = state.attributes

  if (milestones.includes('started-business') && wealth >= 400) {
    return {
      id: 'entrepreneur-legend',
      title: '创业传奇',
      description: '你当年的创业冲动最终开花结果，白手起家成就了一段商业传奇。',
    }
  }

  if (milestones.includes('studied') && intelligence >= 80) {
    return {
      id: 'scholar-life',
      title: '学术人生',
      description: '你一生求知若渴，在学问上卓有建树，桃李满天下。',
    }
  }

  if (milestones.includes('vip-network') && charm >= 80 && wealth >= 200) {
    return {
      id: 'celebrity',
      title: '声名显赫',
      description: '你名利双收，在上流圈子里如鱼得水，成为人人称羡的风云人物。',
    }
  }

  if (wealth >= 500 && intelligence >= 70) {
    return {
      id: 'career-success',
      title: '事业有成',
      description: '你凭借过人的才智与多年积累的财富，成为令人尊敬的成功人士。',
    }
  }

  if (wealth <= 50) {
    return {
      id: 'impoverished',
      title: '穷困潦倒',
      description: '晚年你两手空空，日子过得十分拮据，令人唏嘘。',
    }
  }

  if (charm >= 70 && wealth >= 100) {
    return {
      id: 'family-happiness',
      title: '家庭美满',
      description: '你一生人缘极佳，儿孙绕膝，尽享天伦之乐。',
    }
  }

  if (physique >= 60 && intelligence >= 50) {
    return {
      id: 'balanced-life',
      title: '圆满充实',
      description: '你身心健康、生活平衡，度过了一段充实而有意义的人生。',
    }
  }

  if (intelligence >= 85 && charm <= 30) {
    return {
      id: 'recluse',
      title: '隐世智者',
      description: '你淡泊名利、埋头书斋，在无人打扰的世界里找到了内心的安宁。',
    }
  }

  return {
    id: 'plain-life',
    title: '平淡人生',
    description: '你的一生平平淡淡，却也安稳自足，无风无浪。',
  }
}
