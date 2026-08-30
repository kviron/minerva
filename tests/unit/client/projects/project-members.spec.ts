import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFile(new URL(path, import.meta.url), 'utf8')

describe('project members settings', () => {
  it('loads members through ProjectsActions and renders safe role columns in a table', async () => {
    const [component, page, api] = await Promise.all([
      read('../../../../app/features/projects/ui/ProjectMembersSettings.vue'),
      read('../../../../app/pages/projects/[id]/settings.vue'),
      read('../../../../app/features/projects/api/projects-api.ts'),
    ])
    expect(component).toContain('new ProjectsActions()')
    expect(component).toContain('actions.loadMembers')
    expect(component).toContain('<UiTable')
    expect(component).toContain('member.role')
    expect(page).toContain('<ProjectMembersSettings')
    expect(api).toContain('projectMembersResponseSchema')
  })
})
