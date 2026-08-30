import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

describe('AI document proposal migration', () => {
  it('creates bounded owner-scoped proposal storage and cleanup indexes', async () => {
    const migration = await readFile('drizzle/0019_project_ai_document_proposals.sql', 'utf8')

    expect(migration).toContain('CREATE TABLE "project_ai_document_proposals"')
    expect(migration).toContain('project_ai_document_proposals_turn_unique')
    expect(migration).toContain('project_ai_document_proposals_owner_status_idx')
    expect(migration).toContain('project_ai_document_proposals_cleanup_idx')
    expect(migration).toContain('octet_length')
    expect(migration).not.toMatch(/provider_payload|prompt|api_key|tool_result/iu)
  })
})
