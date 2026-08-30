import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

describe('project AI permissions migration', () => {
  it('extends the closed permission constraint and backfills exact built-in defaults', async () => {
    const migration = await readFile('drizzle/0013_gorgeous_orphan.sql', 'utf8')

    expect(migration).toContain("'project.ai.use'")
    expect(migration).toContain("'project.ai.manage'")
    expect(migration).toContain("('admin', 'project.ai.use')")
    expect(migration).toContain("('admin', 'project.ai.manage')")
    expect(migration).toContain("('editor', 'project.ai.use')")
    expect(migration).toContain("('viewer', 'project.ai.use')")
    expect(migration).toContain("WHERE role.kind = 'built_in'")
    expect(migration).toContain('ON CONFLICT (role_id, permission_code) DO NOTHING')
  })
})
