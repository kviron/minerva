import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

describe('documents foundation migration', () => {
  it('creates a recoverable project-scoped adjacency list', async () => {
    const sql = await readFile(new URL('../../../drizzle/0003_documents_foundation.sql', import.meta.url), 'utf8')

    expect(sql).toMatch(/create table "documents"/iu)
    expect(sql).toMatch(/foreign key \("parent_id","project_id"\).*"documents"\("id","project_id"\)/iu)
    expect(sql).toMatch(/"archived_at" timestamp with time zone/iu)
    expect(sql).toMatch(/documents_project_parent_position_idx/iu)
    expect(sql).not.toMatch(/drop table|drop column|delete from|truncate/iu)
  })
})
