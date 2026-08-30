import { getTableConfig } from 'drizzle-orm/pg-core'
import { describe, expect, it } from 'vitest'
import { mcpIdempotencyRecords } from '../../../server/infrastructure/database/schema/mcp'

describe('MCP idempotency schema', () => {
  it('scopes keys to grant, tool, project, and idempotency key', () => {
    const config = getTableConfig(mcpIdempotencyRecords)
    expect(config.uniqueConstraints.map(constraint => constraint.name)).toContain(
      'mcp_idempotency_scope_unique',
    )
  })

  it('constrains hashes, leases, terminal results, and bounded retention', () => {
    const names = getTableConfig(mcpIdempotencyRecords).checks.map(check => check.name)
    expect(names).toEqual(expect.arrayContaining([
      'mcp_idempotency_request_hash_check',
      'mcp_idempotency_key_check',
      'mcp_idempotency_state_check',
      'mcp_idempotency_retention_check',
    ]))
  })
})
