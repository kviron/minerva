import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFile(new URL(path, import.meta.url), 'utf8')

describe('project general settings', () => {
  it('groups description and icon into one tab form saved through ProjectsActions', async () => {
    const [component, page, api] = await Promise.all([
      read('../../../../app/features/projects/ui/ProjectGeneralSettings.vue'),
      read('../../../../app/pages/projects/[id]/settings.vue'),
      read('../../../../app/features/projects/api/projects-api.ts'),
    ])
    expect(component).toContain('<RichTextEditor')
    expect(component).toContain('new ProjectsActions()')
    expect(component).toContain('saveGeneralSettings')
    expect(component).not.toContain('<ProjectDescriptionSettings')
    expect(component).not.toContain('<ProjectIconSettings')
    expect(page).toContain('<ProjectGeneralSettings')
    expect(api).toContain('projectDescriptionResponseSchema')
  })
})
