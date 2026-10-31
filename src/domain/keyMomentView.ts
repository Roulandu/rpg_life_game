import type { KeyMomentOption } from './matchTypes'

function signed(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}`
}

function percent(chance: number): string {
  return `${Math.round(chance * 100)}%`
}

export function successBasisText(option: KeyMomentOption): string {
  const chance = `成功率 ${percent(option.successChance)}`
  return option.successBasisZh ? `${option.successBasisZh} · ${chance}` : chance
}

function pairText(label: string, success: number | undefined, fail: number | undefined): string | null {
  if (success == null && fail == null) return null
  return `${label} ${signed(success ?? 0)}/${signed(fail ?? 0)}`
}

export function effectsSummary(option: KeyMomentOption): string {
  const parts: string[] = []
  if (option.goalOnSuccess) parts.push('进球')
  if (option.assistOnSuccess) parts.push('助攻')
  parts.push(`评分 ${signed(option.ratingOnSuccess)}/${signed(option.ratingOnFail)}`)
  const morale = pairText('士气', option.moraleOnSuccess, option.moraleOnFail)
  if (morale) parts.push(morale)
  const coach = pairText('教练', option.coachOnSuccess, option.coachOnFail)
  if (coach) parts.push(coach)
  return parts.join(' · ')
}
