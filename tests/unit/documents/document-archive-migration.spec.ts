import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

describe('document archive batches migration', () => {
  it('adds recoverable archive batches and preserves stable slugs across active and archived documents', async () => {
    const sql = await readFile(new URL('../../../drizzle/0006_document_archive_batches.sql', import.meta.url), 'utf8')

    expect(sql).toMatch(/add column "archive_batch_id" uuid/iu)
    expect(sql).toMatch(/documents_archive_state_check/iu)
    expect(sql).toMatch(/drop index "documents_active_project_slug_unique"/iu)
    expect(sql).toMatch(/create unique index "documents_project_slug_unique"/iu)
    expect(sql).not.toMatch(/drop table|drop column|truncate|delete from/iu)
  })
})
