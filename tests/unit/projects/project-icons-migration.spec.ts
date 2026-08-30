import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

describe('project icons migration', () => {
  it('stores one private icon metadata row per project without public URLs', async () => {
    const sql = await readFile(new URL('../../../drizzle/0015_project_icons.sql', import.meta.url), 'utf8')

    expect(sql).toContain('CREATE TABLE "project_icons"')
    expect(sql).toContain('UNIQUE("project_id")')
    expect(sql).toContain('"object_key"')
    expect(sql).not.toMatch(/public_url|data:|https?:\/\//iu)
  })
})
