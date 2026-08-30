import { describe, expect, it } from 'vitest'
import {
  toAdministrationProjectListItem,
  toMemberProjectListItem,
  toProjectOverview,
} from '../../../server/modules/projects/project-projections'

const project = {
  id: '21b9fc31-6e20-4399-a2ea-fb4de1024821',
  name: 'Minerva',
  description: null,
  status: 'active',
  iconId: null,
  createdAt: new Date('2026-07-15T10:00:00.000Z'),
  updatedAt: new Date('2026-07-16T10:00:00.000Z'),
} as const

describe('project contract projections', () => {
  it('maps member and administration database values to wire values', () => {
    expect(toMemberProjectListItem({
      ...project,
      roleKind: 'built_in',
      builtInKey: 'admin',
      roleName: 'Admin',
    })).toMatchObject({ updatedAt: '2026-07-16T10:00:00.000Z', role: { builtInKey: 'admin', customName: null } })

    expect(toAdministrationProjectListItem({ ...project, activeMemberCount: 2 })).toMatchObject({
      updatedAt: '2026-07-16T10:00:00.000Z',
      activeMemberCount: 2,
    })
  })

  it('builds an overview with normalized dates and explicit permissions', () => {
    expect(toProjectOverview({
      ...project,
      descriptionContent: { type: 'doc', content: [] },
      roleKind: 'custom',
      builtInKey: null,
      roleName: 'Reviewer',
      activeMemberCount: 3,
      permissions: ['documents.view', 'project.view'],
    })).toMatchObject({
      createdAt: '2026-07-15T10:00:00.000Z',
      updatedAt: '2026-07-16T10:00:00.000Z',
      role: { builtInKey: null, customName: 'Reviewer' },
      permissions: ['documents.view', 'project.view'],
    })
  })
})
