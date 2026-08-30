import { createHash } from 'node:crypto'

export type McpJsonPrimitive = string | number | boolean | null
export type McpJsonValue =
  | McpJsonPrimitive
  | readonly McpJsonValue[]
  | Readonly<{ [key: string]: McpJsonValue }>

export const IDEMPOTENCY_RUN_RESULT = {
  EXECUTED: 'executed',
  REPLAYED: 'replayed',
  CONFLICT: 'conflict',
  BUSY: 'busy',
  GRANT_INACTIVE: 'grant_inactive',
  LEASE_LOST: 'lease_lost',
} as const

export interface IdempotencyCommand {
  readonly grantId: string
  readonly toolName: string
  readonly projectId: string
  readonly idempotencyKey: string
  readonly requestHash: string
}

export interface IdempotencyLeaseCommand extends IdempotencyCommand {
  readonly leaseToken: string
}

export type IdempotencyPersistenceBegin =
  | Readonly<{ type: 'execute', leaseToken: string }>
  | Readonly<{ type: 'replay', safeResult: McpJsonValue }>
  | Readonly<{ type: 'conflict' }>
  | Readonly<{ type: 'busy', retryAfterMs: number }>
  | Readonly<{ type: 'grant_inactive' }>

export interface IdempotencyCoordinatorDependencies {
  readonly begin: (command: IdempotencyCommand) => Promise<IdempotencyPersistenceBegin>
  readonly complete: (command: IdempotencyLeaseCommand, safeResult: McpJsonValue) => Promise<boolean>
}

const canonicalJson = (value: unknown): string => {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return JSON.stringify(value)
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError('Idempotency input must contain finite numbers')
    return JSON.stringify(value)
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(',')}]`
  }
  if (typeof value !== 'object') throw new TypeError('Idempotency input must be JSON-safe')
  const entries = Object.entries(value).toSorted(([left], [right]) => left.localeCompare(right))
  return `{${entries.map(([key, entry]) => `${JSON.stringify(key)}:${canonicalJson(entry)}`).join(',')}}`
}

export const hashIdempotencyRequest = (validatedInput: unknown): string =>
  createHash('sha256').update(canonicalJson(validatedInput)).digest('hex')

export const createMcpIdempotencyCoordinator = (dependencies: IdempotencyCoordinatorDependencies) =>
  async <SafeResult extends McpJsonValue>(
    command: IdempotencyCommand,
    operation: () => Promise<SafeResult>,
  ): Promise<
    | Readonly<{ type: typeof IDEMPOTENCY_RUN_RESULT.EXECUTED, safeResult: SafeResult }>
    | Readonly<{ type: typeof IDEMPOTENCY_RUN_RESULT.REPLAYED, safeResult: McpJsonValue }>
    | Readonly<{ type: typeof IDEMPOTENCY_RUN_RESULT.CONFLICT }>
    | Readonly<{ type: typeof IDEMPOTENCY_RUN_RESULT.BUSY, retryAfterMs: number }>
    | Readonly<{ type: typeof IDEMPOTENCY_RUN_RESULT.GRANT_INACTIVE }>
    | Readonly<{ type: typeof IDEMPOTENCY_RUN_RESULT.LEASE_LOST }>
  > => {
    const begin = await dependencies.begin(command)
    if (begin.type === 'replay') {
      return { type: IDEMPOTENCY_RUN_RESULT.REPLAYED, safeResult: begin.safeResult }
    }
    if (begin.type === 'conflict') return { type: IDEMPOTENCY_RUN_RESULT.CONFLICT }
    if (begin.type === 'busy') return { type: IDEMPOTENCY_RUN_RESULT.BUSY, retryAfterMs: begin.retryAfterMs }
    if (begin.type === 'grant_inactive') return { type: IDEMPOTENCY_RUN_RESULT.GRANT_INACTIVE }

    const safeResult = await operation()
    const completed = await dependencies.complete({ ...command, leaseToken: begin.leaseToken }, safeResult)
    return completed
      ? { type: IDEMPOTENCY_RUN_RESULT.EXECUTED, safeResult }
      : { type: IDEMPOTENCY_RUN_RESULT.LEASE_LOST }
  }
