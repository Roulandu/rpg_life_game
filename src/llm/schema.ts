import { z } from 'zod'

export const SUBMIT_WEEK_SCHEMA = z.object({
  headlineZh: z.string().trim().min(1).max(24),
  narrativeZh: z.string().trim().min(1).max(800),
  npcNoteZh: z.string().trim().max(60).optional(),
  suggestedActionZh: z.string().trim().max(30).optional(),
  event: z
    .object({
      templateId: z.string().trim().min(1).max(64),
      titleZh: z.string().trim().min(1).max(30),
      bodyZh: z.string().trim().min(1).max(320),
    })
    .nullable()
    .optional(),
})

export const SUBMIT_ACTION_SCHEMA = z.object({
  replyZh: z.string().trim().min(1).max(400),
  actionId: z.enum(['none', 'talk_coach', 'rest', 'extra_training', 'media_interview']),
})

export type SubmitWeek = z.infer<typeof SUBMIT_WEEK_SCHEMA>
export type SubmitAction = z.infer<typeof SUBMIT_ACTION_SCHEMA>

export function sanitizeText(value: string, maxLength: number): string {
  return value
    // oxlint-disable-next-line no-control-regex -- stripping control characters from model output is intentional
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/https?:\/\/\S+|www\.\S+/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength)
}
