import { describe, expect, it } from 'vitest'
import type { KeyMoment } from '../../src/domain/types'
import { resolveKeyMoment } from '../../src/engine/keyMoments'
import { playToKeyMoments } from '../fixtures/matchday'

function scoreFirstChance(world: ReturnType<typeof playToKeyMoments>['world']): KeyMoment | null {
  let converted: KeyMoment | null = null
  for (const candidate of world.lastMatch?.keyMoments ?? []) {
    if (converted) continue
    const scoring = candidate.options.find((option) => option.goalOnSuccess)
    if (!scoring) continue
    candidate.roll = 0
    resolveKeyMoment(world, candidate.id, scoring.id)
    converted = candidate
  }
  return converted
}

describe('关键回合进球的正式播报', () => {
  it('主角关键回合进球也有一行「第 N 分钟，X 为 Y 破门！」', () => {
    const { world, report } = playToKeyMoments()
    const moment = scoreFirstChance(world)
    expect(moment).not.toBeNull()

    const goal = report.goals.find((item) => item.fromKeyMoment && item.isUser)
    expect(goal).toBeDefined()

    const line = report.events.find(
      (event) => event.type === 'goal' && event.text.includes('破门'),
    )
    expect(line).toBeDefined()
    expect(line!.text).toContain(`第 ${goal!.minute} 分钟`)
    expect(line!.text).toContain(goal!.scorerName)
  })

  it('每个进球都恰好对应一行破门播报', () => {
    const { world, report } = playToKeyMoments()
    scoreFirstChance(world)
    const lines = report.events.filter((event) => event.type === 'goal' && event.text.includes('破门'))

    expect(lines).toHaveLength(report.goals.length)
    for (const goal of report.goals) {
      const matched = lines.filter(
        (event) => event.minute === goal.minute && event.side === goal.side,
      )
      expect(matched, `第 ${goal.minute} 分钟 ${goal.side}`).toHaveLength(1)
    }
  })
})
