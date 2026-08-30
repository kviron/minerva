export const AI_PROVIDER = {
  OPENAI: 'openai',
} as const

export const AI_CONNECTION_STATUS = {
  UNVERIFIED: 'unverified',
  VALID: 'valid',
  INVALID: 'invalid',
} as const

export const AI_ASSISTANT_AVAILABILITY = {
  READY: 'ready',
  NOT_CONFIGURED: 'not_configured',
  DISABLED: 'disabled',
  NEEDS_VALIDATION: 'needs_validation',
} as const

export const AI_DOCUMENT_PROPOSAL_KIND = {
  CREATE: 'create',
  UPDATE: 'update',
} as const

export const AI_DOCUMENT_PROPOSAL_STATUS = {
  PENDING: 'pending',
  APPLIED: 'applied',
  REJECTED: 'rejected',
  STALE: 'stale',
  EXPIRED: 'expired',
} as const

export const AI_DOCUMENT_PROPOSAL_DECISION = {
  CONFIRM: 'confirm',
  REJECT: 'reject',
} as const

export const AI_DOCUMENT_PROPOSAL_TRANSITION = {
  TRANSITION: 'transition',
  REPLAY: 'replay',
  INVALID: 'invalid',
} as const

export const AI_DOCUMENT_PROPOSAL_CONTENT_MAX_BYTES = 64 * 1024
export const AI_DOCUMENT_PROPOSAL_PENDING_MINUTES = 15
export const AI_DOCUMENT_PROPOSAL_RECEIPT_HOURS = 24
export const AI_DOCUMENT_PROPOSAL_CLEANUP_BATCH_MAX = 1_000

export const AI_MODEL_MAX_LENGTH = 100
export const AI_API_KEY_MIN_LENGTH = 16
export const AI_API_KEY_MAX_LENGTH = 512
export const AI_SYSTEM_INSTRUCTIONS_MAX_LENGTH = 4_000
export const AI_MAX_OUTPUT_TOKENS_MIN = 128
export const AI_MAX_OUTPUT_TOKENS_MAX = 8_192
export const AI_REQUEST_TIMEOUT_MS_MIN = 5_000
export const AI_REQUEST_TIMEOUT_MS_MAX = 120_000
export const AI_QUESTION_MAX_LENGTH = 4_000
export const AI_ASSISTANT_ANSWER_MAX_LENGTH = 12_000
export const AI_TURN_RATE_MAX_REQUESTS = 10
export const AI_TURN_RATE_WINDOW_SECONDS = 300
export const AI_TURN_LEASE_GRACE_MS = 15_000
export const AI_TURN_ERROR_CODE_MAX_LENGTH = 100
export const AI_CONVERSATION_TITLE_MAX_LENGTH = 120
export const AI_CONVERSATION_RETENTION_DAYS = 30
export const AI_CONVERSATION_TRASH_DAYS = 7
export const AI_CONVERSATION_PAGE_DEFAULT = 20
export const AI_CONVERSATION_PAGE_MAX = 50

export const AI_CONVERSATION_STATUS = {
  ACTIVE: 'active',
  TRASH: 'trash',
} as const

export const AI_CONVERSATION_MESSAGE_ROLE = {
  USER: 'user',
  ASSISTANT: 'assistant',
} as const

export const AI_TURN_OUTCOME = {
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  DENIED: 'denied',
} as const

export const AI_ASSISTANT_STREAM_EVENT = {
  CONTEXT: 'context',
  DELTA: 'delta',
  COMPLETED: 'completed',
  ERROR: 'error',
} as const

export const AI_ASSISTANT_STREAM_ERROR = {
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  PROVIDER_UNAVAILABLE: 'PROVIDER_UNAVAILABLE',
  INVALID_RESPONSE: 'INVALID_RESPONSE',
  CANCELLED: 'CANCELLED',
} as const
