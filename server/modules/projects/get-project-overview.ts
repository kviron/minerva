import { and, asc, count, eq } from 'drizzle-orm'
import { MEMBERSHIP_STATUS, PROJECT_PERMISSION, PROJECT_ROLE_KIND } from '../../../shared/projects/constants'
import type { ProjectOverviewProjection } from '../../../shared/projects/contracts'
import { getDatabase } from '../../infrastructure/database/client'
import {
  projectMemberships,
  projectRolePermissions,
  projectRoles,
  projects,
} from '../../infrastructure/database/schema/projects'

type ProjectDatabase = ReturnType<typeof getDatabase>['db']

export async function getProjectOverviewForUser(
  db: ProjectDatabase,
  projectId: string,
  userId: string,
): Promise<ProjectOverviewProjection | null> {
  const [project] = await db.select({
    id: projects.id,
    name: projects.name,
    description: projects.description,
    status: projects.status,
    createdAt: projects.createdAt,
    updatedAt: projects.updatedAt,
    roleId: projectRoles.id,
    roleKind: projectRoles.kind,
    builtInKey: projectRoles.builtInKey,
    roleName: projectRoles.displayName,
  })
    .from(projectMemberships)
    .innerJoin(projects, eq(projectMemberships.projectId, projects.id))
    .innerJoin(projectRoles, eq(projectMemberships.roleId, projectRoles.id))
    .innerJoin(projectRolePermissions, eq(projectRoles.id, projectRolePermissions.roleId))
    .where(and(
      eq(projectMemberships.projectId, projectId),
      eq(projectMemberships.userId, userId),
      eq(projectMemberships.status, MEMBERSHIP_STATUS.ACTIVE),
      eq(projectRolePermissions.permissionCode, PROJECT_PERMISSION.PROJECT_VIEW),
    ))
    .limit(1)

  if (!project) return null

  const [memberCount] = await db.select({ value: count(projectMemberships.id) })
    .from(projectMemberships)
    .where(and(
      eq(projectMemberships.projectId, project.id),
      eq(projectMemberships.status, MEMBERSHIP_STATUS.ACTIVE),
    ))

  const permissions = await db.select({ code: projectRolePermissions.permissionCode })
    .from(projectRolePermissions)
    .where(eq(projectRolePermissions.roleId, project.roleId))
    .orderBy(asc(projectRolePermissions.permissionCode))

  return {
    id: project.id,
    name: project.name,
    description: project.description,
    status: project.status,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
    activeMemberCount: memberCount?.value ?? 0,
    role: project.roleKind === PROJECT_ROLE_KIND.BUILT_IN
      ? { builtInKey: project.builtInKey, customName: null }
      : { builtInKey: null, customName: project.roleName },
    permissions: permissions.map(permission => permission.code),
  }
}

export const getCurrentUserProjectOverview = (projectId: string, userId: string) =>
  getProjectOverviewForUser(getDatabase().db, projectId, userId)
