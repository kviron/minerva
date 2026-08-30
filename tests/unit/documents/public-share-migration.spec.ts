import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

describe('public document share migration', () => {
  it('creates encrypted share storage and grants documents.share only to Admin and Editor', async () => {
    const migration = await readFile('drizzle/0020_document_public_shares.sql', 'utf8')
    expect(migration).toContain('CREATE TABLE "document_public_shares"')
    expect(migration).toContain('document_public_shares_active_scope_unique')
    expect(migration).toContain("'documents.share'")
    expect(migration).toContain("built_in_key in ('admin', 'editor')")
    expect(migration).not.toMatch(/built_in_key\s*=\s*'viewer'.*documents\.share/isu)
    expect(migration).not.toMatch(/"token"\s+text/iu)
  })
})
