import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import {
  availableProjectSections,
  PROJECT_SECTION,
  projectSectionPath,
} from '../../../../app/features/projects/model/project-sections'
import { projectOverviewSchema } from '../../../../shared/projects/contracts'

const read = (path: string) => readFile(new URL(path, import.meta.url), 'utf8')
const projectId = '21b9fc31-6e20-4399-a2ea-fb4de1024821'

describe('project context', () => {
  it('maps the documented project sections to stable routes', () => {
    expect(projectSectionPath(projectId, PROJECT_SECTION.OVERVIEW)).toBe(`/projects/${projectId}`)
    expect(projectSectionPath(projectId, PROJECT_SECTION.DOCUMENTS)).toBe(`/projects/${projectId}/documents`)
    expect(projectSectionPath(projectId, PROJECT_SECTION.SETTINGS)).toBe(`/projects/${projectId}/settings`)
  })

  it('keeps settings navigation permission-aware without hiding the overview or pages', () => {
    expect(availableProjectSections(['project.view', 'documents.view'])).toEqual([
      { value: 'overview', label: 'Обзор' },
      { value: 'documents', label: 'Страницы' },
    ])
    expect(availableProjectSections(['project.view', 'documents.view', 'project.update'])).toEqual([
      { value: 'overview', label: 'Обзор' },
      { value: 'documents', label: 'Страницы' },
      { value: 'settings', label: 'Настройки' },
    ])
  })

  it('accepts only the safe project overview projection', () => {
    expect(projectOverviewSchema.parse({
      id: projectId,
      name: 'Минерва',
      description: null,
      descriptionContent: { type: 'doc', content: [] },
      status: 'active',
      iconId: null,
      createdAt: '2026-07-10T10:00:00.000Z',
      updatedAt: '2026-07-10T10:00:00.000Z',
      activeMemberCount: 3,
      role: { builtInKey: 'admin', customName: null },
      permissions: ['project.view', 'documents.view', 'project.update'],
    })).toMatchObject({ name: 'Минерва', activeMemberCount: 3 })

    expect(() => projectOverviewSchema.parse({ id: projectId, password: 'private' })).toThrow()
  })

  it('accepts credential permission codes returned for project roles', () => {
    expect(projectOverviewSchema.parse({
      id: projectId,
      name: 'Минерва',
      description: null,
      descriptionContent: { type: 'doc', content: [] },
      status: 'active',
      iconId: null,
      createdAt: '2026-07-10T10:00:00.000Z',
      updatedAt: '2026-07-10T10:00:00.000Z',
      activeMemberCount: 3,
      role: { builtInKey: 'admin', customName: null },
      permissions: [
        'project.view',
        'credentials.view',
        'credentials.create',
        'credentials.update',
        'credentials.archive',
        'credential_categories.create',
        'credential_categories.update',
        'credential_categories.archive',
        'credential_categories.manage_access',
      ],
    }).permissions).toContain('credentials.view')
  })

  it('composes overview, pages, and settings under one project shell', async () => {
    const [overview, documents, settings, shell, overviewContent] = await Promise.all([
      read('../../../../app/pages/projects/[id]/index.vue'),
      read('../../../../app/pages/projects/[id]/documents/index.vue'),
      read('../../../../app/pages/projects/[id]/settings.vue'),
      read('../../../../app/features/projects/ui/ProjectShell.vue'),
      read('../../../../app/features/projects/ui/ProjectOverview.vue'),
    ])

    expect(overview).toContain('<ProjectShell :project-id="projectId" active="overview">')
    expect(documents).toContain('<ProjectShell :project-id="projectId" active="documents">')
    expect(settings).toContain('<ProjectShell :project-id="projectId" active="settings">')
    expect(shell).not.toContain('<ProjectNavigation')
    expect(shell).not.toContain('UiTabs')
    expect(shell).not.toContain('<NuxtLink to="/projects"')
    expect(shell).not.toContain('{{ project.name }}')
    expect(shell).not.toContain("project.description ||")
    expect(overviewContent).toContain('<h1 class="text-2xl font-semibold">{{ project.name }}</h1>')
  })

  it('uses a member-scoped overview API handler', async () => {
    const handler = await read('../../../../server/api/projects/[id].get.ts')

    expect(handler).toContain('await requireSession(event)')
    expect(handler).toContain('getCurrentUserProjectOverview')
    expect(handler).toContain("statusCode: 404")
  })
})
