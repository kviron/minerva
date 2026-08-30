import { describe, expect, it, vi } from 'vitest'
import {
  authorizeProjectAssistant,
  decideProjectAssistantAccess,
} from '../../../server/modules/ai-assistant/authorize-project-assistant'
import {
  MEMBERSHIP_STATUS,
  PROJECT_PERMISSION,
  PROJECT_STATUS,
} from '../../../shared/projects/constants'
import type { ProjectPermission } from '../../../shared/projects/types'

const activeAccess = (permissions: readonly ProjectPermission[]) => ({
  projectStatus: PROJECT_STATUS.ACTIVE,
  membershipStatus: MEMBERSHIP_STATUS.ACTIVE,
  permissions,
})

describe('project AI assistant authorization', () => {
  it('uses stable permission codes for built-in and custom role matrices', () => {
    expect(decideProjectAssistantAccess(
      activeAccess([PROJECT_PERMISSION.PROJECT_AI_USE]),
      PROJECT_PERMISSION.PROJECT_AI_USE,
    )).toEqual({ allowed: true })

    expect(decideProjectAssistantAccess(
      activeAccess([PROJECT_PERMISSION.PROJECT_AI_USE]),
      PROJECT_PERMISSION.PROJECT_AI_MANAGE,
    )).toEqual({ allowed: false, code: 'PERMISSION_DENIED' })

    expect(decideProjectAssistantAccess(
      activeAccess([PROJECT_PERMISSION.PROJECT_AI_MANAGE]),
      PROJECT_PERMISSION.PROJECT_AI_MANAGE,
    )).toEqual({ allowed: true })
  })

  it.each([
    null,
    {
      projectStatus: PROJECT_STATUS.ARCHIVED,
      membershipStatus: MEMBERSHIP_STATUS.ACTIVE,
      permissions: [PROJECT_PERMISSION.PROJECT_AI_USE],
    },
    {
      projectStatus: PROJECT_STATUS.ACTIVE,
      membershipStatus: MEMBERSHIP_STATUS.REMOVED,
      permissions: [PROJECT_PERMISSION.PROJECT_AI_USE],
    },
  ])('denies unavailable project access state %#', (access) => {
    expect(decideProjectAssistantAccess(access, PROJECT_PERMISSION.PROJECT_AI_USE))
      .toEqual({ allowed: false, code: 'PERMISSION_DENIED' })
  })

  it('loads current server state for every authorization decision', async () => {
    const loadAccess = vi.fn()
      .mockResolvedValueOnce(activeAccess([PROJECT_PERMISSION.PROJECT_AI_USE]))
      .mockResolvedValueOnce(activeAccess([]))

    await expect(authorizeProjectAssistant(
      { loadAccess },
      { projectId: 'project-1', userId: 'user-1', permission: PROJECT_PERMISSION.PROJECT_AI_USE },
    )).resolves.toEqual({ allowed: true })
    await expect(authorizeProjectAssistant(
      { loadAccess },
      { projectId: 'project-1', userId: 'user-1', permission: PROJECT_PERMISSION.PROJECT_AI_USE },
    )).resolves.toEqual({ allowed: false, code: 'PERMISSION_DENIED' })
    expect(loadAccess).toHaveBeenCalledTimes(2)
  })
})
