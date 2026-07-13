import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFile(new URL(path, import.meta.url), 'utf8')

describe('projects load error', () => {
  it('uses the design-system Empty composition with an update action', async () => {
    const source = await read('../../../../app/features/projects/ui/ProjectsLoadError.vue')

    expect(source).toContain('<UiEmpty')
    expect(source).toContain('<UiEmptyHeader>')
    expect(source).toContain('<UiEmptyMedia variant="icon">')
    expect(source).toContain('<UiEmptyTitle>Проекты не загрузились</UiEmptyTitle>')
    expect(source).toContain('<UiEmptyDescription>{{ message }}</UiEmptyDescription>')
    expect(source).toContain('<UiEmptyContent>')
    expect(source).toContain('<RefreshCcw data-icon="inline-start" />')
    expect(source).toContain('Обновить')
    expect(source).toContain('role="alert"')
    expect(source).toContain("emit('retry')")
    expect(source).not.toContain('<UiAlert')
  })

  it('is composed by the projects view instead of the old alert bar', async () => {
    const source = await read('../../../../app/features/projects/ui/ProjectsView.vue')

    expect(source).toContain('<div class="flex flex-col gap-4 px-4 lg:px-6">')
    expect(source).not.toMatch(/<div class="flex flex-col[^\"]*\bpy-/)
    expect(source).toContain("import ProjectsLoadError from './ProjectsLoadError.vue'")
    expect(source).toContain('<ProjectsLoadError v-else-if="error" :message="error" @retry="load" />')
    expect(source).not.toContain('<UiAlert v-else-if="error"')
  })
})
