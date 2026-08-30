import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFile(new URL(path, import.meta.url), 'utf8')

describe('project icon settings', () => {
  it('keeps the icon field inside the unified General settings form', async () => {
    const [settings, page] = await Promise.all([
      read('../../../../app/features/projects/ui/ProjectGeneralSettings.vue'),
      read('../../../../app/pages/projects/[id]/settings.vue'),
    ])

    expect(settings).toContain('<UiFieldGroup>')
    expect(settings).not.toContain('<UiCard')
    expect(settings).toContain('<UiAvatarFallback')
    expect(settings).toContain('accept="image/png,image/jpeg,image/webp"')
    expect(settings).toContain('removeIcon')
    expect(settings).toContain('saveGeneralSettings')
    expect(page).toContain('<ProjectGeneralSettings')
  })

  it('renders project avatars in the project list with a fallback', async () => {
    const table = await read('../../../../app/features/projects/ui/ProjectsTable.vue')
    expect(table).toContain('<UiAvatar')
    expect(table).toContain('<UiAvatarImage v-if="project.iconId"')
    expect(table).toContain('<UiAvatarFallback')
  })
})
