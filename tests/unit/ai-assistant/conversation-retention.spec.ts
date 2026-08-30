import { describe, expect, it } from 'vitest'
import {
  activeConversationExpiresAt,
  archivedConversationPurgeAt,
  conversationCleanupEligibility,
} from '../../../server/modules/ai-assistant/conversation-retention'

const now = new Date('2026-07-30T10:00:00.000Z')

describe('AI conversation retention policy', () => {
  it('renews active history for thirty days and trash for seven days', () => {
    expect(activeConversationExpiresAt(now).toISOString()).toBe('2026-08-29T10:00:00.000Z')
    expect(archivedConversationPurgeAt(now).toISOString()).toBe('2026-08-06T10:00:00.000Z')
  })

  it('distinguishes active expiry from elapsed recoverable deletion', () => {
    expect(conversationCleanupEligibility({
      expiresAt: new Date('2026-07-30T09:59:59.000Z'),
      deletedAt: null,
      purgeAfter: null,
    }, now)).toBe('expired')
    expect(conversationCleanupEligibility({
      expiresAt: new Date('2026-08-01T00:00:00.000Z'),
      deletedAt: new Date('2026-07-23T10:00:00.000Z'),
      purgeAfter: new Date('2026-07-30T10:00:00.000Z'),
    }, now)).toBe('trash_elapsed')
    expect(conversationCleanupEligibility({
      expiresAt: new Date('2026-08-01T00:00:00.000Z'),
      deletedAt: null,
      purgeAfter: null,
    }, now)).toBe('keep')
  })
})
