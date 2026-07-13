import { and, asc, count, desc, eq } from 'drizzle-orm'
import { MEMBERSHIP_STATUS, PROJECT_ROLE_KIND } from '../../../shared/projects/constants'
import type {
  AdministrationProjectsResponse,
  MemberProjectsResponse,
} from '../../../shared/projects/contracts'
import { getDatabase } from '../../infrastructure/database/client'
import { projectMemberships, projectRoles, projects } from '../../infrastructure/database/schema/projects'

type ProjectDatabase = ReturnType<typeof getDatabase>['db']

export async function listMemberProjects(
  db: ProjectDatabase,
  userId: string,
): Promise<MemberProjectsResponse> {
  const rows = await db.select({
    id: projects.id,
    name: projects.name,
    description: projects.description,
    status: projects.status,
    updatedAt: projects.updatedAt,
    roleKind: projectRoles.kind,
    builtInKey: projectRoles.builtInKey,
    roleName: projectRoles.displayName,
  })
    .from(projectMemberships)
    .innerJoin(projects, eq(projectMemberships.projectId, projects.id))
    .innerJoin(projectRoles, eq(projectMemberships.roleId, projectRoles.id))
    .where(and(
      eq(projectMemberships.userId, userId),
      eq(projectMemberships.status, MEMBERSHIP_STATUS.ACTIVE),
    ))
    .orderBy(desc(projects.updatedAt), asc(projects.id))

  return rows.map(row => ({
    id: row.id,
    name: row.name,
    description: row.description,
    status: row.status,
    updatedAt: row.updatedAt.toISOString(),
    role: row.roleKind === PROJECT_ROLE_KIND.BUILT_IN
      ? { builtInKey: row.builtInKey, customName: null }
      : { builtInKey: null, customName: row.roleName },
  }))
}

export const listCurrentUserProjects = (userId: string) =>
  listMemberProjects(getDatabase().db, userId)

export async function listAdministrationProjects(
  db: ProjectDatabase,
): Promise<AdministrationProjectsResponse> {
  const rows = await db.select({
    id: projects.id,
    name: projects.name,
    description: projects.description,
    status: projects.status,
    updatedAt: projects.updatedAt,
    activeMemberCount: count(projectMemberships.id),
  })
    .from(projects)
    .leftJoin(projectMemberships, and(
      eq(projectMemberships.projectId, projects.id),
      eq(projectMemberships.status, MEMBERSHIP_STATUS.ACTIVE),
    ))
    .groupBy(
      projects.id,
      projects.name,
      projects.description,
      projects.status,
      projects.updatedAt,
    )
    .orderBy(desc(projects.updatedAt), asc(projects.id))

  return rows.map(row => ({
    id: row.id,
    name: row.name,
    description: row.description,
    status: row.status,
    updatedAt: row.updatedAt.toISOString(),
    activeMemberCount: row.activeMemberCount,
  }))
}

export const listAllProjects = () => listAdministrationProjects(getDatabase().db)
