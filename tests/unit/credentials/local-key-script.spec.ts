import { readFile } from 'node:fs/promises'
import { expect, it } from 'vitest'

it('configures local credential encryption without printing or hard-coding key material', async () => {
  const source = await readFile(new URL('../../../scripts/configure-local-credential-key.ts', import.meta.url), 'utf8')
  expect(source).toContain('randomBytes(32)')
  expect(source).toContain("mode: 0o600")
  expect(source).toContain('refusing to replace existing key material')
  expect(source).not.toMatch(/console\.log\([^)]*(?:randomBytes|toString|CREDENTIAL_ENCRYPTION_KEYS)/u)
})
