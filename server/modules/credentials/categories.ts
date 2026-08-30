import { and, asc, desc, eq, inArray, isNull } from 'drizzle-orm'
import { ACCOUNT_STATUS } from '../../../shared/identity/constants'
import {
  AUDIT_OUTCOME,
  MEMBERSHIP_STATUS,
  PROJECT_PERMISSION,
} from '../../../shared/projects/constants'
import type { AuditChannel, ProjectPermission } from '../../../shared/projects/types'
import type {
  CredentialCategoryBody,
  CredentialCategory,
  CredentialCategoryGrantsBody,
  CredentialCategoryIdResponse,
  CredentialCategoryListItem,
  CredentialCategoryManagement,
} from '../../../shared/credentials/category-contracts'
import { getDatabase } from '../../infrastructure/database/client'
import { user } from '../../infrastructure/database/schema/auth'
import {
  credentialCategories,
  credentialCategoryMemberGrants,
  credentialCategoryRoleGrants,
  credentials,
} from '../../infrastructure/database/schema/credentials'
import {
  auditEvents,
  projectMemberships,
  projectRolePermissions,
  projectRoles,
} from '../../infrastructure/database/schema/projects'

type CredentialDatabase = ReturnType<typeof getDatabase>['db']

export const CREDENTIAL_CATEGORY_ERROR = {
  CATEGORY_NOT_FOUND: 'CATEGORY_NOT_FOUND',
  INVALID_CATEGORY_NAME: 'INVALID_CATEGORY_NAME',
  INVALID_CATEGORY_DESCRIPTION: 'INVALID_CATEGORY_DESCRIPTION',
  INVALID_GRANT_SUBJECT: 'INVALID_GRANT_SUBJECT',
  OPERATION_FAILED: 'OPERATION_FAILED',
} as const

type CategoryError = typeof CREDENTIAL_CATEGORY_ERROR[keyof typeof CREDENTIAL_CATEGORY_ERROR]
type CategoryResult<T = undefined> = T extends undefined
  ? { readonly ok: true } | { readonly ok: false, readonly code: CategoryError }
  : { readonly ok: true, readonly value: T } | { readonly ok: false, readonly code: CategoryError }

type ActorCommand = Readonly<{
  actorUserId: string
  channel: AuditChannel
  projectId: string
}>

const normalizeIds = (ids: readonly string[]): readonly string[] => [...new Set(ids)].sort()
const normalizeCategoryName = (name: string) => name.trim()
const normalizedCategoryKey = (name: string) => normalizeCategoryName(name).toLocaleLowerCase('ru-RU')

export const toCredentialCategoryProjection = (
  category: CredentialCategoryListItem,
  roleIds: readonly string[],
  membershipIds: readonly string[],
): CredentialCategory => ({
  id: category.id,
  name: category.name,
  description: category.description,
  roleIds,
  membershipIds,
})

export const resolveCredentialActorAccess = async (db: CredentialDatabase, actorUserId: string, projectId: string) => {
  const rows = await db.select({
    membershipId: projectMemberships.id,
    roleId: projectMemberships.roleId,
    accountStatus: user.status,
    permissionCode: projectRolePermissions.permissionCode,
  })
    .from(projectMemberships)
    .innerJoin(user, eq(projectMemberships.userId, user.id))
    .innerJoin(projectRoles, eq(projectMemberships.roleId, projectRoles.id))
    .innerJoin(projectRolePermissions, eq(projectRoles.id, projectRolePermissions.roleId))
    .where(and(
      eq(projectMemberships.projectId, projectId),
      eq(projectMemberships.userId, actorUserId),
      eq(projectMemberships.status, MEMBERSHIP_STATUS.ACTIVE),
    ))

  const first = rows[0]
  if (!first || first.accountStatus !== ACCOUNT_STATUS.ACTIVE) return null
  return {
    membershipId: first.membershipId,
    roleId: first.roleId,
    permissions: new Set(rows.map(row => row.permissionCode as ProjectPermission)),
  }
}

export type CredentialActorAccess = NonNullable<Awaited<ReturnType<typeof resolveCredentialActorAccess>>>

export const hasCredentialCategoryAccess = async (
  db: CredentialDatabase,
  access: CredentialActorAccess,
  projectId: string,
  categoryId: string,
): Promise<boolean> => {
  if (access.permissions.has(PROJECT_PERMISSION.CREDENTIAL_CATEGORIES_MANAGE_ACCESS)) return true
  const [roleGrant, memberGrant] = await Promise.all([
    db.select({ id: credentialCategoryRoleGrants.id }).from(credentialCategoryRoleGrants).where(and(
      eq(credentialCategoryRoleGrants.projectId, projectId),
      eq(credentialCategoryRoleGrants.categoryId, categoryId),
      eq(credentialCategoryRoleGrants.roleId, access.roleId),
    )).limit(1),
    db.select({ id: credentialCategoryMemberGrants.id }).from(credentialCategoryMemberGrants).where(and(
      eq(credentialCategoryMemberGrants.projectId, projectId),
      eq(credentialCategoryMemberGrants.categoryId, categoryId),
      eq(credentialCategoryMemberGrants.membershipId, access.membershipId),
    )).limit(1),
  ])
  return roleGrant.length > 0 || memberGrant.length > 0
}

export async function listAccessibleCredentialCategories(
  db: CredentialDatabase,
  input: Readonly<{ actorUserId: string, projectId: string, includeArchived?: boolean }>,
): Promise<readonly CredentialCategoryListItem[]> {
  const access = await resolveCredentialActorAccess(db, input.actorUserId, input.projectId)
  if (!access?.permissions.has(PROJECT_PERMISSION.CREDENTIALS_VIEW)) return []

  const categories = await db.select({
    id: credentialCategories.id,
    name: credentialCategories.name,
    description: credentialCategories.description,
    position: credentialCategories.position,
  }).from(credentialCategories).where(input.includeArchived
    ? eq(credentialCategories.projectId, input.projectId)
    : and(eq(credentialCategories.projectId, input.projectId), isNull(credentialCategories.archivedAt)))
    .orderBy(asc(credentialCategories.position), asc(credentialCategories.id))

  if (access.permissions.has(PROJECT_PERMISSION.CREDENTIAL_CATEGORIES_MANAGE_ACCESS)) return categories

  const [roleGrants, memberGrants] = await Promise.all([
    db.select({ categoryId: credentialCategoryRoleGrants.categoryId })
      .from(credentialCategoryRoleGrants)
      .where(and(eq(credentialCategoryRoleGrants.projectId, input.projectId), eq(credentialCategoryRoleGrants.roleId, access.roleId))),
    db.select({ categoryId: credentialCategoryMemberGrants.categoryId })
      .from(credentialCategoryMemberGrants)
      .where(and(eq(credentialCategoryMemberGrants.projectId, input.projectId), eq(credentialCategoryMemberGrants.membershipId, access.membershipId))),
  ])
  const allowed = new Set([...roleGrants, ...memberGrants].map(grant => grant.categoryId))
  return categories.filter(category => allowed.has(category.id))
}

export async function getCredentialCategoryManagement(
  db: CredentialDatabase,
  input: Readonly<{ actorUserId: string, projectId: string }>,
): Promise<CredentialCategoryManagement> {
  const access = await resolveCredentialActorAccess(db, input.actorUserId, input.projectId)
  if (!access?.permissions.has(PROJECT_PERMISSION.CREDENTIALS_VIEW)) {
    return { canManage: false, canCreateCategories: false, canCreateCredentials: false, categories: [], roles: [], members: [] }
  }
  const canManage = access.permissions.has(PROJECT_PERMISSION.CREDENTIAL_CATEGORIES_MANAGE_ACCESS)
  const canCreateCategories = access.permissions.has(PROJECT_PERMISSION.CREDENTIAL_CATEGORIES_CREATE)
  const canCreateCredentials = access.permissions.has(PROJECT_PERMISSION.CREDENTIALS_CREATE)
  const visible = await listAccessibleCredentialCategories(db, input)
  if (!canManage) {
    return {
      canManage,
      canCreateCategories,
      canCreateCredentials,
      categories: visible.map(category => toCredentialCategoryProjection(category, [], [])),
      roles: [],
      members: [],
    }
  }

  const categoryIds = visible.map(category => category.id)
  const [roles, members, roleGrants, memberGrants] = await Promise.all([
    db.select({ id: projectRoles.id, name: projectRoles.displayName, builtInKey: projectRoles.builtInKey })
      .from(projectRoles).where(eq(projectRoles.projectId, input.projectId)).orderBy(asc(projectRoles.displayName)),
    db.select({ membershipId: projectMemberships.id, userId: user.id, name: user.name, email: user.email })
      .from(projectMemberships).innerJoin(user, eq(projectMemberships.userId, user.id)).where(and(
        eq(projectMemberships.projectId, input.projectId),
        eq(projectMemberships.status, MEMBERSHIP_STATUS.ACTIVE),
        eq(user.status, ACCOUNT_STATUS.ACTIVE),
      )).orderBy(asc(user.name), asc(user.id)),
    categoryIds.length === 0 ? Promise.resolve([]) : db.select({ categoryId: credentialCategoryRoleGrants.categoryId, roleId: credentialCategoryRoleGrants.roleId })
      .from(credentialCategoryRoleGrants).where(inArray(credentialCategoryRoleGrants.categoryId, categoryIds)),
    categoryIds.length === 0 ? Promise.resolve([]) : db.select({ categoryId: credentialCategoryMemberGrants.categoryId, membershipId: credentialCategoryMemberGrants.membershipId })
      .from(credentialCategoryMemberGrants).where(inArray(credentialCategoryMemberGrants.categoryId, categoryIds)),
  ])
  return {
    canManage,
    canCreateCategories,
    canCreateCredentials,
    categories: visible.map(category => toCredentialCategoryProjection(
      category,
      roleGrants.filter(grant => grant.categoryId === category.id).map(grant => grant.roleId),
      memberGrants.filter(grant => grant.categoryId === category.id).map(grant => grant.membershipId),
    )),
    roles: roles.map(role => ({ ...role, builtInKey: role.builtInKey as 'admin' | 'editor' | 'viewer' | null })),
    members,
  }
}

export async function createCredentialCategory(
  db: CredentialDatabase,
  input: ActorCommand & CredentialCategoryBody,
): Promise<CategoryResult<CredentialCategoryIdResponse>> {
  const name = normalizeCategoryName(input.name)
  if (name.length === 0 || name.length > 120) return { ok: false, code: CREDENTIAL_CATEGORY_ERROR.INVALID_CATEGORY_NAME }
  const description = input.description == null ? null : input.description.trim()
  if (description !== null && description.length > 2000) return { ok: false, code: CREDENTIAL_CATEGORY_ERROR.INVALID_CATEGORY_DESCRIPTION }

  try {
    return await db.transaction(async (tx) => {
      const access = await resolveCredentialActorAccess(tx as unknown as CredentialDatabase, input.actorUserId, input.projectId)
      if (!access?.permissions.has(PROJECT_PERMISSION.CREDENTIAL_CATEGORIES_CREATE))
        return { ok: false, code: CREDENTIAL_CATEGORY_ERROR.CATEGORY_NOT_FOUND } as const

      const [lastCategory] = await tx.select({ position: credentialCategories.position })
        .from(credentialCategories)
        .where(eq(credentialCategories.projectId, input.projectId))
        .orderBy(desc(credentialCategories.position))
        .limit(1)
      const [created] = await tx.insert(credentialCategories).values({
        projectId: input.projectId,
        name,
        normalizedName: normalizedCategoryKey(name),
        description,
        position: (lastCategory?.position ?? -1) + 1,
        createdByUserId: input.actorUserId,
      }).returning({ id: credentialCategories.id })
      if (!created) throw new Error('Category insert returned no row')

      await tx.insert(auditEvents).values({
        actorUserId: input.actorUserId,
        channel: input.channel,
        action: 'credential_category.created',
        outcome: AUDIT_OUTCOME.SUCCEEDED,
        projectId: input.projectId,
        targetType: 'credential_category',
        targetId: created.id,
        metadata: {},
      })
      return { ok: true, value: { categoryId: created.id } } as const
    })
  }
  catch {
    return { ok: false, code: CREDENTIAL_CATEGORY_ERROR.OPERATION_FAILED }
  }
}

export async function updateCredentialCategory(
  db: CredentialDatabase,
  input: ActorCommand & Readonly<{ categoryId: string }> & CredentialCategoryBody,
): Promise<CategoryResult> {
  const name = normalizeCategoryName(input.name)
  if (name.length === 0 || name.length > 120) return { ok: false, code: CREDENTIAL_CATEGORY_ERROR.INVALID_CATEGORY_NAME }
  const description = input.description == null ? null : input.description.trim()
  if (description !== null && description.length > 2000) return { ok: false, code: CREDENTIAL_CATEGORY_ERROR.INVALID_CATEGORY_DESCRIPTION }

  try {
    return await db.transaction(async (tx) => {
      const access = await resolveCredentialActorAccess(tx as unknown as CredentialDatabase, input.actorUserId, input.projectId)
      if (!access?.permissions.has(PROJECT_PERMISSION.CREDENTIAL_CATEGORIES_UPDATE))
        return { ok: false, code: CREDENTIAL_CATEGORY_ERROR.CATEGORY_NOT_FOUND } as const
      const now = new Date()
      const [category] = await tx.update(credentialCategories).set({
        name,
        normalizedName: normalizedCategoryKey(name),
        description,
        updatedAt: now,
      }).where(and(
        eq(credentialCategories.id, input.categoryId),
        eq(credentialCategories.projectId, input.projectId),
        isNull(credentialCategories.archivedAt),
      )).returning({ id: credentialCategories.id })
      if (!category) return { ok: false, code: CREDENTIAL_CATEGORY_ERROR.CATEGORY_NOT_FOUND } as const
      await tx.insert(auditEvents).values({
        actorUserId: input.actorUserId,
        channel: input.channel,
        action: 'credential_category.updated',
        outcome: AUDIT_OUTCOME.SUCCEEDED,
        projectId: input.projectId,
        targetType: 'credential_category',
        targetId: category.id,
        metadata: {},
      })
      return { ok: true } as const
    })
  }
  catch {
    return { ok: false, code: CREDENTIAL_CATEGORY_ERROR.OPERATION_FAILED }
  }
}

export async function replaceCredentialCategoryGrants(
  db: CredentialDatabase,
  input: ActorCommand & Readonly<{ categoryId: string }> & CredentialCategoryGrantsBody,
): Promise<CategoryResult> {
  const roleIds = normalizeIds(input.roleIds)
  const membershipIds = normalizeIds(input.membershipIds)

  try {
    return await db.transaction(async (tx) => {
      const access = await resolveCredentialActorAccess(tx as unknown as CredentialDatabase, input.actorUserId, input.projectId)
      if (!access?.permissions.has(PROJECT_PERMISSION.CREDENTIAL_CATEGORIES_MANAGE_ACCESS))
        return { ok: false, code: CREDENTIAL_CATEGORY_ERROR.CATEGORY_NOT_FOUND } as const

      const [category] = await tx.select({ id: credentialCategories.id }).from(credentialCategories).where(and(
        eq(credentialCategories.id, input.categoryId),
        eq(credentialCategories.projectId, input.projectId),
        isNull(credentialCategories.archivedAt),
      )).for('update')
      if (!category) return { ok: false, code: CREDENTIAL_CATEGORY_ERROR.CATEGORY_NOT_FOUND } as const

      const validRoles = roleIds.length === 0 ? [] : await tx.select({ id: projectRoles.id }).from(projectRoles).where(and(
        eq(projectRoles.projectId, input.projectId), inArray(projectRoles.id, roleIds),
      ))
      const validMemberships = membershipIds.length === 0 ? [] : await tx.select({ id: projectMemberships.id }).from(projectMemberships).where(and(
        eq(projectMemberships.projectId, input.projectId),
        eq(projectMemberships.status, MEMBERSHIP_STATUS.ACTIVE),
        inArray(projectMemberships.id, membershipIds),
      ))
      if (validRoles.length !== roleIds.length || validMemberships.length !== membershipIds.length)
        return { ok: false, code: CREDENTIAL_CATEGORY_ERROR.INVALID_GRANT_SUBJECT } as const

      await tx.delete(credentialCategoryRoleGrants).where(eq(credentialCategoryRoleGrants.categoryId, category.id))
      await tx.delete(credentialCategoryMemberGrants).where(eq(credentialCategoryMemberGrants.categoryId, category.id))
      if (roleIds.length > 0) await tx.insert(credentialCategoryRoleGrants).values(roleIds.map(roleId => ({
        projectId: input.projectId, categoryId: category.id, roleId, createdByUserId: input.actorUserId,
      })))
      if (membershipIds.length > 0) await tx.insert(credentialCategoryMemberGrants).values(membershipIds.map(membershipId => ({
        projectId: input.projectId, categoryId: category.id, membershipId, createdByUserId: input.actorUserId,
      })))

      await tx.insert(auditEvents).values({
        actorUserId: input.actorUserId,
        channel: input.channel,
        action: 'credential_category.access_replaced',
        outcome: AUDIT_OUTCOME.SUCCEEDED,
        projectId: input.projectId,
        targetType: 'credential_category',
        targetId: category.id,
        metadata: { roleGrantCount: roleIds.length, memberGrantCount: membershipIds.length },
      })
      return { ok: true } as const
    })
  }
  catch {
    return { ok: false, code: CREDENTIAL_CATEGORY_ERROR.OPERATION_FAILED }
  }
}

export async function archiveCredentialCategory(
  db: CredentialDatabase,
  input: ActorCommand & Readonly<{ categoryId: string }>,
): Promise<CategoryResult> {
  try {
    return await db.transaction(async (tx) => {
      const access = await resolveCredentialActorAccess(tx as unknown as CredentialDatabase, input.actorUserId, input.projectId)
      if (!access?.permissions.has(PROJECT_PERMISSION.CREDENTIAL_CATEGORIES_ARCHIVE))
        return { ok: false, code: CREDENTIAL_CATEGORY_ERROR.CATEGORY_NOT_FOUND } as const
      const now = new Date()
      const [category] = await tx.update(credentialCategories).set({ archivedAt: now, archivedByUserId: input.actorUserId, updatedAt: now }).where(and(
        eq(credentialCategories.id, input.categoryId), eq(credentialCategories.projectId, input.projectId), isNull(credentialCategories.archivedAt),
      )).returning({ id: credentialCategories.id })
      if (!category) return { ok: false, code: CREDENTIAL_CATEGORY_ERROR.CATEGORY_NOT_FOUND } as const
      await tx.update(credentials).set({ archivedAt: now, archivedByUserId: input.actorUserId, updatedAt: now }).where(and(
        eq(credentials.categoryId, category.id), isNull(credentials.archivedAt),
      ))
      await tx.insert(auditEvents).values({
        actorUserId: input.actorUserId, channel: input.channel, action: 'credential_category.archived', outcome: AUDIT_OUTCOME.SUCCEEDED,
        projectId: input.projectId, targetType: 'credential_category', targetId: category.id, metadata: {},
      })
      return { ok: true } as const
    })
  }
  catch {
    return { ok: false, code: CREDENTIAL_CATEGORY_ERROR.OPERATION_FAILED }
  }
}
