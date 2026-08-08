import { describe, expect, it } from 'vitest'
import { ATTRIBUTE_CONFIG } from '../attributes'
import { createInitialState, setAttribute, markEventSeen } from '../state'
import type { GameEvent, GameState } from '../types'
import { DEFAULT_EVENT_POOL } from '../eventPool'
import { applyOption, eventAvailable, selectEvent } from '../events'

const events: GameEvent[] = [
  {
    id: 'learn-to-read',
    stage: 'childhood',
    title: '学认字',
    description: '父母教你认字。',
    options: [
      { label: '认真学', effect: { attributes: { intelligence: 10 } } },
      { label: '出去玩', effect: { attributes: { physique: 5, charm: 3 } } },
    ],
  },
  {
    id: 'study-hard',
    stage: 'education',
    title: '努力学习',
    description: '快要考试了。',
    options: [
      { label: '熬夜复习', effect: { attributes: { intelligence: 15, physique: -10 } } },
      { label: '正常复习', effect: { attributes: { intelligence: 8 } } },
    ],
  },
  {
    id: 'job-promotion',
    stage: 'career',
    title: '晋升机会',
    description: '公司有晋升机会。',
    options: [
      { label: '争取晋升', effect: { attributes: { charm: 5 }, wealth: 50 } },
      { label: '保持现状', effect: { wealth: 10 } },
    ],
  },
  {
    id: 'retire',
    stage: 'elderly',
    title: '退休生活',
    description: '享受晚年。',
    options: [{ label: '含饴弄孙', effect: { attributes: { charm: 5 } } }],
  },
]

describe('DEFAULT_EVENT_POOL', () => {
  it('covers every life stage with at least one event', () => {
    for (const stage of ['childhood', 'education', 'career', 'elderly'] as const) {
      expect(DEFAULT_EVENT_POOL.some((e) => e.stage === stage)).toBe(true)
    }
  })

  it('gives every event at least one option', () => {
    for (const event of DEFAULT_EVENT_POOL) {
      expect(event.options.length).toBeGreaterThan(0)
    }
  })

  it('gives every event a positive weight', () => {
    for (const event of DEFAULT_EVENT_POOL) {
      expect(event.weight ?? 1).toBeGreaterThan(0)
    }
  })

  it('keeps at least one requirement-free event per stage', () => {
    for (const stage of ['childhood', 'education', 'career', 'elderly'] as const) {
      expect(
        DEFAULT_EVENT_POOL.some((e) => e.stage === stage && !e.requires),
      ).toBe(true)
    }
  })

  it('contains a rich set of events', () => {
    expect(DEFAULT_EVENT_POOL.length).toBeGreaterThanOrEqual(28)
  })
})

describe('selectEvent', () => {
  it('filters events by the current life stage', () => {
    const childhood = { ...createInitialState(), stage: 'childhood' as const }
    const selected = selectEvent(childhood, events)
    expect(selected?.id).toBe('learn-to-read')
  })

  it('selects only events matching the education stage', () => {
    const education = { ...createInitialState(), age: 10, stage: 'education' as const }
    const selected = selectEvent(education, events, () => 0)
    expect(selected?.id).toBe('study-hard')
  })

  it('picks an event according to the injected random', () => {
    const career = { ...createInitialState(), age: 30, stage: 'career' as const }
    // single candidate in career pool
    expect(selectEvent(career, events, () => 0)?.id).toBe('job-promotion')
  })

  it('returns null when no event matches the stage', () => {
    const empty = createInitialState()
    expect(selectEvent(empty, [], () => 0)).toBeNull()
  })

  it('treats events without a weight as weight 1', () => {
    const pool: GameEvent[] = [
      { id: 'a', stage: 'childhood', title: 'a', description: '', options: [] },
      { id: 'b', stage: 'childhood', title: 'b', description: '', options: [] },
    ]
    const childhood = { ...createInitialState(), stage: 'childhood' as const }
    expect(selectEvent(childhood, pool, () => 0)?.id).toBe('a')
    expect(selectEvent(childhood, pool, () => 0.99)?.id).toBe('b')
  })

  it('weights the selection across candidates', () => {
    const pool: GameEvent[] = [
      { id: 'a', stage: 'childhood', weight: 1, title: 'a', description: '', options: [] },
      { id: 'b', stage: 'childhood', weight: 3, title: 'b', description: '', options: [] },
    ]
    const childhood = { ...createInitialState(), stage: 'childhood' as const }
    // total weight 4; 'a' occupies [0, 1) => random < 0.25, 'b' occupies [1, 4)
    expect(selectEvent(childhood, pool, () => 0)?.id).toBe('a')
    expect(selectEvent(childhood, pool, () => 0.24)?.id).toBe('a')
    expect(selectEvent(childhood, pool, () => 0.25)?.id).toBe('b')
    expect(selectEvent(childhood, pool, () => 0.99)?.id).toBe('b')
  })
})

describe('markEventSeen', () => {
  it('prepends an id and trims to the window', () => {
    const state = { ...createInitialState(), recentEvents: ['c', 'b'] }
    const next = markEventSeen(state, 'a', 2)
    expect(next.recentEvents).toEqual(['a', 'c'])
  })

  it('does not duplicate an id already in the window', () => {
    const state = { ...createInitialState(), recentEvents: ['a', 'b'] }
    expect(markEventSeen(state, 'b', 5).recentEvents).toEqual(['b', 'a'])
  })
})

describe('selectEvent recent-event window', () => {
  const pool: GameEvent[] = [
    { id: 'a', stage: 'career', title: 'a', description: '', options: [] },
    { id: 'b', stage: 'career', title: 'b', description: '', options: [] },
    { id: 'c', stage: 'career', title: 'c', description: '', options: [] },
  ]

  it('avoids events seen recently when other candidates exist', () => {
    const state = {
      ...createInitialState(),
      stage: 'career' as const,
      recentEvents: ['a', 'b'],
    }
    // 'a' and 'b' excluded, only 'c' remains
    expect(selectEvent(state, pool, () => 0)?.id).toBe('c')
  })

  it('falls back to all candidates when the window covers the whole pool', () => {
    const state = {
      ...createInitialState(),
      stage: 'career' as const,
      recentEvents: ['a', 'b', 'c'],
    }
    // all are recent, fall back to the full pool; random 0 picks 'a'
    expect(selectEvent(state, pool, () => 0)?.id).toBe('a')
  })

  it('ignores the window when it is empty', () => {
    const state = { ...createInitialState(), stage: 'career' as const }
    expect(selectEvent(state, pool, () => 0.99)?.id).toBe('c')
  })
})

describe('eventAvailable', () => {
  it('returns true when an event has no requirements', () => {
    const state = createInitialState()
    const event: GameEvent = { id: 'a', stage: 'childhood', title: 'a', description: '', options: [] }
    expect(eventAvailable(state, event)).toBe(true)
  })

  it('checks the wealth requirement', () => {
    const event: GameEvent = {
      id: 'a',
      stage: 'career',
      title: 'a',
      description: '',
      options: [],
      requires: { wealth: 300 },
    }
    expect(eventAvailable({ ...createInitialState(), stage: 'career' }, event)).toBe(false)
    expect(eventAvailable({ ...createInitialState(), stage: 'career', wealth: 300 }, event)).toBe(true)
  })

  it('checks attribute minimums', () => {
    const event: GameEvent = {
      id: 'a',
      stage: 'education',
      title: 'a',
      description: '',
      options: [],
      requires: { attributes: { intelligence: 70 } },
    }
    let state = createInitialState()
    state = setAttribute(state, 'intelligence', 10)
    expect(eventAvailable(state, event)).toBe(false)
    state = setAttribute(state, 'intelligence', 80)
    expect(eventAvailable(state, event)).toBe(true)
  })

  it('requires all listed milestones', () => {
    const event: GameEvent = {
      id: 'a',
      stage: 'career',
      title: 'a',
      description: '',
      options: [],
      requires: { milestones: ['studied', 'started-business'] },
    }
    const state = { ...createInitialState(), stage: 'career' as const, milestones: ['studied'] }
    expect(eventAvailable(state, event)).toBe(false)
    const ready = { ...state, milestones: ['studied', 'started-business'] }
    expect(eventAvailable(ready, event)).toBe(true)
  })

  it('combines multiple requirement types', () => {
    const event: GameEvent = {
      id: 'a',
      stage: 'career',
      title: 'a',
      description: '',
      options: [],
      requires: { wealth: 100, attributes: { charm: 50 }, milestones: ['studied'] },
    }
    let state: GameState = { ...createInitialState(), stage: 'career', wealth: 100, milestones: ['studied'] }
    state = setAttribute(state, 'charm', 20)
    expect(eventAvailable(state, event)).toBe(true)
    state = setAttribute(state, 'charm', -40)
    expect(eventAvailable(state, event)).toBe(false)
  })
})

describe('selectEvent requirements', () => {
  it('excludes events whose requirements are not met', () => {
    const base: GameEvent = { id: 'base', stage: 'career', title: 'base', description: '', options: [] }
    const elite: GameEvent = {
      id: 'elite',
      stage: 'career',
      title: 'elite',
      description: '',
      options: [],
      requires: { wealth: 500 },
    }
    const pool = [base, elite]

    const poor = { ...createInitialState(), stage: 'career' as const, wealth: 100 }
    expect(selectEvent(poor, pool, () => 0)?.id).toBe('base')

    const rich = { ...createInitialState(), stage: 'career' as const, wealth: 600 }
    // 'base' weight 1, 'elite' weight 1; both available, random 0.99 -> last
    expect(selectEvent(rich, pool, () => 0.99)?.id).toBe('elite')
  })

  it('returns null when requirements exclude all candidates', () => {
    const elite: GameEvent = {
      id: 'elite',
      stage: 'career',
      title: 'elite',
      description: '',
      options: [],
      requires: { wealth: 500 },
    }
    const poor = { ...createInitialState(), stage: 'career' as const, wealth: 100 }
    expect(selectEvent(poor, [elite], () => 0)).toBeNull()
  })
})

describe('applyOption', () => {
  it('applies attribute deltas', () => {
    const state = createInitialState()
    const next = applyOption(state, events[0].options[0])
    expect(next.attributes.intelligence).toBe(
      ATTRIBUTE_CONFIG.intelligence.initial + 10,
    )
    expect(next.attributes.physique).toBe(ATTRIBUTE_CONFIG.physique.initial)
  })

  it('applies wealth changes and clamps at zero', () => {
    const state = createInitialState()
    const richer = applyOption(state, { label: 'x', effect: { wealth: 100 } })
    expect(richer.wealth).toBe(100)

    const broke = applyOption(richer, { label: 'x', effect: { wealth: -500 } })
    expect(broke.wealth).toBe(0)
  })

  it('clamps attributes to configured bounds', () => {
    const state = createInitialState()
    const next = applyOption(state, { label: 'x', effect: { attributes: { charm: 500 } } })
    expect(next.attributes.charm).toBe(ATTRIBUTE_CONFIG.charm.max)
  })

  it('does not mutate the original state', () => {
    const state = createInitialState()
    applyOption(state, events[0].options[0])
    expect(state.attributes.intelligence).toBe(ATTRIBUTE_CONFIG.intelligence.initial)
    expect(state.wealth).toBe(0)
  })

  it('appends milestones and avoids duplicates', () => {
    const state = createInitialState()
    const first = applyOption(state, { label: 'x', effect: { milestones: ['studied'] } })
    expect(first.milestones).toEqual(['studied'])
    const second = applyOption(first, { label: 'x', effect: { milestones: ['studied', 'started-business'] } })
    expect(second.milestones).toEqual(['studied', 'started-business'])
  })
})
