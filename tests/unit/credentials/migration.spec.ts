import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

describe('project credentials migration', () => {
  it('is additive and backfills every existing built-in Admin role only', async () => {
    const sql = await readFile(new URL('../../../drizzle/0002_project_credentials_foundation.sql', import.meta.url), 'utf8')

    expect(sql).not.toMatch(/drop table|drop column|delete from|truncate/iu)
    expect(sql).toMatch(/where r\.kind = 'built_in' and r\.built_in_key = 'admin'/iu)
    expect(sql).toMatch(/on conflict \(role_id, permission_code\) do nothing/iu)
    expect(sql).not.toMatch(/built_in_key = '(editor|viewer)'/u)
  })
})
