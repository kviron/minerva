import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { projectIdFromPath } from '../../../../app/features/projects/model/current-project-route'

const read = (path: string) => readFile(new URL(path, import.meta.url), 'utf8')

describe('current project sidebar', () => {
  it('derives the current project id only from project routes', () => {
    expect(projectIdFromPath('/projects')).toBeNull()
    expect(projectIdFromPath('/projects/alpha')).toBe('alpha')
    expect(projectIdFromPath('/projects/alpha/documents')).toBe('alpha')
    expect(projectIdFromPath('/administration/projects')).toBeNull()
  })

  it('renders a selected project as a dropdown selector or a link to the projects list', async () => {
    const [sidebar, component] = await Promise.all([
      read('../../../../app/components/app/sidebar/index.vue'),
      read('../../../../app/features/projects/ui/CurrentProjectSidebar.vue'),
    ])

    expect(sidebar).toContain('<CurrentProjectSidebar />')
    expect(component).toContain('<UiSidebarGroup class="group-data-[collapsible=icon]:hidden">')
    expect(component).not.toContain('<UiSidebarGroupLabel>Текущий проект</UiSidebarGroupLabel>')
    expect(component).toContain('<UiSidebarMenu>')
    expect(component).toContain('projectIdFromPath(route.path)')
    expect(component).toContain('<UiDropdownMenuTrigger as-child>')
    expect(component).toContain('<UiSidebarMenuButton size="lg" :is-active="true" tooltip="Выбрать проект">')
    expect(component).toContain('v-for="project in projects"')
    expect(component).toContain('selectedProject')
    expect(component).toContain('Выберите проект')
    expect(component).toContain('<NuxtLink to="/projects">')
  })

  it('loads the project selector only while a project route is active', async () => {
    const component = await read('../../../../app/features/projects/ui/CurrentProjectSidebar.vue')

    expect(component).toContain('if (projectId !== null)')
    expect(component).toContain('watch(selectedProjectId')
    expect(component).toContain('useProjectsStore()')
    expect(component).toContain('useProjectsActions()')
  })

  it('can append another page without hiding projects from large workspaces', async () => {
    const component = await read('../../../../app/features/projects/ui/CurrentProjectSidebar.vue')

    expect(component).toContain('const nextCursor = computed(')
    expect(component).toContain('actions.load(PROJECTS_SCOPE.MEMBER, nextCursor.value)')
    expect(component).toContain('state.appendMemberProjects(result.projects, result.nextCursor)')
    expect(component).toContain('@select.prevent="loadMore"')
  })

  it('renders project icons with initials fallbacks in the selector and dropdown', async () => {
    const component = await read('../../../../app/features/projects/ui/CurrentProjectSidebar.vue')

    expect(component).toContain("import { projectIconUrl, projectInitials } from '../model/project-icon'")
    expect(component).toContain('v-if="selectedProject.iconId"')
    expect(component).toContain('projectIconUrl(selectedProject.id, selectedProject.iconId)')
    expect(component).toContain('{{ projectInitials(selectedProject.name) }}')
    expect(component).toContain('v-if="project.iconId"')
    expect(component).toContain('projectIconUrl(project.id, project.iconId)')
    expect(component).toContain('{{ projectInitials(project.name) }}')
  })

  it('replaces the main navigation with project-scoped links', async () => {
    const [sidebar, component] = await Promise.all([
      read('../../../../app/components/app/sidebar/index.vue'),
      read('../../../../app/features/projects/ui/CurrentProjectSidebar.vue'),
    ])

    expect(sidebar).toContain('v-if="currentProjectId === null"')
    expect(component).toContain('Обзор')
    expect(component).toContain('Учётные данные')
    expect(component).toContain('Документация')
    expect(component).toContain('Настройки')
    expect(component).toContain('to: `/projects/${selectedProjectId.value}`')
    expect(component).toContain('`/projects/${selectedProjectId.value}/credentials`')
    expect(component).toContain('`/projects/${selectedProjectId.value}/documents`')
    expect(component).toContain('`/projects/${selectedProjectId.value}/settings`')
  })
})
