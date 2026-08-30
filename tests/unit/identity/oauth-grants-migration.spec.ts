import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

const migrationPath = new URL('../../../drizzle/0010_oauth_provider_grants.sql', import.meta.url)

describe('OAuth provider and grants migration', () => {
  it('creates only the new OAuth tables and their constraints', async () => {
    const sql = await readFile(migrationPath, 'utf8')

    for (const table of [
      'oauth_client',
      'oauth_grants',
      'oauth_consent',
      'oauth_refresh_token',
      'oauth_access_token',
    ]) {
      expect(sql).toContain(`CREATE TABLE "${table}"`)
    }

    expect(sql).not.toMatch(/^\s*(?:DROP|DELETE|TRUNCATE)\b/imu)
    expect(sql).not.toMatch(/ALTER TABLE "(?:user|session|account|verification|rate_limit|projects|documents|credentials)"/u)
    expect(sql).toContain('oauth_grants_active_subject_unique')
    expect(sql).toContain('oauth_grants_revocation_check')
    expect(sql).toContain('oauth_access_token_refresh_id_oauth_refresh_token_id_fk')
  })

  it('serializes token issuance against grant revocation', async () => {
    const guardSql = await readFile(new URL('../../../drizzle/0011_oauth_grant_token_guard.sql', import.meta.url), 'utf8')

    expect(guardSql).toContain('FOR KEY SHARE')
    expect(guardSql).toContain('oauth_refresh_token')
    expect(guardSql).toContain('oauth_access_token')
    expect(guardSql).toContain("status <> 'active'")
  })
})
