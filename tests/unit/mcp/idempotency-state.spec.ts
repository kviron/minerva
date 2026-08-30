import { describe, expect, it } from 'vitest'
import {
  IDEMPOTENCY_DECISION,
  IDEMPOTENCY_STATUS,
  decideIdempotencyBegin,
  type IdempotencyRecordState,
} from '../../../server/modules/mcp/idempotency-state'

const now = new Date('2026-07-15T10:00:00.000Z')
const record = (overrides: Partial<IdempotencyRecordState> = {}): IdempotencyRecordState => ({
  requestHash: 'a'.repeat(64),
  status: IDEMPOTENCY_STATUS.IN_PROGRESS,
  leaseExpiresAt: new Date('2026-07-15T10:01:00.000Z'),
  safeResult: null,
  retentionExpiresAt: new Date('2026-07-16T10:00:00.000Z'),
  ...overrides,
})

describe('MCP idempotency state machine', () => {
  it('starts execution for a new key', () => {
    expect(decideIdempotencyBegin(null, 'a'.repeat(64), now)).toEqual({
      type: IDEMPOTENCY_DECISION.EXECUTE,
      reason: 'new',
    })
  })

  it('rejects reuse with a different validated request hash', () => {
    expect(decideIdempotencyBegin(record(), 'b'.repeat(64), now)).toEqual({
      type: IDEMPOTENCY_DECISION.CONFLICT,
    })
  })

  it('replays the safe terminal result for an identical completed request', () => {
    const safeResult = { documentId: '00000000-0000-4000-8000-000000000071' }
    expect(decideIdempotencyBegin(record({
      status: IDEMPOTENCY_STATUS.COMPLETED,
      leaseExpiresAt: null,
      safeResult,
    }), 'a'.repeat(64), now)).toEqual({
      type: IDEMPOTENCY_DECISION.REPLAY,
      safeResult,
    })
  })

  it('reports a live identical lease as busy', () => {
    expect(decideIdempotencyBegin(record(), 'a'.repeat(64), now)).toEqual({
      type: IDEMPOTENCY_DECISION.BUSY,
      retryAfterMs: 60_000,
    })
  })

  it('reclaims an expired lease and treats a retention-expired record as new', () => {
    expect(decideIdempotencyBegin(record({
      leaseExpiresAt: new Date('2026-07-15T09:59:59.000Z'),
    }), 'a'.repeat(64), now)).toEqual({
      type: IDEMPOTENCY_DECISION.EXECUTE,
      reason: 'lease_expired',
    })
    expect(decideIdempotencyBegin(record({
      retentionExpiresAt: new Date('2026-07-15T09:59:59.000Z'),
    }), 'b'.repeat(64), now)).toEqual({
      type: IDEMPOTENCY_DECISION.EXECUTE,
      reason: 'retention_expired',
    })
  })
})
