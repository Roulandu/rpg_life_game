import type { KeyMoment, MatchSide } from '../../../domain'

export interface Momentum {
  rating: number
  morale: number
  coach: number
}

export const FAST_FORWARD_LABEL = '跳到下一关键回合'

export const EVENT_TONE: Record<string, string> = {
  goal: 'border-accent/40 bg-accent/10 text-accent',
  assist: 'border-teal/40 bg-teal/10 text-teal',
  chance: 'border-teal/30 bg-teal/5 text-teal',
  save: 'border-teal/30 bg-teal/5 text-teal',
  shot: 'border-teal/30 bg-teal/5 text-teal',
  attack: 'border-line bg-card-2 text-muted',
  corner: 'border-gold/30 bg-gold/5 text-gold',
  foul: 'border-danger/30 bg-danger/5 text-danger',
  offside: 'border-gold/30 bg-gold/5 text-gold',
  card: 'border-gold/40 bg-gold/10 text-gold',
  injury: 'border-danger/40 bg-danger/10 text-danger',
  sub: 'border-line bg-card-2 text-muted',
  info: 'border-line bg-card-2 text-muted',
  fulltime: 'border-line bg-card-2 text-text',
}

export function eventSideLabel(side: MatchSide | undefined): '主' | '客' | null {
  if (side === 'home') return '主'
  if (side === 'away') return '客'
  return null
}

export function momentDelta(moment: KeyMoment): Momentum {
  const outcome = moment.outcome
  if (!outcome) return { rating: 0, morale: 0, coach: 0 }
  return { rating: outcome.ratingDelta, morale: outcome.moraleDelta, coach: outcome.coachDelta }
}

export function momentumOf(moments: KeyMoment[]): Momentum {
  return moments.reduce(
    (total, moment) => {
      const delta = momentDelta(moment)
      return {
        rating: total.rating + delta.rating,
        morale: total.morale + delta.morale,
        coach: total.coach + delta.coach,
      }
    },
    { rating: 0, morale: 0, coach: 0 },
  )
}

export function successCountOf(moments: KeyMoment[]): number {
  return moments.filter((moment) => moment.outcome?.success).length
}
