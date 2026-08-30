import { z } from 'zod'
import { AI_CONVERSATION_STATUS } from '../../../shared/ai-assistant/constants'

const cursorSchema = z.object({
  scope: z.enum(['active', 'trash', 'messages']),
  timestamp: z.string().datetime(),
  id: z.string().uuid(),
}).strict()

export interface ConversationCursor {
  readonly scope: typeof AI_CONVERSATION_STATUS[keyof typeof AI_CONVERSATION_STATUS] | 'messages'
  readonly timestamp: Date
  readonly id: string
}

export const encodeConversationCursor = (cursor: ConversationCursor): string =>
  Buffer.from(JSON.stringify({
    scope: cursor.scope,
    timestamp: cursor.timestamp.toISOString(),
    id: cursor.id,
  })).toString('base64url')

export const decodeConversationCursor = (
  value: string | undefined,
  expectedScope: ConversationCursor['scope'],
): ConversationCursor | null => {
  if (value === undefined) return null
  const decoded: unknown = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'))
  const parsed = cursorSchema.parse(decoded)
  if (parsed.scope !== expectedScope) throw new Error('Cursor scope does not match the requested resource')
  return { scope: parsed.scope, timestamp: new Date(parsed.timestamp), id: parsed.id }
}
