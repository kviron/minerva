import { describe, expect, it, vi } from 'vitest'
import {
  IDEMPOTENCY_RUN_RESULT,
  createMcpIdempotencyCoordinator,
  hashIdempotencyRequest,
} from '../../../server/modules/mcp/idempotency-coordinator'

const command = {
  grantId: '00000000-0000-4000-8000-000000000061',
  toolName: 'minerva_document_create',
  projectId: '00000000-0000-4000-8000-000000000062',
  idempotencyKey: 'create-home-page',
  requestHash: 'a'.repeat(64),
}

describe('MCP idempotency coordinator', () => {
  it('hashes equivalent validated objects independently of property order', () => {
    expect(hashIdempotencyRequest({ title: 'Home', parentId: null }))
      .toBe(hashIdempotencyRequest({ parentId: null, title: 'Home' }))
    expect(hashIdempotencyRequest({ title: 'Other', parentId: null }))
      .not.toBe(hashIdempotencyRequest({ title: 'Home', parentId: null }))
  })

  it('executes and records a new operation once', async () => {
    const begin = vi.fn().mockResolvedValue({ type: 'execute', leaseToken: 'lease-1' })
    const complete = vi.fn().mockResolvedValue(true)
    const operation = vi.fn().mockResolvedValue({ documentId: 'document-1' })
    const run = createMcpIdempotencyCoordinator({ begin, complete })

    await expect(run(command, operation)).resolves.toEqual({
      type: IDEMPOTENCY_RUN_RESULT.EXECUTED,
      safeResult: { documentId: 'document-1' },
    })
    expect(operation).toHaveBeenCalledOnce()
    expect(complete).toHaveBeenCalledWith({ ...command, leaseToken: 'lease-1' }, { documentId: 'document-1' })
  })

  it('returns a stored result without invoking the operation', async () => {
    const operation = vi.fn()
    const run = createMcpIdempotencyCoordinator({
      begin: vi.fn().mockResolvedValue({ type: 'replay', safeResult: { documentId: 'document-1' } }),
      complete: vi.fn(),
    })

    await expect(run(command, operation)).resolves.toEqual({
      type: IDEMPOTENCY_RUN_RESULT.REPLAYED,
      safeResult: { documentId: 'document-1' },
    })
    expect(operation).not.toHaveBeenCalled()
  })

  it.each([
    ['conflict', IDEMPOTENCY_RUN_RESULT.CONFLICT],
    ['busy', IDEMPOTENCY_RUN_RESULT.BUSY],
    ['grant_inactive', IDEMPOTENCY_RUN_RESULT.GRANT_INACTIVE],
  ])('preserves the expected %s outcome', async (type, expected) => {
    const run = createMcpIdempotencyCoordinator({
      begin: vi.fn().mockResolvedValue({ type, retryAfterMs: type === 'busy' ? 500 : undefined }),
      complete: vi.fn(),
    })
    await expect(run(command, vi.fn())).resolves.toMatchObject({ type: expected })
  })

  it('rejects a stale executor whose lease was reclaimed', async () => {
    const run = createMcpIdempotencyCoordinator({
      begin: vi.fn().mockResolvedValue({ type: 'execute', leaseToken: 'old-lease' }),
      complete: vi.fn().mockResolvedValue(false),
    })
    await expect(run(command, async () => ({ ok: true }))).resolves.toEqual({
      type: IDEMPOTENCY_RUN_RESULT.LEASE_LOST,
    })
  })
})
