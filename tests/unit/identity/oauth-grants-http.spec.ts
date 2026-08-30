import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFile(new URL(path, import.meta.url), 'utf8')

describe('OAuth grant HTTP boundary', () => {
  it('keeps session ownership and revocation in the shared service', async () => {
    const [list, revoke] = await Promise.all([
      read('../../../server/api/oauth/grants/index.get.ts'),
      read('../../../server/api/oauth/grants/[grantId]/revoke.post.ts'),
    ])

    expect(list).toContain('requireSession(event)')
    expect(list).toContain('createOAuthGrantManagement')
    expect(revoke).toContain('requireSession(event)')
    expect(revoke).toContain('createOAuthGrantManagement')
    expect(revoke).toContain('expectedUpdatedAt')
    expect(list).toContain("'Cache-Control', 'private, no-store'")
    expect(revoke).toContain("'Cache-Control', 'private, no-store'")
    expect(revoke).toContain('getValidatedRouterParams')
    expect(revoke).toContain('readValidatedBody')
    expect(revoke).toContain('oauthGrantRouteParamsSchema')
    expect(revoke).toContain('revokeOAuthGrantRequestSchema')
  })
})
