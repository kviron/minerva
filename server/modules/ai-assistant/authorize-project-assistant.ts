import { and, eq } from 'drizzle-orm'
import { ACCOUNT_STATUS } from '../../../shared/identity/constants'
import {
  MEMBERSHIP_STATUS,
  PROJECT_PERMISSION,
  PROJECT_STATUS,
} from '../../../shared/projects/constants'
import type {
  MembershipStatus,
  ProjectPermission,
  ProjectStatus,
} from '../../../shared/projects/types'
import { getDatabase } from '../../infrastructure/database/client'
import { user } from '../../infrastructure/database/schema/auth'
import {
  projectMemberships,
  projectRolePermissions,
  projects,
} from '../../infrastructure/database/schema/projects'

type ProjectDatabase = ReturnType<typeof getDatabase>['db']

export type ProjectAssistantPermission =
  | typeof PROJECT_PERMISSION.PROJECT_AI_USE
  | typeof PROJECT_PERMISSION.PROJECT_AI_MANAGE

export interface ProjectAssistantAccessState {
  readonly accountStatus?: typeof ACCOUNT_STATUS.ACTIVE | typeof ACCOUNT_STATUS.DISABLED
  readonly projectStatus: ProjectStatus
  readonly membershipStatus: MembershipStatus
  readonly permissions: readonly ProjectPermission[]
}

export type ProjectAssistantAccessDecision =
  | { readonly allowed: true }
  | { readonly allowed: false, readonly code: 'PERMISSION_DENIED' }

export interface ProjectAssistantAuthorizationInput {
  readonly projectId: string
  readonly userId: string
  readonly permission: ProjectAssistantPermission
}

export interface ProjectAssistantAuthorizationDependencies {
  readonly loadAccess: (
    projectId: string,
    userId: string,
  ) => Promise<ProjectAssistantAccessState | null>
}

const denied = (): ProjectAssistantAccessDecision => ({ allowed: false, code: 'PERMISSION_DENIED' })

export const decideProjectAssistantAccess = (
  access: ProjectAssistantAccessState | null,
  permission: ProjectAssistantPermission,
): ProjectAssistantAccessDecision => {
  if (
    access === null
    || access.accountStatus === ACCOUNT_STATUS.DISABLED
    || access.projectStatus !== PROJECT_STATUS.ACTIVE
    || access.membershipStatus !== MEMBERSHIP_STATUS.ACTIVE
    || !access.permissions.includes(permission)
  ) {
    return denied()
  }

  return { allowed: true }
}

export const authorizeProjectAssistant = async (
  dependencies: ProjectAssistantAuthorizationDependencies,
  input: ProjectAssistantAuthorizationInput,
): Promise<ProjectAssistantAccessDecision> => decideProjectAssistantAccess(
  await dependencies.loadAccess(input.projectId, input.userId),
  input.permission,
)

export const loadProjectAssistantAccess = async (
  db: ProjectDatabase,
  projectId: string,
  userId: string,
): Promise<ProjectAssistantAccessState | null> => {
  const rows = await db.select({
    accountStatus: user.status,
    projectStatus: projects.status,
    membershipStatus: projectMemberships.status,
    permissionCode: projectRolePermissions.permissionCode,
  })
    .from(projectMemberships)
    .innerJoin(user, eq(projectMemberships.userId, user.id))
    .innerJoin(projects, eq(projectMemberships.projectId, projects.id))
    .leftJoin(projectRolePermissions, eq(projectMemberships.roleId, projectRolePermissions.roleId))
    .where(and(
      eq(projectMemberships.projectId, projectId),
      eq(projectMemberships.userId, userId),
    ))

  const first = rows[0]
  if (!first) return null

  return {
    accountStatus: first.accountStatus,
    projectStatus: first.projectStatus,
    membershipStatus: first.membershipStatus,
    permissions: rows.flatMap(row => row.permissionCode === null ? [] : [row.permissionCode]),
  }
}

export const authorizeCurrentProjectAssistant = (input: ProjectAssistantAuthorizationInput) =>
  authorizeProjectAssistant(
    { loadAccess: (projectId, userId) => loadProjectAssistantAccess(getDatabase().db, projectId, userId) },
    input,
  )
