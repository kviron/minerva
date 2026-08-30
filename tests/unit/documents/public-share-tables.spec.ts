import { getTableConfig } from 'drizzle-orm/pg-core'
import { describe, expect, it } from 'vitest'
import { documentPublicShares } from '../../../server/infrastructure/database/schema/document-sharing'

describe('public document share table', () => {
  it('stores an encrypted capability envelope and content-free lifecycle metadata', () => {
    const table = getTableConfig(documentPublicShares)
    const columns = table.columns.map(column => column.name)
    expect(columns).toEqual(expect.arrayContaining([
      'project_id', 'root_document_id', 'scope', 'token_hash',
      'token_ciphertext', 'token_nonce', 'token_key_version',
      'created_by_user_id', 'revoked_by_user_id', 'created_at', 'revoked_at', 'updated_at',
    ]))
    expect(table.checks.map(check => check.name)).toEqual(expect.arrayContaining([
      'document_public_shares_scope_check',
      'document_public_shares_token_hash_check',
      'document_public_shares_envelope_check',
      'document_public_shares_revocation_check',
    ]))
    expect(table.indexes.map(index => index.config.name)).toEqual(expect.arrayContaining([
      'document_public_shares_token_hash_unique',
      'document_public_shares_active_scope_unique',
    ]))
    expect(columns).not.toEqual(expect.arrayContaining(['token', 'content', 'draft_content']))
  })
})

