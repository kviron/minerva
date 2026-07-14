import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

describe('document images migration', () => {
  it('adds private image metadata and draft reference snapshots without destructive changes', async () => {
    const sql = await readFile('drizzle/0008_document_images.sql', 'utf8')
    expect(sql).toMatch(/create table "document_images"/iu)
    expect(sql).toMatch(/"object_key" text not null/iu)
    expect(sql).toMatch(/"draft_referenced_image_ids" uuid\[\]/iu)
    expect(sql).not.toMatch(/drop table|drop column|truncate|delete from/iu)
  })
})
