import { and, asc, count, desc, eq, gte, ilike, lte, or, sql, type SQL } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import type {
  AdministrationAuditQuery,
  AdministrationAuditResponse,
} from '../../../shared/administration/contracts'
import {
  ADMINISTRATION_AUDIT_PAGE_SIZE,
  ADMINISTRATION_AUDIT_SORT,
  ADMINISTRATION_AUDIT_SORT_DIRECTION,
} from '../../../shared/administration/contracts'
import { ACCOUNT_STATUS } from '../../../shared/identity/constants'
import { AUDIT_CHANNEL, AUDIT_OUTCOME } from '../../../shared/projects/constants'
import { AUTHORIZATION_CODE } from '../../../shared/authorization/constants'
import { getDatabase } from '../../infrastructure/database/client'
import { user } from '../../infrastructure/database/schema/auth'
import { auditEvents, projects } from '../../infrastructure/database/schema/projects'
import { AuthorizationError } from '../authorization/authorization-error'
import {
  projectAdministrationAuditEvent,
  type AdministrationAuditRow,
} from './audit-projection'

type AuditDatabase = PostgresJsDatabase

const escapeLikePattern = (value: string): string => value
  .replaceAll('\\', '\\\\')
  .replaceAll('%', '\\%')
  .replaceAll('_', '\\_')

const searchCondition = (search: string | undefined): SQL | undefined => {
  if (search === undefined) return undefined
  const pattern = `%${escapeLikePattern(search)}%`
  return or(
    ilike(auditEvents.action, pattern),
    ilike(auditEvents.targetType, pattern),
    ilike(user.name, pattern),
    ilike(user.email, pattern),
    ilike(projects.name, pattern),
    sql`${auditEvents.targetId}::text ilike ${pattern}`,
  )
}

const queryConditions = (
  query: AdministrationAuditQuery,
): readonly (SQL | undefined)[] => [
  query.channel === undefined ? undefined : eq(auditEvents.channel, query.channel),
  query.outcome === undefined ? undefined : eq(auditEvents.outcome, query.outcome),
  searchCondition(query.search),
  query.action === undefined ? undefined : eq(auditEvents.action, query.action),
  query.actorId === undefined ? undefined : eq(auditEvents.actorUserId, query.actorId),
  query.projectId === undefined ? undefined : eq(auditEvents.projectId, query.projectId),
  query.from === undefined ? undefined : gte(auditEvents.createdAt, new Date(query.from)),
  query.to === undefined ? undefined : lte(auditEvents.createdAt, new Date(query.to)),
]

const administrationAuditOrder = (query: AdministrationAuditQuery): readonly SQL[] => {
  const ascending = query.direction === ADMINISTRATION_AUDIT_SORT_DIRECTION.ASC
  const idOrder = ascending ? asc(auditEvents.id) : desc(auditEvents.id)

  switch (query.sort) {
    case ADMINISTRATION_AUDIT_SORT.CREATED_AT:
      return [ascending ? asc(auditEvents.createdAt) : desc(auditEvents.createdAt), idOrder]
    case ADMINISTRATION_AUDIT_SORT.ACTION:
      return [ascending ? asc(auditEvents.action) : desc(auditEvents.action), idOrder]
    case ADMINISTRATION_AUDIT_SORT.ACTOR:
      return [sql`${ascending ? asc(user.name) : desc(user.name)} nulls last`, idOrder]
    case ADMINISTRATION_AUDIT_SORT.PROJECT:
      return [sql`${ascending ? asc(projects.name) : desc(projects.name)} nulls last`, idOrder]
    case ADMINISTRATION_AUDIT_SORT.CHANNEL:
      return [ascending ? asc(auditEvents.channel) : desc(auditEvents.channel), idOrder]
    case ADMINISTRATION_AUDIT_SORT.OUTCOME:
      return [ascending ? asc(auditEvents.outcome) : desc(auditEvents.outcome), idOrder]
    case ADMINISTRATION_AUDIT_SORT.TARGET:
      return [ascending ? asc(auditEvents.targetType) : desc(auditEvents.targetType), idOrder]
  }
}

const auditSelection = {
  id: auditEvents.id,
  createdAt: auditEvents.createdAt,
  actorUserId: auditEvents.actorUserId,
  actorName: user.name,
  actorStatus: user.status,
  projectId: auditEvents.projectId,
  projectName: projects.name,
  channel: auditEvents.channel,
  action: auditEvents.action,
  outcome: auditEvents.outcome,
  targetType: auditEvents.targetType,
  targetId: auditEvents.targetId,
  metadata: auditEvents.metadata,
} as const

export async function listAdministrationAuditEvents(
  db: AuditDatabase,
  actorUserId: string,
  query: AdministrationAuditQuery,
): Promise<AdministrationAuditResponse> {
  return db.transaction(async (tx) => {
    const [actor] = await tx.select({ id: user.id })
      .from(user)
      .where(and(
        eq(user.id, actorUserId),
        eq(user.status, ACCOUNT_STATUS.ACTIVE),
        eq(user.superAdmin, true),
      ))
      .limit(1)

    if (actor === undefined) throw new AuthorizationError(AUTHORIZATION_CODE.FORBIDDEN)

    const where = and(...queryConditions(query))
    const [totalRow] = await tx.select({ value: count() })
      .from(auditEvents)
      .leftJoin(user, eq(auditEvents.actorUserId, user.id))
      .leftJoin(projects, eq(auditEvents.projectId, projects.id))
      .where(where)
    const totalItems = totalRow?.value ?? 0
    const totalPages = Math.max(1, Math.ceil(totalItems / ADMINISTRATION_AUDIT_PAGE_SIZE))

    const rows: AdministrationAuditRow[] = await tx.select(auditSelection)
      .from(auditEvents)
      .leftJoin(user, eq(auditEvents.actorUserId, user.id))
      .leftJoin(projects, eq(auditEvents.projectId, projects.id))
      .where(where)
      .orderBy(...administrationAuditOrder(query))
      .limit(ADMINISTRATION_AUDIT_PAGE_SIZE)
      .offset((query.page - 1) * ADMINISTRATION_AUDIT_PAGE_SIZE)

    await tx.insert(auditEvents).values({
      actorUserId,
      channel: AUDIT_CHANNEL.API,
      action: 'administration.audit_viewed',
      outcome: AUDIT_OUTCOME.SUCCEEDED,
      targetType: 'audit_log',
      targetId: null,
      metadata: {
        resultCount: rows.length,
        filtered: query.channel !== undefined
          || query.outcome !== undefined
          || query.search !== undefined
          || query.action !== undefined
          || query.actorId !== undefined
          || query.projectId !== undefined
          || query.from !== undefined
          || query.to !== undefined,
      },
    })

    return {
      items: rows.map(projectAdministrationAuditEvent),
      page: query.page,
      pageSize: ADMINISTRATION_AUDIT_PAGE_SIZE,
      totalItems,
      totalPages,
    }
  })
}

export const listAuditEvents = (
  actorUserId: string,
  query: AdministrationAuditQuery,
): Promise<AdministrationAuditResponse> =>
  listAdministrationAuditEvents(getDatabase().db, actorUserId, query)
