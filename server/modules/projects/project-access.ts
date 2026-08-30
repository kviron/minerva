import { and, eq } from 'drizzle-orm'
import { ACCOUNT_STATUS } from '../../../shared/identity/constants'
import { MEMBERSHIP_STATUS, PROJECT_STATUS } from '../../../shared/projects/constants'
import type { ProjectPermission } from '../../../shared/projects/types'
import { getDatabase } from '../../infrastructure/database/client'
import { user } from '../../infrastructure/database/schema/auth'
import { projectMemberships, projectRolePermissions, projects } from '../../infrastructure/database/schema/projects'

export type ProjectDatabase = ReturnType<typeof getDatabase>['db']

export const hasProjectPermission = async (
  db: ProjectDatabase,
  projectId: string,
  actorUserId: string,
  permission: ProjectPermission,
): Promise<boolean> => {
  const [access] = await db.select({ id: projectMemberships.id })
    .from(projectMemberships)
    .innerJoin(user, eq(projectMemberships.userId, user.id))
    .innerJoin(projects, eq(projectMemberships.projectId, projects.id))
    .innerJoin(projectRolePermissions, and(
      eq(projectMemberships.roleId, projectRolePermissions.roleId),
      eq(projectRolePermissions.permissionCode, permission),
    ))
    .where(and(
      eq(projectMemberships.projectId, projectId),
      eq(projectMemberships.userId, actorUserId),
      eq(projectMemberships.status, MEMBERSHIP_STATUS.ACTIVE),
      eq(user.status, ACCOUNT_STATUS.ACTIVE),
      eq(projects.status, PROJECT_STATUS.ACTIVE),
    ))
    .limit(1)
  return access !== undefined
}
