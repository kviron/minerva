import { getTableConfig } from 'drizzle-orm/pg-core'
import { describe, expect, it } from 'vitest'
import { projectAiConnections } from '../../../server/infrastructure/database/schema/ai-assistant'

describe('project AI connection table', () => {
  it('stores one encrypted provider connection per project with safe limits', () => {
    const config = getTableConfig(projectAiConnections)

    expect(config.name).toBe('project_ai_connections')
    expect(config.columns.map(column => column.name)).toEqual(expect.arrayContaining([
      'project_id',
      'provider',
      'model',
      'api_key_ciphertext',
      'api_key_nonce',
      'api_key_key_version',
      'status',
      'max_output_tokens',
      'request_timeout_ms',
      'created_by_user_id',
      'updated_by_user_id',
    ]))
    expect(config.uniqueConstraints.map(item => item.name)).toContain('project_ai_connections_project_id_unique')
    expect(config.checks.map(item => item.name)).toEqual(expect.arrayContaining([
      'project_ai_connections_provider_check',
      'project_ai_connections_status_check',
      'project_ai_connections_api_key_envelope_check',
      'project_ai_connections_limits_check',
    ]))
  })
})
