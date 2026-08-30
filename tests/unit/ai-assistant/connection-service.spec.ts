import { describe, expect, it, vi } from 'vitest'
import {
  AI_ASSISTANT_AVAILABILITY,
  AI_CONNECTION_STATUS,
  AI_PROVIDER,
} from '../../../shared/ai-assistant/constants'
import { createProjectAiConnectionService } from '../../../server/modules/ai-assistant/project-ai-connections'

const input = {
  provider: AI_PROVIDER.OPENAI,
  model: 'gpt-5-mini',
  apiKey: 'sk-test-12345678901234567890',
  enabled: true,
  systemInstructions: 'Отвечай по-русски.',
  maxOutputTokens: 2048,
  requestTimeoutMs: 30_000,
}

const stored = {
  id: '00000000-0000-4000-8000-000000000091',
  projectId: '00000000-0000-4000-8000-000000000092',
  provider: AI_PROVIDER.OPENAI,
  model: 'gpt-5-mini',
  apiKeyCiphertext: 'ciphertext',
  apiKeyNonce: 'nonce',
  apiKeyKeyVersion: 1,
  enabled: true,
  status: AI_CONNECTION_STATUS.UNVERIFIED,
  systemInstructions: 'Отвечай по-русски.',
  maxOutputTokens: 2048,
  requestTimeoutMs: 30_000,
  lastValidatedAt: null,
  createdAt: new Date('2026-07-16T12:00:00.000Z'),
  updatedAt: new Date('2026-07-16T12:00:00.000Z'),
}

const allowed = vi.fn().mockResolvedValue({ allowed: true })

describe('project AI connection service', () => {
  it.each([
    [null, AI_ASSISTANT_AVAILABILITY.NOT_CONFIGURED],
    [{ ...stored, enabled: false }, AI_ASSISTANT_AVAILABILITY.DISABLED],
    [stored, AI_ASSISTANT_AVAILABILITY.NEEDS_VALIDATION],
    [{ ...stored, status: AI_CONNECTION_STATUS.VALID }, AI_ASSISTANT_AVAILABILITY.READY],
  ])('projects a safe use-scoped availability for %#', async (record, availability) => {
    const authorize = vi.fn().mockResolvedValue({ allowed: true })
    const repository = {
      load: vi.fn().mockResolvedValue(record),
      save: vi.fn(),
      markValidation: vi.fn(),
      disconnect: vi.fn(),
    }
    const service = createProjectAiConnectionService({
      authorize,
      repository,
      crypto: { encrypt: vi.fn(), decrypt: vi.fn() },
      testProvider: vi.fn(),
      createId: vi.fn(),
    })

    await expect(service.readAvailability({
      projectId: stored.projectId,
      actorUserId: 'user-1',
    })).resolves.toEqual({ ok: true, value: { availability } })
    expect(authorize).toHaveBeenCalledWith(expect.objectContaining({
      permission: 'project.ai.use',
    }))
  })

  it('does not load availability when use permission is absent', async () => {
    const repository = { load: vi.fn(), save: vi.fn(), markValidation: vi.fn(), disconnect: vi.fn() }
    const service = createProjectAiConnectionService({
      authorize: vi.fn().mockResolvedValue({ allowed: false, code: 'PERMISSION_DENIED' }),
      repository,
      crypto: { encrypt: vi.fn(), decrypt: vi.fn() },
      testProvider: vi.fn(),
      createId: vi.fn(),
    })

    await expect(service.readAvailability({
      projectId: stored.projectId,
      actorUserId: 'user-1',
    })).resolves.toEqual({ ok: false, code: 'PERMISSION_DENIED' })
    expect(repository.load).not.toHaveBeenCalled()
  })

  it('fails closed before loading data when manage permission is absent', async () => {
    const repository = { load: vi.fn(), save: vi.fn(), markValidation: vi.fn(), disconnect: vi.fn() }
    const service = createProjectAiConnectionService({
      authorize: vi.fn().mockResolvedValue({ allowed: false, code: 'PERMISSION_DENIED' }),
      repository,
      crypto: { encrypt: vi.fn(), decrypt: vi.fn() },
      testProvider: vi.fn(),
      createId: vi.fn(),
    })

    await expect(service.read({ projectId: stored.projectId, actorUserId: 'user-1' }))
      .resolves.toEqual({ ok: false, code: 'PERMISSION_DENIED' })
    expect(repository.load).not.toHaveBeenCalled()
  })

  it('encrypts the key with project/connection context and returns only a safe projection', async () => {
    const repository = {
      load: vi.fn(),
      save: vi.fn().mockResolvedValue(stored),
      markValidation: vi.fn(),
      disconnect: vi.fn(),
    }
    const crypto = {
      encrypt: vi.fn().mockReturnValue({ ciphertext: 'ciphertext', nonce: 'nonce', keyVersion: 1 }),
      decrypt: vi.fn(),
    }
    const service = createProjectAiConnectionService({
      authorize: allowed,
      repository,
      crypto,
      testProvider: vi.fn(),
      createId: () => stored.id,
    })

    const result = await service.save({ projectId: stored.projectId, actorUserId: 'user-1', input })

    expect(crypto.encrypt).toHaveBeenCalledWith(input.apiKey, { projectId: stored.projectId, connectionId: stored.id })
    expect(repository.save).toHaveBeenCalledWith(expect.not.objectContaining({ apiKey: input.apiKey }))
    expect(result).toEqual({ ok: true, value: expect.not.objectContaining({
      apiKey: expect.anything(),
      apiKeyCiphertext: expect.anything(),
      apiKeyNonce: expect.anything(),
    }) })
  })

  it('decrypts only for a bounded provider test and persists a safe validation status', async () => {
    const valid = { ...stored, status: AI_CONNECTION_STATUS.VALID, lastValidatedAt: new Date('2026-07-16T12:01:00.000Z') }
    const repository = {
      load: vi.fn().mockResolvedValue(stored),
      save: vi.fn(),
      markValidation: vi.fn().mockResolvedValue(valid),
      disconnect: vi.fn(),
    }
    const testProvider = vi.fn().mockResolvedValue({ reachable: true })
    const service = createProjectAiConnectionService({
      authorize: allowed,
      repository,
      crypto: { encrypt: vi.fn(), decrypt: vi.fn().mockReturnValue('sk-private') },
      testProvider,
      createId: vi.fn(),
    })

    const result = await service.test({ projectId: stored.projectId, actorUserId: 'user-1' })

    expect(testProvider).toHaveBeenCalledWith({
      provider: AI_PROVIDER.OPENAI,
      model: stored.model,
      apiKey: 'sk-private',
      timeoutMs: stored.requestTimeoutMs,
    })
    expect(repository.markValidation).toHaveBeenCalledWith(expect.objectContaining({
      connectionId: stored.id,
      status: AI_CONNECTION_STATUS.VALID,
    }))
    expect(result).toEqual({ ok: true, value: { connection: expect.any(Object), reachable: true } })
    expect(JSON.stringify(result)).not.toContain('sk-private')
  })
})
