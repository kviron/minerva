import { getTableConfig } from 'drizzle-orm/pg-core'
import { describe, expect, it } from 'vitest'
import { projectAiDocumentProposals } from '../../../server/infrastructure/database/schema/ai-assistant'

describe('AI document proposal table', () => {
  it('keeps bounded pending payload and content-free terminal receipt invariants', () => {
    const table = getTableConfig(projectAiDocumentProposals)
    const columns = table.columns.map(column => column.name)
    const checks = table.checks.map(check => check.name)

    expect(columns).toEqual(expect.arrayContaining([
      'project_id', 'user_id', 'conversation_id', 'turn_request_id',
      'kind', 'status', 'target_document_id', 'requested_parent_id',
      'expected_draft_revision', 'base_title', 'base_content',
      'proposed_title', 'proposed_content', 'content_hash',
      'applied_document_id', 'applied_draft_revision',
      'expires_at', 'decided_at', 'purge_after',
    ]))
    expect(checks).toEqual(expect.arrayContaining([
      'project_ai_document_proposals_kind_check',
      'project_ai_document_proposals_status_check',
      'project_ai_document_proposals_payload_check',
      'project_ai_document_proposals_content_size_check',
      'project_ai_document_proposals_receipt_check',
    ]))
    expect(table.uniqueConstraints.map(item => item.name))
      .toContain('project_ai_document_proposals_turn_unique')
    expect(columns).not.toEqual(expect.arrayContaining([
      'provider_payload', 'prompt', 'api_key', 'tool_result',
    ]))
  })
})
