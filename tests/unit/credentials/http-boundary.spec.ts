import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { createCredentialBodySchema, revealCredentialBodySchema, updateCredentialBodySchema } from '../../../server/modules/credentials/http-schemas'

const read = (path: string) => readFile(new URL(path, import.meta.url), 'utf8')

describe('credential HTTP boundary', () => {
  it('strictly validates create, update, and one-field reveal bodies', () => {
    expect(createCredentialBodySchema.safeParse({
      categoryId: '11111111-1111-4111-8111-111111111111', title: 'Panel', fields: [], actorUserId: 'forbidden',
    }).success).toBe(false)
    expect(updateCredentialBodySchema.safeParse({
      categoryId: '11111111-1111-4111-8111-111111111111', title: 'Panel', login: { kind: 'keep' }, password: { kind: 'clear' }, fields: [],
    }).success).toBe(true)
    expect(revealCredentialBodySchema.safeParse({ target: 'password' }).success).toBe(true)
    expect(revealCredentialBodySchema.safeParse({ target: 'all' }).success).toBe(false)
  })

  it('keeps reveal no-store, rate-limited, session-derived, and outside MCP', async () => {
    const [reveal, mcpBoundary] = await Promise.all([
      read('../../../server/api/projects/[id]/credentials/[credentialId]/reveal.post.ts'),
      read('../../../docs/decisions/0004-mcp-first-release-boundary.md'),
    ])
    expect(reveal).toContain("setHeader(event, 'Cache-Control', 'no-store')")
    expect(reveal).toContain("scope: 'credential-reveal'")
    expect(reveal).toContain('requireSession(event)')
    expect(reveal).toContain('session.user.id')
    expect(mcpBoundary).not.toMatch(/credential.*(?:resource|tool)/iu)
  })
})
