import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

describe('document draft internal links migration', () => {
  it('adds a non-null stable target snapshot without destructive changes', async () => {
    const sql = await readFile(new URL('../../../drizzle/0007_tense_kingpin.sql', import.meta.url), 'utf8')

    expect(sql).toMatch(/add column "draft_internal_link_target_ids" uuid\[\]/iu)
    expect(sql).toMatch(/default array\[\]::uuid\[\] not null/iu)
    expect(sql).not.toMatch(/drop table|drop column|truncate|delete from/iu)
  })
})
