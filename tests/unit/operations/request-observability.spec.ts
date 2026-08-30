import { describe, expect, it, vi } from 'vitest'

import {
  createRequestIdentity,
  createRequestLogRecord,
  requestTelemetryRoute,
} from '../../../server/modules/operations/request-observability'

describe('request identity', () => {
  it('propagates only canonical UUID request IDs', () => {
    const createId = vi.fn(() => '00000000-0000-4000-8000-000000000002')

    expect(createRequestIdentity('00000000-0000-4000-8000-000000000001', createId))
      .toBe('00000000-0000-4000-8000-000000000001')
    expect(createId).not.toHaveBeenCalled()
  })

  it.each([undefined, '', 'request-1', '00000000-0000-0000-0000-000000000001', 'secret\r\nx-test: injected'])(
    'replaces invalid inbound value %s',
    (input) => {
      expect(createRequestIdentity(input, () => '00000000-0000-4000-8000-000000000002'))
        .toBe('00000000-0000-4000-8000-000000000002')
    },
  )
})

describe('request telemetry route', () => {
  it.each([
    ['/api/public/documentation/abcdefghijklmnopqrstuvwxyzABCDEFGH123456789', '/api/public/documentation/[capability]'],
    ['/api/public/documentation/abcdefghijklmnopqrstuvwxyzABCDEFGH123456789/pages/21b9fc31-6e20-4399-a2ea-fb4de1024821', '/api/public/documentation/[capability]/pages/[id]'],
    ['/share/documentation/abcdefghijklmnopqrstuvwxyzABCDEFGH123456789/21b9fc31-6e20-4399-a2ea-fb4de1024821', '/share/documentation/[capability]/[id]'],
    ['/api/projects/21b9fc31-6e20-4399-a2ea-fb4de1024821/documents/search', '/api/projects/[id]/documents/search'],
    ['/mcp', '/mcp'],
  ])('redacts %s as %s', (path, expected) => {
    expect(requestTelemetryRoute(path)).toBe(expected)
  })
})

describe('closed structured request logs', () => {
  it('serializes only safe bounded fields on success and failure', () => {
    const common = {
      requestId: '00000000-0000-4000-8000-000000000001',
      method: 'POST',
      route: '/api/projects/[id]/documents/search',
      statusCode: 200,
      durationMs: 12.8,
      occurredAt: '2026-08-05T00:00:00.000Z',
    }
    const success = createRequestLogRecord({ type: 'completed', ...common })
    const failure = createRequestLogRecord({ type: 'failed', ...common, statusCode: 500 })

    expect(success).toEqual({
      timestamp: common.occurredAt,
      level: 'info',
      event: 'http.request.completed',
      requestId: common.requestId,
      method: 'POST',
      route: common.route,
      statusCode: 200,
      durationMs: 13,
    })
    expect(failure).toMatchObject({ level: 'error', event: 'http.request.failed', statusCode: 500 })

    const serialized = JSON.stringify([success, failure])
    for (const canary of ['authorization', 'cookie', 'document body canary', 's3-secret', 'capability-token']) {
      expect(serialized).not.toContain(canary)
    }
  })

  it('drops unexpected sensitive properties even when an untyped caller supplies them', () => {
    const pollutedInput = {
      type: 'failed' as const,
      requestId: '00000000-0000-4000-8000-000000000001',
      method: 'POST',
      route: '/mcp',
      statusCode: 500,
      durationMs: 4,
      occurredAt: '2026-08-05T00:00:00.000Z',
      headers: { authorization: 'Bearer AUTH-CANARY', cookie: 'COOKIE-CANARY' },
      body: 'DOCUMENT-CONTENT-CANARY',
      url: 'https://example.test/share/documentation/CAPABILITY-CANARY',
      error: new Error('PROVIDER-KEY-CANARY'),
      storagePath: '/private/STORAGE-PATH-CANARY',
    }

    const serialized = JSON.stringify(createRequestLogRecord(pollutedInput))
    for (const canary of ['AUTH-CANARY', 'COOKIE-CANARY', 'DOCUMENT-CONTENT-CANARY', 'CAPABILITY-CANARY', 'PROVIDER-KEY-CANARY', 'STORAGE-PATH-CANARY']) {
      expect(serialized).not.toContain(canary)
    }
  })
})
