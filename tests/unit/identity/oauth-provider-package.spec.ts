import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

type PackageManifest = Readonly<{
  dependencies?: Readonly<Record<string, string>>
  peerDependencies?: Readonly<Record<string, string>>
  version?: string
}>

const readManifest = async (path: string): Promise<PackageManifest> =>
  JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'))

describe('Better Auth OAuth Provider package contract', () => {
  it('pins the provider to the exact Better Auth core version', async () => {
    const [application, provider] = await Promise.all([
      readManifest('../../../package.json'),
      readManifest('../../../node_modules/@better-auth/oauth-provider/package.json'),
    ])

    const betterAuthVersion = application.dependencies?.['better-auth']

    expect(betterAuthVersion).toBe('1.6.22')
    expect(application.dependencies?.['@better-auth/oauth-provider']).toBe(betterAuthVersion)
    expect(provider.version).toBe(betterAuthVersion)
    expect(provider.peerDependencies?.['better-auth']).toContain('1.6.22')
  })

  it('propagates one reference through opaque access, refresh, and rotated token creation', async () => {
    const source = await readFile(
      new URL('../../../node_modules/@better-auth/oauth-provider/dist/index.mjs', import.meta.url),
      'utf8',
    )

    expect(source).toContain('createOpaqueAccessToken(ctx, opts, user, client, scopes')
    expect(source).toContain('referenceId, earlyRefreshToken?.id)')
    expect(source).toContain('createRefreshToken(ctx, opts, user, referenceId, client, scopes')
    expect(source).toContain('referenceId: refreshToken.referenceId')
  })
})
