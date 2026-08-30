import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useProjectOverviewStore } from '../../../../app/features/projects/model/project-overview-state'
import { useProjectsStore } from '../../../../app/features/projects/model/projects-state'

beforeEach(() => setActivePinia(createPinia()))

describe('projects Pinia stores', () => {
  it('stores list projections independently from API actions', () => {
    const store = useProjectsStore()
    const projects = [{
      id: '21b9fc31-6e20-4399-a2ea-fb4de1024821',
      name: 'Minerva',
      description: null,
      status: 'active',
      iconId: null,
      updatedAt: '2026-07-10T10:00:00.000Z',
      role: { builtInKey: 'admin', customName: null },
    }] as const

    store.applyMemberProjects(projects)

    expect(store.list).toEqual({ scope: 'member', projects, nextCursor: null })
    expect(store.list.projects).not.toBe(projects)
  })

  it('stores and clears the current overview projection', () => {
    const store = useProjectOverviewStore()
    const project = {
      id: '21b9fc31-6e20-4399-a2ea-fb4de1024821',
      name: 'Minerva',
      description: null,
      status: 'active',
      iconId: null,
      createdAt: '2026-07-10T10:00:00.000Z',
      updatedAt: '2026-07-10T10:00:00.000Z',
      activeMemberCount: 1,
      role: { builtInKey: 'admin', customName: null },
      permissions: ['project.view'],
    } as const

    store.applyProject(project)
    expect(store.project).toEqual(project)

    store.clearProject()
    expect(store.project).toBeNull()
  })
})
