import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

describe('document versions migration', () => {
  it('creates immutable complete project-scoped snapshots', async () => {
    const sql = await readFile(new URL('../../../drizzle/0004_document_versions.sql', import.meta.url), 'utf8')

    expect(sql).toMatch(/create table "document_versions"/iu)
    expect(sql).toMatch(/unique\("document_id","version_number"\)/iu)
    expect(sql).toMatch(/foreign key \("document_id","project_id"\).*"documents"\("id","project_id"\)/iu)
    expect(sql).toMatch(/"draft_content" jsonb/iu)
    expect(sql).toMatch(/"internal_link_target_ids" uuid\[\]/iu)
    expect(sql).toMatch(/"referenced_image_ids" uuid\[\]/iu)
    expect(sql).toMatch(/"change_summary" text/iu)
    expect(sql).not.toMatch(/drop table|drop column|delete from|truncate/iu)
  })

  it('allows an empty optional publication summary without making the column nullable', async () => {
    const sql = await readFile(new URL('../../../drizzle/0005_optional_document_version_summary.sql', import.meta.url), 'utf8')

    expect(sql).toMatch(/drop constraint "document_versions_change_summary_check"/iu)
    expect(sql).toMatch(/char_length\("document_versions"\."change_summary"\) between 0 and 1000/iu)
    expect(sql).not.toMatch(/drop table|drop column|alter column.*drop not null|delete from|truncate/iu)
  })
})
