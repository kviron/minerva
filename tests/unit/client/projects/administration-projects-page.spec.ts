import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFile(new URL(path, import.meta.url), 'utf8')

describe('administration projects page', () => {
  it('provides a dedicated administration tab and admin-scoped projects view', async () => {
    const [page, tabs] = await Promise.all([
      read('../../../../app/pages/administration/projects.vue'),
      read('../../../../app/features/administration/ui/AdministrationTabs.vue'),
    ])

    expect(page).toContain('<AdministrationTabs active="projects" />')
    expect(page).toContain('<ProjectsView scope="administration" />')
    expect(tabs).toContain('to: \'/administration/projects\'')
    expect(tabs).toContain("label: 'Проекты'")
    expect(tabs).toContain('<UiTabsList')
    expect(tabs).toContain('<div class="max-w-full overflow-x-auto overflow-y-hidden">')
    expect(tabs).toContain('<UiTabsList>')
    expect(tabs).not.toContain('<UiTabsList class="overflow-x-auto">')
    expect(tabs).not.toMatch(/<UiTabsList[^>]*\bw-full\b/)
    expect(tabs).toContain('<UiTabsTrigger')
    expect(tabs).toContain('<NuxtLink')
  })

  it('renders active member counts instead of current-user roles', async () => {
    const table = await read('../../../../app/features/projects/ui/ProjectsTable.vue')

    expect(table).toContain("mode?: 'member' | 'administration'")
    expect(table).toContain("mode === 'administration'")
    expect(table).toContain('Участники')
    expect(table).toContain('project.access')
    expect(table).not.toContain("'activeMemberCount' in project")
  })

  it('opens a project from the whole table row with mouse or keyboard', async () => {
    const table = await read('../../../../app/features/projects/ui/ProjectsTable.vue')

    expect(table).toContain('const router = useRouter()')
    expect(table).toContain('const openProject = (projectId: string) => router.push(`/projects/${projectId}`)')
    expect(table).toContain('cursor-pointer')
    expect(table).toContain('tabindex="0"')
    expect(table).toContain('@click="openProject(project.id)"')
    expect(table).toContain('@keydown.enter.prevent="openProject(project.id)"')
    expect(table).toContain('@keydown.space.prevent="openProject(project.id)"')
    expect(table).not.toContain('<NuxtLink :to="`/projects/${project.id}`"')
  })

  it('keeps the endpoint and SQL projection server-owned', async () => {
    const [endpoint, query] = await Promise.all([
      read('../../../../server/api/administration/projects.get.ts'),
      read('../../../../server/modules/projects/list-projects.ts'),
    ])

    expect(endpoint).toContain('await requireSession(event)')
    expect(endpoint).toContain('listAllProjects(')
    expect(query).toContain('listAdministrationProjectsForActor')
    expect(query).toContain('listAdministrationProjects')
    expect(query).toContain('activeMemberCount: count(projectMemberships.id)')
    expect(query).toContain('eq(projectMemberships.status, MEMBERSHIP_STATUS.ACTIVE)')
    expect(query).toContain('.leftJoin(projectMemberships')
    expect(query).toContain('.limit(options.limit + 1)')
  })
})
