import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

describe('document search migration', () => {
  it('backfills normalized content text and adds GIN full-text indexes without destructive changes', async () => {
    const sql = await readFile('drizzle/0009_cute_wilson_fisk.sql', 'utf8')
    expect(sql).toContain('"draft_search_text"')
    expect(sql).toContain('"search_text"')
    expect(sql).toContain('jsonb_path_query_array')
    expect(sql).toContain("'$.**.attrs.alt'")
    expect(sql).toContain('USING gin')
    expect(sql).toContain('IMMUTABLE')
    expect(sql).toContain('minerva_document_search_vector')
    expect(sql).toContain("to_tsvector('russian'")
    expect(sql).toContain("to_tsvector('english'")
    expect(sql).not.toMatch(/drop table|drop column|truncate|delete from/iu)
  })
})
