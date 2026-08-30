export const IDEMPOTENCY_STATUS = {
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
} as const

export type IdempotencyStatus = typeof IDEMPOTENCY_STATUS[keyof typeof IDEMPOTENCY_STATUS]

export const IDEMPOTENCY_DECISION = {
  EXECUTE: 'execute',
  REPLAY: 'replay',
  CONFLICT: 'conflict',
  BUSY: 'busy',
} as const

export interface IdempotencyRecordState {
  readonly requestHash: string
  readonly status: IdempotencyStatus
  readonly leaseExpiresAt: Date | null
  readonly safeResult: unknown | null
  readonly retentionExpiresAt: Date
}

export type IdempotencyBeginDecision =
  | Readonly<{ type: typeof IDEMPOTENCY_DECISION.EXECUTE, reason: 'new' | 'lease_expired' | 'retention_expired' }>
  | Readonly<{ type: typeof IDEMPOTENCY_DECISION.REPLAY, safeResult: unknown }>
  | Readonly<{ type: typeof IDEMPOTENCY_DECISION.CONFLICT }>
  | Readonly<{ type: typeof IDEMPOTENCY_DECISION.BUSY, retryAfterMs: number }>

export const decideIdempotencyBegin = (
  existing: IdempotencyRecordState | null,
  requestHash: string,
  now: Date,
): IdempotencyBeginDecision => {
  if (existing === null) {
    return { type: IDEMPOTENCY_DECISION.EXECUTE, reason: 'new' }
  }
  if (existing.retentionExpiresAt.getTime() <= now.getTime()) {
    return { type: IDEMPOTENCY_DECISION.EXECUTE, reason: 'retention_expired' }
  }
  if (existing.requestHash !== requestHash) {
    return { type: IDEMPOTENCY_DECISION.CONFLICT }
  }
  if (existing.status === IDEMPOTENCY_STATUS.COMPLETED) {
    return { type: IDEMPOTENCY_DECISION.REPLAY, safeResult: existing.safeResult }
  }
  if (existing.leaseExpiresAt === null || existing.leaseExpiresAt.getTime() <= now.getTime()) {
    return { type: IDEMPOTENCY_DECISION.EXECUTE, reason: 'lease_expired' }
  }
  return {
    type: IDEMPOTENCY_DECISION.BUSY,
    retryAfterMs: Math.max(1, existing.leaseExpiresAt.getTime() - now.getTime()),
  }
}
