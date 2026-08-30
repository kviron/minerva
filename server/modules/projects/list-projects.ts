import { and, asc, count, desc, eq, gt, lt, or } from 'drizzle-orm'
import { AUTHORIZATION_CODE } from '../../../shared/authorization/constants'
import { MEMBERSHIP_STATUS, PROJECT_LIST_DEFAULT_LIMIT, PROJECT_PERMISSION } from '../../../shared/projects/constants'
import type {
  AdministrationProjectsResponse,
  MemberProjectsResponse,
} from '../../../shared/projects/contracts'
import { getDatabase } from '../../infrastructure/database/client'
import { projectIcons } from '../../infrastructure/database/schema/files'
import { projectMemberships, projectRolePermissions, projectRoles, projects } from '../../infrastructure/database/schema/projects'
import { toAdministrationProjectListItem, toMemberProjectListItem } from './project-projections'
import { encodeProjectListCursor, type ProjectListCursor } from './project-list-cursor'

type ProjectDatabase = ReturnType<typeof getDatabase>['db']

export interface AdministrationProjectsActor {
  readonly superAdmin: boolean
}

export type ListAdministrationProjectsResult =
  | { readonly ok: true, readonly value: AdministrationProjectsResponse }
  | { readonly ok: false, readonly code: typeof AUTHORIZATION_CODE.FORBIDDEN }

export interface ProjectListOptions {
  readonly limit: number
  readonly cursor: ProjectListCursor | null
}

const DEFAULT_PROJECT_LIST_OPTIONS: ProjectListOptions = { limit: PROJECT_LIST_DEFAULT_LIMIT, cursor: null }

const cursorCondition = (cursor: ProjectListCursor | null) => cursor === null
  ? undefined
  : or(
      lt(projects.updatedAt, cursor.updatedAt),
      and(eq(projects.updatedAt, cursor.updatedAt), gt(projects.id, cursor.id)),
    )

export async function listMemberProjects(
  db: ProjectDatabase,
  userId: string,
  options: ProjectListOptions = DEFAULT_PROJECT_LIST_OPTIONS,
): Promise<MemberProjectsResponse> {
  const rows = await db.select({
    id: projects.id,
    name: projects.name,
    description: projects.description,
    status: projects.status,
    updatedAt: projects.updatedAt,
    iconId: projectIcons.id,
    roleKind: projectRoles.kind,
    builtInKey: projectRoles.builtInKey,
    roleName: projectRoles.displayName,
  })
    .from(projectMemberships)
    .innerJoin(projects, eq(projectMemberships.projectId, projects.id))
    .leftJoin(projectIcons, eq(projectIcons.projectId, projects.id))
    .innerJoin(projectRoles, eq(projectMemberships.roleId, projectRoles.id))
    .innerJoin(projectRolePermissions, and(
      eq(projectRolePermissions.roleId, projectRoles.id),
      eq(projectRolePermissions.permissionCode, PROJECT_PERMISSION.PROJECT_VIEW),
    ))
    .where(and(
      eq(projectMemberships.userId, userId),
      eq(projectMemberships.status, MEMBERSHIP_STATUS.ACTIVE),
      cursorCondition(options.cursor),
    ))
    .orderBy(desc(projects.updatedAt), asc(projects.id))
    .limit(options.limit + 1)

  const pageRows = rows.slice(0, options.limit)
  const last = pageRows.at(-1)
  return {
    items: pageRows.map(toMemberProjectListItem),
    nextCursor: rows.length > options.limit && last
      ? encodeProjectListCursor({ updatedAt: last.updatedAt, id: last.id })
      : null,
  }
}

export const listCurrentUserProjects = (userId: string, options: ProjectListOptions = DEFAULT_PROJECT_LIST_OPTIONS) =>
  listMemberProjects(getDatabase().db, userId, options)

export async function listAdministrationProjects(
  db: ProjectDatabase,
  options: ProjectListOptions = DEFAULT_PROJECT_LIST_OPTIONS,
): Promise<AdministrationProjectsResponse> {
  const rows = await db.select({
    id: projects.id,
    name: projects.name,
    description: projects.description,
    status: projects.status,
    updatedAt: projects.updatedAt,
    iconId: projectIcons.id,
    activeMemberCount: count(projectMemberships.id),
  })
    .from(projects)
    .leftJoin(projectIcons, eq(projectIcons.projectId, projects.id))
    .leftJoin(projectMemberships, and(
      eq(projectMemberships.projectId, projects.id),
      eq(projectMemberships.status, MEMBERSHIP_STATUS.ACTIVE),
    ))
    .where(cursorCondition(options.cursor))
    .groupBy(
      projects.id,
      projects.name,
      projects.description,
      projects.status,
      projects.updatedAt,
      projectIcons.id,
    )
    .orderBy(desc(projects.updatedAt), asc(projects.id))
    .limit(options.limit + 1)

  const pageRows = rows.slice(0, options.limit)
  const last = pageRows.at(-1)
  return {
    items: pageRows.map(toAdministrationProjectListItem),
    nextCursor: rows.length > options.limit && last
      ? encodeProjectListCursor({ updatedAt: last.updatedAt, id: last.id })
      : null,
  }
}

export async function listAdministrationProjectsForActor(
  db: ProjectDatabase,
  actor: AdministrationProjectsActor,
  options: ProjectListOptions = DEFAULT_PROJECT_LIST_OPTIONS,
): Promise<ListAdministrationProjectsResult> {
  if (!actor.superAdmin) return { ok: false, code: AUTHORIZATION_CODE.FORBIDDEN }
  return { ok: true, value: await listAdministrationProjects(db, options) }
}

export const listAllProjects = (actor: AdministrationProjectsActor, options: ProjectListOptions = DEFAULT_PROJECT_LIST_OPTIONS) =>
  listAdministrationProjectsForActor(getDatabase().db, actor, options)
