import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

const endpoints = [
  'server/api/projects/[id]/ai-assistant/availability.get.ts',
  'server/api/projects/[id]/ai-assistant/connection.get.ts',
  'server/api/projects/[id]/ai-assistant/connection.put.ts',
  'server/api/projects/[id]/ai-assistant/connection.delete.ts',
  'server/api/projects/[id]/ai-assistant/connection/test.post.ts',
]

describe('project AI connection HTTP boundary', () => {
  it('keeps handlers thin, validated, no-store, and free of secret projections', async () => {
    const sources = await Promise.all(endpoints.map(path => readFile(path, 'utf8')))

    for (const source of sources) {
      expect(source).toContain("'Cache-Control', 'private, no-store'")
      expect(source).toContain('getProjectAiConnectionService()')
      expect(source).toContain('projectAiRouteParamsSchema')
      expect(source).not.toContain('apiKeyCiphertext')
      expect(source).not.toContain('apiKeyNonce')
      expect(source).not.toMatch(/as\s+\{\s*user/u)
    }
    expect(sources[0]).toContain('readAvailability')
    expect(sources[1]).toContain('read(')
    expect(sources[2]).toContain('projectAiConnectionUpsertRequestSchema')
  })

  it('keeps the first read-only assistant turn endpoint validated and no-store', async () => {
    const source = await readFile('server/api/projects/[id]/ai-assistant/turn.post.ts', 'utf8')

    expect(source).toContain("'Cache-Control', 'private, no-store'")
    expect(source).toContain('projectAiRouteParamsSchema')
    expect(source).toContain('projectAssistantTurnRequestSchema')
    expect(source).toContain('projectAssistantTurnResponseSchema')
    expect(source).toContain('getProjectAssistantTurnService().answer')
    expect(source).not.toContain('apiKey')
    expect(source).not.toContain('ciphertext')
  })

  it('keeps streaming transport isolated from provider secrets and validates every SSE event', async () => {
    const source = await readFile('server/api/projects/[id]/ai-assistant/turn/stream.post.ts', 'utf8')

    expect(source).toContain('createEventStream')
    expect(source).toContain('projectAssistantTurnRequestSchema')
    expect(source).toContain('projectAssistantStreamEventSchema.parse')
    expect(source).toContain('getProjectAssistantStreamService().stream')
    expect(source).toContain('AbortController')
    expect(source).toContain("'Cache-Control', 'private, no-store'")
    expect(source).not.toContain('apiKey')
    expect(source).not.toContain('ciphertext')
  })

  it('keeps secrets and instructions out of audit metadata', async () => {
    const source = await readFile('server/modules/ai-assistant/project-ai-connection-repository.ts', 'utf8')
    const metadataBlocks = [...source.matchAll(/metadata:\s*\{([^}]*)\}/gu)].map(match => match[1] ?? '')

    expect(metadataBlocks.length).toBeGreaterThan(0)
    for (const metadata of metadataBlocks) {
      expect(metadata).not.toMatch(/apiKey|ciphertext|nonce|systemInstructions/u)
    }
  })
})
