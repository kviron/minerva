import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  projectsApi: {
    list: vi.fn(),
    listAdministration: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    updateDescription: vi.fn(),
  },
  projectIconsApi: { upload: vi.fn(), remove: vi.fn() },
}))

vi.mock('../../../../app/features/projects/api/projects-api', () => ({ projectsApi: mocks.projectsApi }))
vi.mock('../../../../app/features/projects/api/project-icons-api', () => ({ projectIconsApi: mocks.projectIconsApi }))

import { ProjectsActions } from '../../../../app/features/projects/model/actions/actions'

const memberProjects = [{ id: 'project-1', name: 'Minerva' }]
const administrationProjects = [{ id: 'project-2', name: 'Admin project', activeMemberCount: 3 }]
const overview = { id: 'project-1', name: 'Minerva', permissions: ['project.view'] }

beforeEach(() => {
  vi.clearAllMocks()
  mocks.projectsApi.list.mockResolvedValue({ items: memberProjects, nextCursor: null })
  mocks.projectsApi.listAdministration.mockResolvedValue({ items: administrationProjects, nextCursor: null })
  mocks.projectsApi.get.mockResolvedValue(overview)
  mocks.projectsApi.create.mockResolvedValue({ projectId: 'project-created' })
  mocks.projectsApi.updateDescription.mockResolvedValue({ description: 'About', descriptionContent: { type: 'doc', content: [] }, updatedAt: '2026-07-19T12:00:00.000Z' })
  mocks.projectIconsApi.upload.mockResolvedValue({ iconId: 'icon-1' })
  mocks.projectIconsApi.remove.mockResolvedValue({ iconId: null })
})

describe('project actions', () => {
  it('loads projects for the explicit scope', async () => {
    const actions = new ProjectsActions()

    await expect(actions.load('member')).resolves.toEqual({ scope: 'member', projects: memberProjects, nextCursor: null })
    await expect(actions.load('administration')).resolves.toEqual({ scope: 'administration', projects: administrationProjects, nextCursor: null })

    expect(mocks.projectsApi.list).toHaveBeenCalledOnce()
    expect(mocks.projectsApi.listAdministration).toHaveBeenCalledOnce()
  })

  it('forwards a continuation cursor without exposing it to presentation code', async () => {
    const actions = new ProjectsActions()

    await actions.load('member', 'next-page')

    expect(mocks.projectsApi.list).toHaveBeenCalledWith(expect.anything(), 'next-page')
  })

  it('creates a project and returns a refreshed projection', async () => {
    const actions = new ProjectsActions()
    const input = { name: 'Minerva', description: null }

    await expect(actions.create(input, 'member')).resolves.toEqual({
      created: { projectId: 'project-created' },
      list: { scope: 'member', projects: memberProjects, nextCursor: null },
    })

    expect(mocks.projectsApi.create).toHaveBeenCalledWith(input, expect.anything())
    expect(mocks.projectsApi.list).toHaveBeenCalledWith(expect.anything(), undefined)
  })

  it('translates a validated create-project error into a safe message', async () => {
    mocks.projectsApi.create.mockRejectedValue({
      data: { data: { code: 'INVALID_PROJECT_NAME' } },
    })
    const actions = new ProjectsActions()

    await actions.create({ name: '', description: null }, 'member')

    expect(actions.error.value).toBe('Название проекта заполнено некорректно')
  })

  it('loads an overview from an explicit project id', async () => {
    const actions = new ProjectsActions()

    await expect(actions.loadOverview('project-1')).resolves.toEqual(overview)

    expect(mocks.projectsApi.get).toHaveBeenCalledWith('project-1', expect.anything())
  })

  it('saves the general settings through one project-scoped action', async () => {
    const actions = new ProjectsActions()
    const content = { type: 'doc' as const, content: [] }
    const file = new File(['icon'], 'icon.png', { type: 'image/png' })

    await expect(actions.saveGeneralSettings('project-1', { content, iconFile: file, removeIcon: false })).resolves.toMatchObject({
      description: { description: 'About' },
      icon: { iconId: 'icon-1' },
    })

    expect(mocks.projectsApi.updateDescription).toHaveBeenCalledWith('project-1', { content }, expect.anything())
    expect(mocks.projectIconsApi.upload).toHaveBeenCalledWith('project-1', file, expect.anything())
  })
})
