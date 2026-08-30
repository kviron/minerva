import { and, asc, eq } from 'drizzle-orm'
import { MEMBERSHIP_STATUS, PROJECT_PERMISSION } from '../../../shared/projects/constants'
import type { ProjectMembersResponse } from '../../../shared/projects/contracts'
import { getDatabase } from '../../infrastructure/database/client'
import { user } from '../../infrastructure/database/schema/auth'
import { projectMemberships, projectRoles } from '../../infrastructure/database/schema/projects'
import { hasProjectPermission, type ProjectDatabase } from './project-access'
import { projectRoleProjection } from './project-role-projection'

export const listProjectMembersWith = async (
  db: ProjectDatabase,
  projectId: string,
  actorUserId: string,
): Promise<ProjectMembersResponse | null> => {
  if (!await hasProjectPermission(db, projectId, actorUserId, PROJECT_PERMISSION.MEMBERS_VIEW)) return null
  const rows = await db.select({
    id: user.id,
    name: user.name,
    email: user.email,
    joinedAt: projectMemberships.joinedAt,
    roleKind: projectRoles.kind,
    builtInKey: projectRoles.builtInKey,
    roleName: projectRoles.displayName,
  }).from(projectMemberships)
    .innerJoin(user, eq(projectMemberships.userId, user.id))
    .innerJoin(projectRoles, eq(projectMemberships.roleId, projectRoles.id))
    .where(and(
      eq(projectMemberships.projectId, projectId),
      eq(projectMemberships.status, MEMBERSHIP_STATUS.ACTIVE),
    ))
    .orderBy(asc(user.name), asc(user.email))
  return rows.map(row => ({
    id: row.id,
    name: row.name,
    email: row.email,
    joinedAt: row.joinedAt.toISOString(),
    role: projectRoleProjection(row.roleKind, row.builtInKey, row.roleName),
  }))
}

export const listProjectMembers = (projectId: string, actorUserId: string) =>
  listProjectMembersWith(getDatabase().db, projectId, actorUserId)
