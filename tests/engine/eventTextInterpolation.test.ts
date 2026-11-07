import { describe, expect, it } from 'vitest'
import type { MatchReport, WorldState } from '../../src/domain/types'
import { EVENT_TEMPLATES } from '../../src/domain/eventContent'
import { displayName } from '../../src/domain/names'
import { buildDraftContext, renderEventDraft } from '../../src/engine/data/eventTemplates'
import { generateWorld } from '../../src/world/generator'
import { TEST_NOW, testOptions } from '../fixtures/career'

const TOKEN = /\{[a-zA-Z_0-9]+\}/

function ctxOf(world: WorldState, match: MatchReport | null = null) {
  return buildDraftContext(world, match)
}

function draftTexts(draft: ReturnType<typeof renderEventDraft>): string[] {
  return [draft.title, draft.body, ...draft.choices.flatMap((c) => [c.label, c.description ?? ''])]
}

describe('事件文案的插值覆盖面', () => {
  it('96 条模板渲染后不残留任何 {token} 字面量', () => {
    const world = generateWorld(testOptions(), TEST_NOW)
    const ctx = ctxOf(world)

    for (const template of EVENT_TEMPLATES) {
      const draft = renderEventDraft(template.id, ctx)
      for (const text of draftTexts(draft)) {
        expect(text, `${template.id} 仍留着 ${text.match(TOKEN)?.[0]}`).not.toMatch(TOKEN)
      }
    }
  })

  it('选项描述里的 {teammate} 换成队友中文名', () => {
    const world = generateWorld(testOptions(), TEST_NOW)
    const teammate = displayName(
      Object.values(world.relationships).find((item) => item.role === 'teammate'),
    )
    const draft = renderEventDraft('md_post_match_mic', ctxOf(world))
    const description = draft.choices.find((choice) => choice.id === 'name_team')?.description

    expect(description).toBeDefined()
    expect(description).toContain(teammate)
    expect(description).not.toContain('{teammate}')
  })

  it('评分副句仍然只插进正文，不污染选项标签', () => {
    const world = generateWorld(testOptions(), TEST_NOW)
    const match = { userRating: 7.4 } as MatchReport
    const draft = renderEventDraft('md_post_match_mic', ctxOf(world, match))

    expect(draft.body).toContain('7.4')
    for (const choice of draft.choices) expect(choice.label).not.toMatch(TOKEN)
  })
})
