import type { AiUsage } from '../domain/types'
import type { LlmUsage } from './types'

// 每 100 万 token 的美元价格。模型名匹配不到时使用保守默认值。
const PRICES: { pattern: RegExp; input: number; output: number }[] = [
  { pattern: /claude.*opus/i, input: 15, output: 75 },
  { pattern: /claude.*sonnet/i, input: 3, output: 15 },
  { pattern: /claude.*haiku/i, input: 0.8, output: 4 },
  { pattern: /gpt-5.*mini/i, input: 0.25, output: 2 },
  { pattern: /gpt-5/i, input: 1.25, output: 10 },
  { pattern: /gpt-4\.1.*mini/i, input: 0.4, output: 1.6 },
  { pattern: /gpt-4\.1/i, input: 2, output: 8 },
  { pattern: /gpt-4o.*mini/i, input: 0.15, output: 0.6 },
  { pattern: /gpt-4o/i, input: 2.5, output: 10 },
  { pattern: /gemini.*flash/i, input: 0.3, output: 2.5 },
  { pattern: /deepseek/i, input: 0.28, output: 0.42 },
]

const DEFAULT_PRICE = { input: 1, output: 3 }

export function estimateCostUsd(model: string, usage: LlmUsage): number {
  const price = PRICES.find((item) => item.pattern.test(model)) ?? DEFAULT_PRICE
  return (
    (usage.promptTokens / 1_000_000) * price.input +
    (usage.completionTokens / 1_000_000) * price.output
  )
}

export function addUsage(existing: AiUsage | undefined, model: string, usage: LlmUsage): AiUsage {
  const cost = estimateCostUsd(model, usage)
  return {
    promptTokens: (existing?.promptTokens ?? 0) + usage.promptTokens,
    completionTokens: (existing?.completionTokens ?? 0) + usage.completionTokens,
    calls: (existing?.calls ?? 0) + 1,
    costUsd: Math.round(((existing?.costUsd ?? 0) + cost) * 1_000_000) / 1_000_000,
  }
}
