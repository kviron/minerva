import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

describe('AI conversation migration', () => {
  it('creates private retained conversations and visible messages with bounded indexes', async () => {
    const journal = await readFile('drizzle/meta/_journal.json', 'utf8')
    const entry = JSON.parse(journal) as { entries: Array<{ tag: string }> }
    const migrationTag = entry.entries.find(item => /^0018_/u.test(item.tag))?.tag
    expect(migrationTag).toMatch(/^0018_/u)
    const migration = await readFile(`drizzle/${migrationTag}.sql`, 'utf8')

    expect(migration).toContain('CREATE TABLE "project_ai_conversations"')
    expect(migration).toContain('CREATE TABLE "project_ai_conversation_messages"')
    expect(migration).toContain('project_ai_conversations_owner_active_idx')
    expect(migration).toContain('project_ai_conversations_cleanup_idx')
    expect(migration).not.toMatch(/prompt|provider_payload|tool_result|document_text/iu)
  })
})
