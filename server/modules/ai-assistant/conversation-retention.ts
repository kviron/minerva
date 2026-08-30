import {
  AI_CONVERSATION_RETENTION_DAYS,
  AI_CONVERSATION_TRASH_DAYS,
} from '../../../shared/ai-assistant/constants'

const DAY_MS = 24 * 60 * 60 * 1_000

export const activeConversationExpiresAt = (activityAt: Date): Date =>
  new Date(activityAt.getTime() + AI_CONVERSATION_RETENTION_DAYS * DAY_MS)

export const archivedConversationPurgeAt = (deletedAt: Date): Date =>
  new Date(deletedAt.getTime() + AI_CONVERSATION_TRASH_DAYS * DAY_MS)

interface ConversationRetentionState {
  readonly expiresAt: Date
  readonly deletedAt: Date | null
  readonly purgeAfter: Date | null
}

export type ConversationCleanupEligibility = 'keep' | 'expired' | 'trash_elapsed'

export const conversationCleanupEligibility = (
  state: ConversationRetentionState,
  now: Date,
): ConversationCleanupEligibility => {
  if (state.deletedAt !== null && state.purgeAfter !== null) {
    return state.purgeAfter.getTime() <= now.getTime() ? 'trash_elapsed' : 'keep'
  }
  return state.expiresAt.getTime() <= now.getTime() ? 'expired' : 'keep'
}
