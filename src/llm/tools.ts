import type { ToolSpec } from './providers/common'

export const SUBMIT_WEEK_TOOL: ToolSpec = {
  name: 'submit_week',
  description:
    '提交本周的叙事。只能改写引擎已给出的事件文案，不能创造或修改比分、属性、合同、赛程、伤病等事实。',
  parameters: {
    type: 'object',
    additionalProperties: false,
    properties: {
      headlineZh: {
        type: 'string',
        description: '本周标题，最多 24 个汉字。',
        maxLength: 24,
      },
      narrativeZh: {
        type: 'string',
        description: '本周叙事，第二人称，克制、具体，不要编造事实。',
      },
      event: {
        type: ['object', 'null'],
        description: '若引擎本周生成了事件，可改写其标题与正文；templateId 必须原样返回。',
        additionalProperties: false,
        properties: {
          templateId: { type: 'string' },
          titleZh: { type: 'string', maxLength: 30 },
          bodyZh: { type: 'string', maxLength: 320 },
        },
        required: ['templateId', 'titleZh', 'bodyZh'],
      },
      npcNoteZh: {
        type: 'string',
        description: '一条简短的更衣室观察，最多 60 个汉字。',
        maxLength: 60,
      },
      suggestedActionZh: {
        type: 'string',
        description: '给玩家的下一步建议，最多 30 个汉字。',
        maxLength: 30,
      },
    },
    required: ['headlineZh', 'narrativeZh'],
  },
}

export const SUBMIT_ACTION_TOOL: ToolSpec = {
  name: 'submit_action',
  description:
    '回应玩家的自由行动。只能从允许的行动中选择一个；行动效果由引擎按固定数值结算，你不能指定数值。',
  parameters: {
    type: 'object',
    additionalProperties: false,
    properties: {
      replyZh: {
        type: 'string',
        description: '对玩家行动的叙事回应，第二人称，最多 400 字。',
      },
      actionId: {
        type: 'string',
        enum: ['none', 'talk_coach', 'rest', 'extra_training', 'media_interview'],
        description:
          '要执行的行动。talk_coach 与教练谈话；rest 休息恢复；extra_training 加练；media_interview 接受采访；none 只对话不产生效果。',
      },
    },
    required: ['replyZh', 'actionId'],
  },
}
