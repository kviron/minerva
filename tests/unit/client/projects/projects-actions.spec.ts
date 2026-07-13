import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  projectsApi: {
    list: vi.fn(),
    listAdministration: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
  },
}))

vi.mock('../../../../app/features/projects/api/projects-api', () => ({ projectsApi: mocks.projectsApi }))

import { ProjectsActions } from '../../../../app/features/projects/model/actions/actions'

const memberProjects = [{ id: 'project-1', name: 'Minerva' }]
const administrationProjects = [{ id: 'project-2', name: 'Admin project', activeMemberCount: 3 }]
const overview = { id: 'project-1', name: 'Minerva', permissions: ['project.view'] }

beforeEach(() => {
  vi.clearAllMocks()
  mocks.projectsApi.list.mockResolvedValue(memberProjects)
  mocks.projectsApi.listAdministration.mockResolvedValue(administrationProjects)
  mocks.projectsApi.get.mockResolvedValue(overview)
})

describe('project actions', () => {
  it('loads projects for the explicit scope', async () => {
    const actions = new ProjectsActions()

    await expect(actions.load('member')).resolves.toEqual(memberProjects)
    await expect(actions.load('administration')).resolves.toEqual(administrationProjects)

    expect(mocks.projectsApi.list).toHaveBeenCalledOnce()
    expect(mocks.projectsApi.listAdministration).toHaveBeenCalledOnce()
  })

  it('creates a project and returns a refreshed projection', async () => {
    const actions = new ProjectsActions()
    const input = { name: 'Minerva', description: null }

    await expect(actions.create(input, 'member')).resolves.toEqual(memberProjects)

    expect(mocks.projectsApi.create).toHaveBeenCalledWith(input, expect.anything())
    expect(mocks.projectsApi.list).toHaveBeenCalledWith(expect.anything())
  })

  it('loads an overview from an explicit project id', async () => {
    const actions = new ProjectsActions()

    await expect(actions.loadOverview('project-1')).resolves.toEqual(overview)

    expect(mocks.projectsApi.get).toHaveBeenCalledWith('project-1', expect.anything())
  })
})
