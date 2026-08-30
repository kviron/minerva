import { getTableConfig } from 'drizzle-orm/pg-core'
import { describe, expect, it } from 'vitest'
import {
  projectAiTurnControls,
  projectAiUsageEvents,
} from '../../../server/infrastructure/database/schema/ai-assistant'

describe('project AI turn control and usage schema', () => {
  it('keeps one atomic control row per project and user', () => {
    const config = getTableConfig(projectAiTurnControls)

    expect(config.name).toBe('project_ai_turn_controls')
    expect(config.uniqueConstraints.map(value => value.name))
      .toContain('project_ai_turn_controls_project_user_unique')
    expect(config.checks.map(value => value.name)).toEqual(expect.arrayContaining([
      'project_ai_turn_controls_rate_count_check',
      'project_ai_turn_controls_lease_pair_check',
    ]))
  })

  it('stores only bounded content-free usage metadata', () => {
    const config = getTableConfig(projectAiUsageEvents)
    const columns = config.columns.map(column => column.name)

    expect(config.name).toBe('project_ai_usage_events')
    expect(columns).toEqual(expect.arrayContaining([
      'project_id',
      'user_id',
      'request_id',
      'provider',
      'model',
      'input_tokens',
      'output_tokens',
      'duration_ms',
      'outcome',
      'error_code',
    ]))
    expect(columns).not.toEqual(expect.arrayContaining([
      'question',
      'answer',
      'prompt',
      'completion',
      'document_text',
      'api_key',
      'provider_payload',
    ]))
  })
})
