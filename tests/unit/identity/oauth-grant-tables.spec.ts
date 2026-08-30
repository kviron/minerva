import { getTableConfig } from 'drizzle-orm/pg-core'
import { describe, expect, it } from 'vitest'
import {
  oauthAccessToken,
  oauthClient,
  oauthConsent,
  oauthGrants,
  oauthRefreshToken,
} from '../../../server/infrastructure/database/schema/oauth'

const config = (table: Parameters<typeof getTableConfig>[0]) => getTableConfig(table)

describe('OAuth provider and Minerva grant tables', () => {
  it('keeps Better Auth model names available to the Drizzle adapter', () => {
    expect(config(oauthClient).name).toBe('oauth_client')
    expect(config(oauthRefreshToken).name).toBe('oauth_refresh_token')
    expect(config(oauthAccessToken).name).toBe('oauth_access_token')
    expect(config(oauthConsent).name).toBe('oauth_consent')
  })

  it('stores one resource-bound grant with a closed revocation state', () => {
    const grant = config(oauthGrants)
    const checks = grant.checks.map(item => item.name)
    const indexes = grant.indexes.map(item => item.config.name)

    expect(grant.name).toBe('oauth_grants')
    expect(checks).toContain('oauth_grants_status_check')
    expect(checks).toContain('oauth_grants_resource_check')
    expect(indexes).toContain('oauth_grants_active_subject_unique')
    expect(indexes).toContain('oauth_grants_user_id_idx')
  })

  it('indexes the stable grant reference across consent and token families', () => {
    expect(config(oauthConsent).indexes.map(item => item.config.name)).toContain('oauth_consent_reference_id_idx')
    expect(config(oauthRefreshToken).indexes.map(item => item.config.name)).toContain('oauth_refresh_token_reference_id_idx')
    expect(config(oauthAccessToken).indexes.map(item => item.config.name)).toContain('oauth_access_token_reference_id_idx')
  })

  it('links access tokens to refresh tokens without cascading into grants', () => {
    const access = config(oauthAccessToken)
    const foreignKeys = access.foreignKeys.map(item => item.getName())

    expect(foreignKeys).toContain('oauth_access_token_refresh_id_oauth_refresh_token_id_fk')
    expect(foreignKeys).not.toContain('oauth_access_token_reference_id_oauth_grants_fk')
  })
})
