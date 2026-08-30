import { and, eq } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import {
  ADMINISTRATION_AUDIT_TARGET_STATE,
  type AdministrationAuditTargetResponse,
} from '../../../shared/administration/contracts'
import { ACCOUNT_STATUS } from '../../../shared/identity/constants'
import { AUDIT_CHANNEL, AUDIT_OUTCOME } from '../../../shared/projects/constants'
import { AUTHORIZATION_CODE } from '../../../shared/authorization/constants'
import { getDatabase } from '../../infrastructure/database/client'
import { user } from '../../infrastructure/database/schema/auth'
import { credentialCategories, credentials } from '../../infrastructure/database/schema/credentials'
import { documents } from '../../infrastructure/database/schema/documents'
import { auditEvents, projects } from '../../infrastructure/database/schema/projects'
import { AuthorizationError } from '../authorization/authorization-error'

type AuditDatabase = PostgresJsDatabase
type AuditTarget = Readonly<{ type: string, id: string | null, projectId: string | null }>

const field = (label: string, value: string | number | boolean) => ({ label, value: String(value) })
const dateField = (label: string, value: Date | null) => value === null ? null : field(label, value.toISOString())
const compact = <T>(values: readonly (T | null)[]): readonly T[] => values.filter((value): value is T => value !== null)

const unavailable = (type: string): AdministrationAuditTargetResponse => ({
  state: ADMINISTRATION_AUDIT_TARGET_STATE.UNAVAILABLE,
  type,
  title: 'Объект больше недоступен',
  fields: [],
})

const resolveTarget = async (db: AuditDatabase, target: AuditTarget): Promise<AdministrationAuditTargetResponse> => {
  if (target.id === null) return {
    state: ADMINISTRATION_AUDIT_TARGET_STATE.UNSUPPORTED,
    type: target.type,
    title: 'Для события нет объекта для просмотра',
    fields: [],
  }

  if (target.type === 'project') {
    const [record] = await db.select({ name: projects.name, status: projects.status, createdAt: projects.createdAt, updatedAt: projects.updatedAt })
      .from(projects).where(eq(projects.id, target.id)).limit(1)
    return record === undefined ? unavailable(target.type) : {
      state: ADMINISTRATION_AUDIT_TARGET_STATE.AVAILABLE,
      type: target.type,
      title: record.name,
      fields: [field('Статус', record.status), field('Создан', record.createdAt.toISOString()), field('Обновлён', record.updatedAt.toISOString())],
    }
  }

  if (target.type === 'document' && target.projectId !== null) {
    const [record] = await db.select({ title: documents.title, slug: documents.slug, publicationState: documents.publicationState, draftRevision: documents.draftRevision, updatedAt: documents.updatedAt, archivedAt: documents.archivedAt })
      .from(documents).where(and(eq(documents.id, target.id), eq(documents.projectId, target.projectId))).limit(1)
    return record === undefined ? unavailable(target.type) : {
      state: ADMINISTRATION_AUDIT_TARGET_STATE.AVAILABLE,
      type: target.type,
      title: record.title,
      fields: compact([field('Slug', record.slug), field('Публикация', record.publicationState), field('Ревизия черновика', record.draftRevision), field('Обновлён', record.updatedAt.toISOString()), dateField('Архивирован', record.archivedAt)]),
    }
  }

  if (target.type === 'user') {
    const [record] = await db.select({ name: user.name, email: user.email, username: user.username, status: user.status, superAdmin: user.superAdmin, createdAt: user.createdAt, lastLoginAt: user.lastLoginAt })
      .from(user).where(eq(user.id, target.id)).limit(1)
    return record === undefined ? unavailable(target.type) : {
      state: ADMINISTRATION_AUDIT_TARGET_STATE.AVAILABLE,
      type: target.type,
      title: record.name,
      fields: compact([field('Email', record.email), record.username === null ? null : field('Логин', record.username), field('Статус', record.status), field('Суперадминистратор', record.superAdmin ? 'Да' : 'Нет'), field('Создан', record.createdAt.toISOString()), dateField('Последний вход', record.lastLoginAt)]),
    }
  }

  if (target.type === 'credential' && target.projectId !== null) {
    const [record] = await db.select({ title: credentials.title, category: credentialCategories.name, updatedAt: credentials.updatedAt, archivedAt: credentials.archivedAt })
      .from(credentials).innerJoin(credentialCategories, and(eq(credentials.categoryId, credentialCategories.id), eq(credentials.projectId, credentialCategories.projectId)))
      .where(and(eq(credentials.id, target.id), eq(credentials.projectId, target.projectId))).limit(1)
    return record === undefined ? unavailable(target.type) : {
      state: ADMINISTRATION_AUDIT_TARGET_STATE.AVAILABLE,
      type: target.type,
      title: record.title,
      fields: compact([field('Категория', record.category), field('Обновлено', record.updatedAt.toISOString()), dateField('Архивировано', record.archivedAt)]),
    }
  }

  if (target.type === 'credential_category' && target.projectId !== null) {
    const [record] = await db.select({ name: credentialCategories.name, position: credentialCategories.position, updatedAt: credentialCategories.updatedAt, archivedAt: credentialCategories.archivedAt })
      .from(credentialCategories).where(and(eq(credentialCategories.id, target.id), eq(credentialCategories.projectId, target.projectId))).limit(1)
    return record === undefined ? unavailable(target.type) : {
      state: ADMINISTRATION_AUDIT_TARGET_STATE.AVAILABLE,
      type: target.type,
      title: record.name,
      fields: compact([field('Позиция', record.position), field('Обновлена', record.updatedAt.toISOString()), dateField('Архивирована', record.archivedAt)]),
    }
  }

  return { state: ADMINISTRATION_AUDIT_TARGET_STATE.UNSUPPORTED, type: target.type, title: 'Предпросмотр этого типа пока не поддерживается', fields: [] }
}

export async function getAdministrationAuditTarget(
  db: AuditDatabase,
  actorUserId: string,
  auditEventId: string,
): Promise<AdministrationAuditTargetResponse | null> {
  return db.transaction(async (tx) => {
    const [actor] = await tx.select({ id: user.id }).from(user).where(and(eq(user.id, actorUserId), eq(user.status, ACCOUNT_STATUS.ACTIVE), eq(user.superAdmin, true))).limit(1)
    if (actor === undefined) throw new AuthorizationError(AUTHORIZATION_CODE.FORBIDDEN)

    const [event] = await tx.select({ type: auditEvents.targetType, id: auditEvents.targetId, projectId: auditEvents.projectId })
      .from(auditEvents).where(eq(auditEvents.id, auditEventId)).limit(1)
    if (event === undefined) return null

    const response = await resolveTarget(tx, event)
    await tx.insert(auditEvents).values({
      actorUserId,
      channel: AUDIT_CHANNEL.API,
      action: 'administration.audit_target_viewed',
      outcome: AUDIT_OUTCOME.SUCCEEDED,
      targetType: 'audit_event',
      targetId: auditEventId,
      metadata: { targetState: response.state },
    })
    return response
  })
}

export const getAuditTarget = (actorUserId: string, auditEventId: string) =>
  getAdministrationAuditTarget(getDatabase().db, actorUserId, auditEventId)

