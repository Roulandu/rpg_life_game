import { describe, expect, it } from 'vitest'
import {
  interpolate,
  renderEventDraft,
  resultTextFor,
  type EventDraftContext,
} from '../../src/engine/data/eventTemplates'

const ctx: EventDraftContext = {
  coach: '主帅',
  teammate: '队友甲',
  userName: '林远',
  ratingSuffix: '你上一场获得了 7.5 分。',
  restSuffix: '你已经开始认真恢复。',
}

const emptyCtx: EventDraftContext = { ...ctx, ratingSuffix: '', restSuffix: '' }

describe('interpolate', () => {
  it('替换全部占位符并保留未知花括号', () => {
    expect(interpolate('{coach}/{teammate}/{userName}/{ratingSuffix}/{restSuffix}', ctx)).toBe(
      '主帅/队友甲/林远/你上一场获得了 7.5 分。/你已经开始认真恢复。',
    )
    expect(interpolate('没有占位符 {unknown} 保留', ctx)).toBe('没有占位符 {unknown} 保留')
  })
})

describe('renderEventDraft 逐模板特征', () => {
  it('coach_praise', () => {
    const draft = renderEventDraft('coach_praise', ctx)
    expect(draft.templateId).toBe('coach_praise')
    expect(draft.title).toBe('主教练的认可')
    expect(draft.body).toBe('主帅 在训练场边叫住了你：“上一场踢得不错。继续保持，但别飘。”')
    expect(draft.choices).toEqual([
      { id: 'humble', label: '感谢教练，继续努力', description: '保持谦逊，把注意力放回训练。', effects: [{ op: 'coachTrust', delta: 3 }, { op: 'morale', delta: 2 }, { op: 'confidence', delta: 2 }] },
      { id: 'ambitious', label: '告诉他我想要更多出场时间', description: '表达野心，但可能让教练觉得你太急。', effects: [{ op: 'coachTrust', delta: -1 }, { op: 'confidence', delta: 3 }, { op: 'morale', delta: 1 }] },
      { id: 'silent', label: '保持沉默，用训练说话', description: '不表态，继续埋头训练。', effects: [{ op: 'coachTrust', delta: 1 }, { op: 'sharpness', delta: 2 }] },
    ])
  })

  it('coach_warning', () => {
    const draft = renderEventDraft('coach_warning', ctx)
    expect(draft.title).toBe('主教练的警告')
    expect(draft.body).toBe('主帅 把你叫到办公室：“上一场你的表现不够好。我需要你在训练里给出回应。”')
    expect(draft.choices.map((choice) => choice.id)).toEqual(['extra', 'talk', 'defiant'])
    expect(draft.choices[0]!.effects).toEqual([{ op: 'coachTrust', delta: 3 }, { op: 'fitness', delta: -5 }, { op: 'sharpness', delta: 3 }])
  })

  it('bench_frustration', () => {
    const draft = renderEventDraft('bench_frustration', ctx)
    expect(draft.title).toBe('看台上的九十分钟')
    expect(draft.body).toBe('你又一次没能进入首发。比赛结束后，经纪人发来消息，问你是否考虑换个环境。')
    expect(draft.choices.map((choice) => choice.id)).toEqual(['talkCoach', 'loan', 'grind'])
    expect(draft.choices[0]!.effects).toEqual([{ op: 'coachTrust', delta: 1.5 }, { op: 'morale', delta: 2 }])
  })

  it('teammate_dinner', () => {
    const draft = renderEventDraft('teammate_dinner', ctx)
    expect(draft.title).toBe('更衣室的邀请')
    expect(draft.body).toBe('队友甲 邀请你参加今晚的队内聚餐。')
    expect(draft.choices).toEqual([
      { id: 'join', label: '参加', description: '融入更衣室，但会牺牲一点恢复时间。', effects: [{ op: 'teammateTrust', delta: 3 }, { op: 'morale', delta: 3 }, { op: 'fitness', delta: -2 }] },
      { id: 'decline', label: '婉拒，去加练', description: '把时间用在训练上，但队友可能会觉得你疏远。', effects: [{ op: 'teammateTrust', delta: -2 }, { op: 'sharpness', delta: 3 }, { op: 'fitness', delta: -2 }] },
    ])
  })

  it('media_interview 有与无评分', () => {
    const withRating = renderEventDraft('media_interview', ctx)
    expect(withRating.title).toBe('赛后采访')
    expect(withRating.body).toBe('《英伦体育报》的记者想听听你对最近表现的看法。你上一场获得了 7.5 分。')
    expect(withRating.choices.map((choice) => choice.id)).toEqual(['confident', 'team', 'controversy'])

    const noRating = renderEventDraft('media_interview', emptyCtx)
    expect(noRating.body).toBe('《英伦体育报》的记者想听听你对最近表现的看法。')
  })
})

describe('renderEventDraft 媒体与生活类模板', () => {
  it('media_criticism', () => {
    const draft = renderEventDraft('media_criticism', ctx)
    expect(draft.title).toBe('媒体的质疑')
    expect(draft.body).toBe('《英伦体育报》质疑你的状态，标题写得很刺眼。林远，你准备怎么回应？')
    expect(draft.choices.map((choice) => choice.id)).toEqual(['respond', 'fightBack', 'logout'])
  })

  it('agent_sponsor', () => {
    const draft = renderEventDraft('agent_sponsor', ctx)
    expect(draft.title).toBe('经纪人的赞助邀约')
    expect(draft.body).toBe('经纪人带来一份本地运动品牌的赞助邀请，需要你参加两次拍摄。')
    expect(draft.choices[0]!.effects).toEqual([{ op: 'money', delta: 500 }, { op: 'agentTrust', delta: 2 }, { op: 'mediaRep', delta: 1 }, { op: 'fitness', delta: -1 }])
  })

  it('agent_call', () => {
    const draft = renderEventDraft('agent_call', ctx)
    expect(draft.title).toBe('经纪人的电话')
    expect(draft.body).toBe('经纪人打电话来，说有几家俱乐部在关注你，但前提是你得先踢上球。')
    expect(draft.choices.map((choice) => choice.id)).toEqual(['keepLooking', 'stay'])
  })

  it('family_visit', () => {
    const draft = renderEventDraft('family_visit', ctx)
    expect(draft.title).toBe('家人想来看看你')
    expect(draft.body).toBe('家人想来看看你，顺便在你的公寓住几天。')
    expect(draft.choices.map((choice) => choice.id)).toEqual(['welcome', 'focus'])
  })

  it('lifestyle_purchase', () => {
    const draft = renderEventDraft('lifestyle_purchase', ctx)
    expect(draft.title).toBe('第一笔像样的积蓄')
    expect(draft.body).toBe('你的账户里终于有了一笔像样的积蓄。经纪人说，是时候考虑一下生活方式了。')
    expect(draft.choices.map((choice) => choice.id)).toEqual(['car', 'apartment', 'save'])
    expect(draft.choices[0]!.effects).toEqual([{ op: 'money', delta: -5000 }, { op: 'fanRep', delta: 2 }, { op: 'morale', delta: 4 }])
  })

  it('injury_concern 有与无休息', () => {
    const rested = renderEventDraft('injury_concern', ctx)
    expect(rested.title).toBe('队医的建议')
    expect(rested.body).toBe('队医建议你耐心康复，但下一场比赛很重要。你已经开始认真恢复。')
    expect(rested.choices.map((choice) => choice.id)).toEqual(['listen', 'rush'])

    const notRested = renderEventDraft('injury_concern', emptyCtx)
    expect(notRested.body).toBe('队医建议你耐心康复，但下一场比赛很重要。')
  })

  it('未知模板回退到简化版 teammate_dinner', () => {
    const draft = renderEventDraft('does_not_exist', ctx)
    expect(draft.templateId).toBe('teammate_dinner')
    expect(draft.title).toBe('更衣室的邀请')
    expect(draft.body).toBe('队友甲 邀请你参加今晚的队内聚餐。')
    expect(draft.choices).toEqual([
      { id: 'join', label: '参加', description: '融入更衣室。', effects: [{ op: 'teammateTrust', delta: 3 }, { op: 'morale', delta: 3 }] },
      { id: 'decline', label: '婉拒，去加练', description: '把时间用在训练上。', effects: [{ op: 'teammateTrust', delta: -2 }, { op: 'sharpness', delta: 3 }] },
    ])
  })
})

describe('resultTextFor', () => {
  it('返回对应模板与选项的结果文案', () => {
    expect(resultTextFor('coach_praise', 'humble')).toBe('教练点了点头。你知道，这种认可要靠下一场继续挣。')
    expect(resultTextFor('injury_concern', 'rush')).toBe('你坚持提前复出。风险会由你的身体来承担。')
    expect(resultTextFor('lifestyle_purchase', 'save')).toBe('你看着账户余额，决定再等等。')
  })

  it('未知模板或选项返回 undefined', () => {
    expect(resultTextFor('nope', 'humble')).toBeUndefined()
    expect(resultTextFor('coach_praise', 'nope')).toBeUndefined()
  })
})
