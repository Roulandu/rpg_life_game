/** AI 叙事与用量：只承载文本与统计，不参与回合结算，故与 WorldState 主体分开维护。 */

export interface AiNarrative {
  season: number
  week: number
  headline: string
  body: string
  npcNote?: string
  suggestedAction?: string
  createdAt: string
}

export interface AiChatMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  season: number
  week: number
  actionLabel?: string
  createdAt: string
}

export interface AiUsage {
  promptTokens: number
  completionTokens: number
  calls: number
  costUsd: number
}
