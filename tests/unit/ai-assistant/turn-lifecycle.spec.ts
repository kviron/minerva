import { describe, expect, it, vi } from 'vitest'
import { AI_PROVIDER } from '../../../shared/ai-assistant/constants'
import {
  AI_TURN_ADMISSION_CODE,
  AI_TURN_OUTCOME,
  createAssistantTurnLifecycle,
} from '../../../server/modules/ai-assistant/assistant-turn-lifecycle'

const projectId = '00000000-0000-4000-8000-000000000101'
const actorUserId = '00000000-0000-4000-8000-000000000102'
const connectionId = '00000000-0000-4000-8000-000000000104'
const requestId = '00000000-0000-4000-8000-000000000105'
const leaseToken = '00000000-0000-4000-8000-000000000106'

const input = {
  projectId,
  actorUserId,
  connectionId,
  provider: AI_PROVIDER.OPENAI,
  model: 'gpt-5-mini',
  requestTimeoutMs: 30_000,
}

describe('assistant turn lifecycle', () => {
  it('creates bounded admission commands without content', async () => {
    const begin = vi.fn().mockResolvedValue({ type: 'acquired' as const })
    const lifecycle = createAssistantTurnLifecycle({
      begin,
      finish: vi.fn(),
      now: () => new Date('2026-07-29T10:00:00.000Z'),
      createId: vi.fn()
        .mockReturnValueOnce(requestId)
        .mockReturnValueOnce(leaseToken),
    })

    const result = await lifecycle.begin(input)

    expect(result).toEqual({
      ok: true,
      value: expect.objectContaining({ requestId, leaseToken }),
    })
    expect(begin).toHaveBeenCalledWith(expect.objectContaining({
      projectId,
      actorUserId,
      requestId,
      leaseToken,
      maxRequests: 10,
      rateWindowSeconds: 300,
      leaseExpiresAt: new Date('2026-07-29T10:00:45.000Z'),
    }))
    const serialized = JSON.stringify(begin.mock.calls[0]?.[0])
    expect(serialized).not.toMatch(/question|answer|excerpt|apiKey|prompt|completion/u)
  })

  it.each([
    ['concurrent', AI_TURN_ADMISSION_CODE.TURN_IN_PROGRESS],
    ['rate_limited', AI_TURN_ADMISSION_CODE.RATE_LIMITED],
  ] as const)('maps %s admission without creating a lifecycle context', async (type, code) => {
    const lifecycle = createAssistantTurnLifecycle({
      begin: vi.fn().mockResolvedValue({ type, retryAfterMs: 1_000 }),
      finish: vi.fn(),
      now: () => new Date(),
      createId: vi.fn().mockReturnValueOnce(requestId).mockReturnValueOnce(leaseToken),
    })

    await expect(lifecycle.begin(input)).resolves.toEqual({ ok: false, code, retryAfterMs: 1_000 })
  })

  it('records bounded usage and duration without content', async () => {
    const finish = vi.fn().mockResolvedValue(undefined)
    const times = [
      new Date('2026-07-29T10:00:00.000Z'),
      new Date('2026-07-29T10:00:01.250Z'),
    ]
    const lifecycle = createAssistantTurnLifecycle({
      begin: vi.fn().mockResolvedValue({ type: 'acquired' }),
      finish,
      now: () => times.shift() ?? new Date('2026-07-29T10:00:01.250Z'),
      createId: vi.fn().mockReturnValueOnce(requestId).mockReturnValueOnce(leaseToken),
    })
    const started = await lifecycle.begin(input)
    if (!started.ok) throw new Error('Expected admission')

    await lifecycle.finish(started.value, {
      outcome: AI_TURN_OUTCOME.COMPLETED,
      usage: { inputTokens: 80, outputTokens: 11 },
      errorCode: null,
    })

    expect(finish).toHaveBeenCalledWith(expect.objectContaining({
      requestId,
      leaseToken,
      durationMs: 1_250,
      inputTokens: 80,
      outputTokens: 11,
      outcome: AI_TURN_OUTCOME.COMPLETED,
      errorCode: null,
    }))
    expect(JSON.stringify(finish.mock.calls[0]?.[0]))
      .not.toMatch(/question|answer|excerpt|apiKey|prompt|completion/u)
  })
})
