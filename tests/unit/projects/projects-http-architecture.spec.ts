import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFile(new URL(path, import.meta.url), 'utf8')

describe('Projects HTTP architecture', () => {
  it('validates project ids and disables private response caching', async () => {
    const [overview, memberList, administrationList] = await Promise.all([
      read('../../../server/api/projects/[id].get.ts'),
      read('../../../server/api/projects/index.get.ts'),
      read('../../../server/api/administration/projects.get.ts'),
    ])

    expect(overview).toContain('getValidatedRouterParams')
    expect(overview).toContain('projectRouteParamsSchema')
    for (const source of [overview, memberList, administrationList]) {
      expect(source).toContain("'Cache-Control', 'private, no-store'")
    }
  })

  it('requires project.view when listing member projects', async () => {
    const source = await read('../../../server/modules/projects/list-projects.ts')
    expect(source).toContain('projectRolePermissions')
    expect(source).toContain('PROJECT_PERMISSION.PROJECT_VIEW')
  })

  it('uses the shared default page size instead of a server-local magic number', async () => {
    const source = await read('../../../server/modules/projects/list-projects.ts')

    expect(source).toContain('PROJECT_LIST_DEFAULT_LIMIT')
    expect(source).not.toContain('{ limit: 50, cursor: null }')
  })
})
