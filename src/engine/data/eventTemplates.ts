import type { EventChoice } from '../../domain/types'

export interface EventDraftContext {
  coach: string
  teammate: string
  userName: string
  ratingSuffix: string
  restSuffix: string
}

export interface EventDraft {
  templateId: string
  title: string
  body: string
  choices: EventChoice[]
}

interface EventTemplate {
  title: string
  body: string
  choices: EventChoice[]
}

const TEMPLATES: Record<string, EventTemplate> = {
  coach_praise: {
    title: '主教练的认可',
    body: '{coach} 在训练场边叫住了你：“上一场踢得不错。继续保持，但别飘。”',
    choices: [
      { id: 'humble', label: '感谢教练，继续努力', description: '保持谦逊，把注意力放回训练。', effects: [{ op: 'coachTrust', delta: 3 }, { op: 'morale', delta: 2 }, { op: 'confidence', delta: 2 }] },
      { id: 'ambitious', label: '告诉他我想要更多出场时间', description: '表达野心，但可能让教练觉得你太急。', effects: [{ op: 'coachTrust', delta: -1 }, { op: 'confidence', delta: 3 }, { op: 'morale', delta: 1 }] },
      { id: 'silent', label: '保持沉默，用训练说话', description: '不表态，继续埋头训练。', effects: [{ op: 'coachTrust', delta: 1 }, { op: 'sharpness', delta: 2 }] },
    ],
  },
  coach_warning: {
    title: '主教练的警告',
    body: '{coach} 把你叫到办公室：“上一场你的表现不够好。我需要你在训练里给出回应。”',
    choices: [
      { id: 'extra', label: '加练，证明自己', description: '用训练量回应质疑，但身体会更累。', effects: [{ op: 'coachTrust', delta: 3 }, { op: 'fitness', delta: -5 }, { op: 'sharpness', delta: 3 }] },
      { id: 'talk', label: '和他沟通自己的位置', description: '解释你的想法，争取理解。', effects: [{ op: 'coachTrust', delta: 1 }, { op: 'morale', delta: 2 }] },
      { id: 'defiant', label: '心里不服', description: '你觉得自己被低估了。', effects: [{ op: 'coachTrust', delta: -3 }, { op: 'confidence', delta: 3 }] },
    ],
  },
  bench_frustration: {
    title: '看台上的九十分钟',
    body: '你又一次没能进入首发。比赛结束后，经纪人发来消息，问你是否考虑换个环境。',
    choices: [
      { id: 'talkCoach', label: '找教练谈谈', description: '直接问清楚自己需要做什么。', effects: [{ op: 'coachTrust', delta: 1.5 }, { op: 'morale', delta: 2 }] },
      { id: 'loan', label: '让经纪人寻找租借机会', description: '你需要比赛时间，哪怕在别处。', effects: [{ op: 'agentTrust', delta: 3 }, { op: 'coachTrust', delta: -1 }, { op: 'morale', delta: 1 }] },
      { id: 'grind', label: '埋头训练', description: '把不甘心变成训练场上的强度。', effects: [{ op: 'sharpness', delta: 4 }, { op: 'fitness', delta: -2 }, { op: 'coachTrust', delta: 1 }] },
    ],
  },
  teammate_dinner: {
    title: '更衣室的邀请',
    body: '{teammate} 邀请你参加今晚的队内聚餐。',
    choices: [
      { id: 'join', label: '参加', description: '融入更衣室，但会牺牲一点恢复时间。', effects: [{ op: 'teammateTrust', delta: 3 }, { op: 'morale', delta: 3 }, { op: 'fitness', delta: -2 }] },
      { id: 'decline', label: '婉拒，去加练', description: '把时间用在训练上，但队友可能会觉得你疏远。', effects: [{ op: 'teammateTrust', delta: -2 }, { op: 'sharpness', delta: 3 }, { op: 'fitness', delta: -2 }] },
    ],
  },
  media_interview: {
    title: '赛后采访',
    body: '《英伦体育报》的记者想听听你对最近表现的看法。{ratingSuffix}',
    choices: [
      { id: 'confident', label: '自信表达目标', description: '让球迷看到你的野心。', effects: [{ op: 'mediaRep', delta: 3 }, { op: 'fanRep', delta: 2 }, { op: 'coachTrust', delta: -1 }] },
      { id: 'team', label: '把功劳归给团队', description: '安全、得体，教练会喜欢。', effects: [{ op: 'mediaRep', delta: 1.5 }, { op: 'coachTrust', delta: 1.5 }, { op: 'fanRep', delta: 1 }] },
      { id: 'controversy', label: '抛出争议言论', description: '流量会来，麻烦也会来。', effects: [{ op: 'mediaRep', delta: 5 }, { op: 'fanRep', delta: 3 }, { op: 'coachTrust', delta: -3 }, { op: 'teammateTrust', delta: -2 }] },
    ],
  },
  media_criticism: {
    title: '媒体的质疑',
    body: '《英伦体育报》质疑你的状态，标题写得很刺眼。{userName}，你准备怎么回应？',
    choices: [
      { id: 'respond', label: '用表现回应', description: '把注意力放回训练和比赛。', effects: [{ op: 'mediaRep', delta: 1 }, { op: 'confidence', delta: 2 }, { op: 'sharpness', delta: 2 }] },
      { id: 'fightBack', label: '公开反驳', description: '态度强硬，但教练不一定喜欢。', effects: [{ op: 'mediaRep', delta: 3 }, { op: 'coachTrust', delta: -2 }, { op: 'fanRep', delta: 1 }] },
      { id: 'logout', label: '关闭社交媒体', description: '远离噪音，专注自己。', effects: [{ op: 'morale', delta: 1 }, { op: 'confidence', delta: 1 }, { op: 'mediaRep', delta: -1 }] },
    ],
  },
  agent_sponsor: {
    title: '经纪人的赞助邀约',
    body: '经纪人带来一份本地运动品牌的赞助邀请，需要你参加两次拍摄。',
    choices: [
      { id: 'accept', label: '接受赞助', description: '增加收入与曝光，但会占用一点精力。', effects: [{ op: 'money', delta: 500 }, { op: 'agentTrust', delta: 2 }, { op: 'mediaRep', delta: 1 }, { op: 'fitness', delta: -1 }] },
      { id: 'decline', label: '专注足球，暂时拒绝', description: '把注意力留给训练和比赛。', effects: [{ op: 'agentTrust', delta: -1 }, { op: 'coachTrust', delta: 1 }, { op: 'morale', delta: 1 }] },
    ],
  },
  agent_call: {
    title: '经纪人的电话',
    body: '经纪人打电话来，说有几家俱乐部在关注你，但前提是你得先踢上球。',
    choices: [
      { id: 'keepLooking', label: '请他继续关注', description: '保持选项开放。', effects: [{ op: 'agentTrust', delta: 2 }, { op: 'morale', delta: 1 }] },
      { id: 'stay', label: '我只想留在这里', description: '把注意力放回当前球队。', effects: [{ op: 'coachTrust', delta: 1 }, { op: 'agentTrust', delta: -1 }, { op: 'morale', delta: 1 }] },
    ],
  },
  family_visit: {
    title: '家人想来看看你',
    body: '家人想来看看你，顺便在你的公寓住几天。',
    choices: [
      { id: 'welcome', label: '让他们来', description: '生活不只有足球。', effects: [{ op: 'familyTrust', delta: 4 }, { op: 'morale', delta: 3 }, { op: 'fitness', delta: 2 }] },
      { id: 'focus', label: '现在需要专注训练', description: '把这段时间留给足球。', effects: [{ op: 'familyTrust', delta: -2 }, { op: 'sharpness', delta: 3 }, { op: 'morale', delta: -2 }] },
    ],
  },
  lifestyle_purchase: {
    title: '第一笔像样的积蓄',
    body: '你的账户里终于有了一笔像样的积蓄。经纪人说，是时候考虑一下生活方式了。',
    choices: [
      { id: 'car', label: '买一辆梦想中的车', description: '立刻获得满足感，但会花掉一大笔钱。', effects: [{ op: 'money', delta: -5000 }, { op: 'fanRep', delta: 2 }, { op: 'morale', delta: 4 }] },
      { id: 'apartment', label: '投资一套小公寓', description: '更稳妥的选择。', effects: [{ op: 'money', delta: -3000 }, { op: 'morale', delta: 2 }, { op: 'familyTrust', delta: 2 }] },
      { id: 'save', label: '先存起来', description: '你还没想好怎么花。', effects: [{ op: 'morale', delta: -1 }, { op: 'confidence', delta: 1 }] },
    ],
  },
  injury_concern: {
    title: '队医的建议',
    body: '队医建议你耐心康复，但下一场比赛很重要。{restSuffix}',
    choices: [
      { id: 'listen', label: '听从队医', description: '把身体放在第一位。', effects: [{ op: 'fitness', delta: 5 }, { op: 'morale', delta: 2 }, { op: 'coachTrust', delta: 1 }] },
      { id: 'rush', label: '提前一周复出', description: '缩短康复时间，但风险很高。', effects: [{ op: 'fitness', delta: -5 }, { op: 'morale', delta: 3 }, { op: 'coachTrust', delta: -2 }] },
    ],
  },
}

const FALLBACK_TEMPLATE_ID = 'teammate_dinner'
const FALLBACK: EventTemplate = {
  title: '更衣室的邀请',
  body: '{teammate} 邀请你参加今晚的队内聚餐。',
  choices: [
    { id: 'join', label: '参加', description: '融入更衣室。', effects: [{ op: 'teammateTrust', delta: 3 }, { op: 'morale', delta: 3 }] },
    { id: 'decline', label: '婉拒，去加练', description: '把时间用在训练上。', effects: [{ op: 'teammateTrust', delta: -2 }, { op: 'sharpness', delta: 3 }] },
  ],
}

const RESULT_TEXTS: Record<string, Record<string, string>> = {
  coach_praise: {
    humble: '教练点了点头。你知道，这种认可要靠下一场继续挣。',
    ambitious: '教练看了你一眼：“想上场，就在训练里让我看到。”',
    silent: '你没有多说，转身加练了一组射门。',
  },
  coach_warning: {
    extra: '训练结束后，你是最后一个离开球场的人。',
    talk: '教练听完了你的想法，至少你们之间的误解少了一点。',
    defiant: '你把不甘心写在了脸上。教练也看见了。',
  },
  bench_frustration: {
    talkCoach: '教练告诉你，你的机会会来，但必须先赢过训练里的竞争。',
    loan: '经纪人开始打听租借市场。你决定先把下一场训练踢好。',
    grind: '你把情绪留在了训练场。教练远远看着，没有说话。',
  },
  teammate_dinner: {
    join: '聚餐气氛不错。你知道了几个队友不为人知的小故事。',
    decline: '你留在训练基地加练。队友们没有多说什么。',
  },
  media_interview: {
    confident: '你的发言被做成了标题。球迷在评论区讨论你的野心。',
    team: '记者对你的成熟回答有些意外。教练也看到了。',
    controversy: '标题很快发酵。你得到了流量，也得到了一些麻烦。',
  },
  media_criticism: {
    respond: '你关掉新闻，回到训练场。',
    fightBack: '你的反驳让话题更热了。教练组内部并不满意。',
    logout: '你卸载了社交媒体。世界清净了一点。',
  },
  agent_sponsor: {
    accept: '拍摄顺利完成。经纪人抽成后，你拿到了一笔收入。',
    decline: '经纪人不置可否，但你心里更踏实了。',
  },
  agent_call: {
    keepLooking: '经纪人说他明白了。电话那头传来翻动文件的声音。',
    stay: '你告诉经纪人，自己还没想过离开。',
  },
  family_visit: {
    welcome: '家人带来了熟悉的味道。你睡了一个很安稳的觉。',
    focus: '你把公寓收拾干净，然后回到训练基地。',
  },
  lifestyle_purchase: {
    car: '车钥匙握在手里，你突然意识到自己真的是一名职业球员了。',
    apartment: '你签下了第一份房产合同。经纪人提醒你，这只是开始。',
    save: '你看着账户余额，决定再等等。',
  },
  injury_concern: {
    listen: '你选择相信队医。康复计划被重新安排。',
    rush: '你坚持提前复出。风险会由你的身体来承担。',
  },
}

export function interpolate(text: string, ctx: EventDraftContext): string {
  const values: Record<string, string> = {
    '{coach}': ctx.coach,
    '{teammate}': ctx.teammate,
    '{userName}': ctx.userName,
    '{ratingSuffix}': ctx.ratingSuffix,
    '{restSuffix}': ctx.restSuffix,
  }
  return text.replace(/\{[a-zA-Z]+\}/g, (token) => values[token] ?? token)
}

export function renderEventDraft(templateId: string, ctx: EventDraftContext): EventDraft {
  const template = TEMPLATES[templateId]
  if (!template) {
    return {
      templateId: FALLBACK_TEMPLATE_ID,
      title: FALLBACK.title,
      body: interpolate(FALLBACK.body, ctx),
      choices: FALLBACK.choices,
    }
  }
  return {
    templateId,
    title: template.title,
    body: interpolate(template.body, ctx),
    choices: template.choices,
  }
}

export function resultTextFor(templateId: string, choiceId: string): string | undefined {
  return RESULT_TEXTS[templateId]?.[choiceId]
}
