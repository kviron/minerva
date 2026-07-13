import { describe, expect, it } from 'vitest'
import {
  parseAdministrationProjectsResponse,
  parseMemberProjectsResponse,
} from '../../../../app/features/projects/api/projects-api'

describe('projects API response parser', () => {
  it('accepts the safe member projection', () => {
    expect(parseMemberProjectsResponse([{
      id: '21b9fc31-6e20-4399-a2ea-fb4de1024821',
      name: 'Минерва',
      description: null,
      status: 'active',
      updatedAt: '2026-07-10T10:00:00.000Z',
      role: { builtInKey: 'admin', customName: null },
    }])).toHaveLength(1)
  })

  it('rejects extra server fields', () => {
    expect(() => parseMemberProjectsResponse([{
      id: '21b9fc31-6e20-4399-a2ea-fb4de1024821',
      name: 'Минерва',
      description: null,
      status: 'active',
      updatedAt: '2026-07-10T10:00:00.000Z',
      role: { builtInKey: 'admin', customName: null },
      createdByUserId: 'private',
    }])).toThrow('Invalid projects response')
  })

  it('accepts the safe administration projection with active member count', () => {
    expect(parseAdministrationProjectsResponse([{
      id: '21b9fc31-6e20-4399-a2ea-fb4de1024821',
      name: 'Минерва',
      description: null,
      status: 'active',
      updatedAt: '2026-07-10T10:00:00.000Z',
      activeMemberCount: 0,
    }])).toHaveLength(1)
  })

  it('rejects invalid administration member counts and member-only role data', () => {
    expect(() => parseAdministrationProjectsResponse([{
      id: '21b9fc31-6e20-4399-a2ea-fb4de1024821',
      name: 'Минерва',
      description: null,
      status: 'active',
      updatedAt: '2026-07-10T10:00:00.000Z',
      activeMemberCount: -1,
      role: { builtInKey: 'admin', customName: null },
    }])).toThrow('Invalid administration projects response')
  })
})
