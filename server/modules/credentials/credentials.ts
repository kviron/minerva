import { randomUUID } from 'node:crypto'
import { and, asc, desc, eq, inArray, isNull, notInArray, sql } from 'drizzle-orm'
import { CREDENTIAL_FIELD_TYPE } from '../../../shared/credentials/constants'
import type { MaskedCredentialListItem, CredentialSecretTarget } from '../../../shared/credentials/contracts'
import type { CredentialFieldType } from '../../../shared/credentials/types'
import { AUDIT_OUTCOME, PROJECT_PERMISSION } from '../../../shared/projects/constants'
import type { AuditChannel } from '../../../shared/projects/types'
import { getDatabase } from '../../infrastructure/database/client'
import { user } from '../../infrastructure/database/schema/auth'
import {
  credentialCategories,
  credentialFields,
  credentials,
} from '../../infrastructure/database/schema/credentials'
import { auditEvents } from '../../infrastructure/database/schema/projects'
import {
  hasCredentialCategoryAccess,
  listAccessibleCredentialCategories,
  resolveCredentialActorAccess,
} from './categories'
import type { createCredentialCrypto, CredentialSecretEnvelope } from './crypto'

type CredentialDatabase = ReturnType<typeof getDatabase>['db']
type CredentialCrypto = ReturnType<typeof createCredentialCrypto>

export const CREDENTIAL_ERROR = {
  NOT_FOUND: 'CREDENTIAL_NOT_FOUND',
  INVALID_INPUT: 'INVALID_CREDENTIAL_INPUT',
  OPERATION_FAILED: 'CREDENTIAL_OPERATION_FAILED',
} as const

type CredentialError = typeof CREDENTIAL_ERROR[keyof typeof CREDENTIAL_ERROR]
type Result<T = undefined> = T extends undefined
  ? { readonly ok: true } | { readonly ok: false, readonly code: CredentialError }
  : { readonly ok: true, readonly value: T } | { readonly ok: false, readonly code: CredentialError }

type ActorCommand = Readonly<{ actorUserId: string, projectId: string, channel: AuditChannel }>
type ValueOperation = Readonly<{ kind: 'keep' }> | Readonly<{ kind: 'clear' }> | Readonly<{ kind: 'replace', value: string }>
type InputField = Readonly<{ id?: string, label: string, type: CredentialFieldType, value: string }>
type UpdateField = Readonly<{ id?: string, label: string, type: CredentialFieldType, value: ValueOperation }>

const validFieldTypes = new Set<CredentialFieldType>(Object.values(CREDENTIAL_FIELD_TYPE))
const validTitle = (value: string) => value.trim().length > 0 && value.trim().length <= 200
const validFields = (fields: readonly { label: string, type: CredentialFieldType }[]) => fields.length <= 50
  && fields.every(field => field.label.trim().length > 0 && field.label.trim().length <= 120 && validFieldTypes.has(field.type))
const safeAvatar = (image: string | null): string | null => {
  const value = image?.trim()
  if (!value || value.includes('\\')) return null
  if (value.startsWith('/') && !value.startsWith('//')) return value
  try { const url = new URL(value); return url.protocol === 'http:' || url.protocol === 'https:' ? value : null }
  catch { return null }
}

const context = (projectId: string, categoryId: string, credentialId: string, field: string) => ({
  projectId, categoryId, credentialId, field,
})

const envelopeColumns = (envelope: CredentialSecretEnvelope | null, prefix: 'login' | 'password') => prefix === 'login'
  ? {
      loginCiphertext: envelope?.ciphertext ?? null,
      loginNonce: envelope?.nonce ?? null,
      loginKeyVersion: envelope?.keyVersion ?? null,
    }
  : {
      passwordCiphertext: envelope?.ciphertext ?? null,
      passwordNonce: envelope?.nonce ?? null,
      passwordKeyVersion: envelope?.keyVersion ?? null,
    }

const applyOperation = (
  crypto: CredentialCrypto,
  operation: ValueOperation,
  secretContext: ReturnType<typeof context>,
): CredentialSecretEnvelope | null | undefined => operation.kind === 'keep'
  ? undefined
  : operation.kind === 'clear' ? null : crypto.encrypt(operation.value, secretContext)

export async function createCredential(
  db: CredentialDatabase,
  crypto: CredentialCrypto,
  input: ActorCommand & Readonly<{
    categoryId: string
    title: string
    login?: string | null
    password?: string | null
    fields: readonly InputField[]
  }>,
): Promise<Result<{ readonly credentialId: string }>> {
  const title = input.title.trim()
  if (!validTitle(title) || !validFields(input.fields)) return { ok: false, code: CREDENTIAL_ERROR.INVALID_INPUT }

  try {
    return await db.transaction(async (tx) => {
      const access = await resolveCredentialActorAccess(tx as unknown as CredentialDatabase, input.actorUserId, input.projectId)
      if (!access?.permissions.has(PROJECT_PERMISSION.CREDENTIALS_CREATE)
        || !await hasCredentialCategoryAccess(tx as unknown as CredentialDatabase, access, input.projectId, input.categoryId))
        return { ok: false, code: CREDENTIAL_ERROR.NOT_FOUND } as const
      const [category] = await tx.select({ id: credentialCategories.id }).from(credentialCategories).where(and(
        eq(credentialCategories.id, input.categoryId), eq(credentialCategories.projectId, input.projectId), isNull(credentialCategories.archivedAt),
      )).for('update')
      if (!category) return { ok: false, code: CREDENTIAL_ERROR.NOT_FOUND } as const

      const credentialId = randomUUID()
      const login = input.login == null ? null : crypto.encrypt(input.login, context(input.projectId, input.categoryId, credentialId, 'login'))
      const password = input.password == null ? null : crypto.encrypt(input.password, context(input.projectId, input.categoryId, credentialId, 'password'))
      await tx.insert(credentials).values({
        id: credentialId,
        projectId: input.projectId,
        categoryId: input.categoryId,
        title,
        ...envelopeColumns(login, 'login'),
        ...envelopeColumns(password, 'password'),
        createdByUserId: input.actorUserId,
        updatedByUserId: input.actorUserId,
      })
      if (input.fields.length > 0) await tx.insert(credentialFields).values(input.fields.map((field, position) => {
        const id = field.id ?? randomUUID()
        const encrypted = crypto.encrypt(field.value, context(input.projectId, input.categoryId, credentialId, `field:${id}`))
        return { id, credentialId, label: field.label.trim(), type: field.type, position, ...encrypted }
      }))
      await tx.insert(auditEvents).values({
        actorUserId: input.actorUserId, channel: input.channel, action: 'credential.created', outcome: AUDIT_OUTCOME.SUCCEEDED,
        projectId: input.projectId, targetType: 'credential', targetId: credentialId,
        metadata: { categoryId: input.categoryId, dynamicFieldCount: input.fields.length },
      })
      return { ok: true, value: { credentialId } } as const
    })
  }
  catch {
    return { ok: false, code: CREDENTIAL_ERROR.OPERATION_FAILED }
  }
}

export async function listAccessibleCredentials(
  db: CredentialDatabase,
  crypto: CredentialCrypto,
  input: Readonly<{ actorUserId: string, projectId: string, categoryId: string | null }>,
): Promise<readonly MaskedCredentialListItem[]> {
  const [categories, access] = await Promise.all([
    listAccessibleCredentialCategories(db, input),
    resolveCredentialActorAccess(db, input.actorUserId, input.projectId),
  ])
  const visibleCategories = input.categoryId === null ? categories : categories.filter(category => category.id === input.categoryId)
  if (!access || visibleCategories.length === 0) return []
  const categoryById = new Map(visibleCategories.map(category => [category.id, category]))
  const rows = await db.select({
    id: credentials.id,
    title: credentials.title,
    categoryId: credentials.categoryId,
    loginCiphertext: credentials.loginCiphertext,
    loginNonce: credentials.loginNonce,
    loginKeyVersion: credentials.loginKeyVersion,
    passwordCiphertext: credentials.passwordCiphertext,
    updatedAt: credentials.updatedAt,
    updatedByName: user.name,
    updatedByAvatar: user.image,
  }).from(credentials).innerJoin(user, eq(credentials.updatedByUserId, user.id)).where(and(
    eq(credentials.projectId, input.projectId), inArray(credentials.categoryId, [...categoryById.keys()]), isNull(credentials.archivedAt),
  )).orderBy(desc(credentials.updatedAt), asc(credentials.id))
  const fields = rows.length === 0 ? [] : await db.select({
    id: credentialFields.id,
    credentialId: credentialFields.credentialId,
    label: credentialFields.label,
    type: credentialFields.type,
  }).from(credentialFields).where(inArray(credentialFields.credentialId, rows.map(row => row.id))).orderBy(asc(credentialFields.position))

  return rows.map((row) => {
    const category = categoryById.get(row.categoryId)!
    return {
      id: row.id,
      title: row.title,
      category: { id: category.id, name: category.name },
      login: row.loginCiphertext && row.loginNonce && row.loginKeyVersion
        ? crypto.decrypt(
            { ciphertext: row.loginCiphertext, nonce: row.loginNonce, keyVersion: row.loginKeyVersion },
            context(input.projectId, row.categoryId, row.id, 'login'),
          )
        : null,
      hasLogin: row.loginCiphertext !== null,
      hasPassword: row.passwordCiphertext !== null,
      dynamicFields: fields.filter(field => field.credentialId === row.id).map(({ id, label, type }) => ({ id, label, type })),
      updatedAt: row.updatedAt.toISOString(),
      updatedBy: { name: row.updatedByName.trim(), avatar: safeAvatar(row.updatedByAvatar) },
      canUpdate: access.permissions.has(PROJECT_PERMISSION.CREDENTIALS_UPDATE),
      canArchive: access.permissions.has(PROJECT_PERMISSION.CREDENTIALS_ARCHIVE),
    }
  })
}

export async function revealCredentialSecret(
  db: CredentialDatabase,
  crypto: CredentialCrypto,
  input: ActorCommand & Readonly<{ credentialId: string, target: CredentialSecretTarget }>,
): Promise<Result<string>> {
  try {
    return await db.transaction(async (tx) => {
      const access = await resolveCredentialActorAccess(tx as unknown as CredentialDatabase, input.actorUserId, input.projectId)
      if (!access?.permissions.has(PROJECT_PERMISSION.CREDENTIALS_VIEW)) return { ok: false, code: CREDENTIAL_ERROR.NOT_FOUND } as const
      const [record] = await tx.select().from(credentials).where(and(
        eq(credentials.id, input.credentialId), eq(credentials.projectId, input.projectId), isNull(credentials.archivedAt),
      ))
      if (!record || !await hasCredentialCategoryAccess(tx as unknown as CredentialDatabase, access, input.projectId, record.categoryId))
        return { ok: false, code: CREDENTIAL_ERROR.NOT_FOUND } as const

      let envelope: CredentialSecretEnvelope | null = null
      let fieldName = input.target
      if (input.target === 'login' && record.loginCiphertext && record.loginNonce && record.loginKeyVersion)
        envelope = { ciphertext: record.loginCiphertext, nonce: record.loginNonce, keyVersion: record.loginKeyVersion }
      else if (input.target === 'password' && record.passwordCiphertext && record.passwordNonce && record.passwordKeyVersion)
        envelope = { ciphertext: record.passwordCiphertext, nonce: record.passwordNonce, keyVersion: record.passwordKeyVersion }
      else if (input.target.startsWith('field:')) {
        const fieldId = input.target.slice(6)
        const [field] = await tx.select().from(credentialFields).where(and(eq(credentialFields.id, fieldId), eq(credentialFields.credentialId, record.id)))
        if (field) envelope = { ciphertext: field.ciphertext, nonce: field.nonce, keyVersion: field.keyVersion }
        fieldName = `field:${fieldId}`
      }
      if (!envelope) return { ok: false, code: CREDENTIAL_ERROR.NOT_FOUND } as const
      const value = crypto.decrypt(envelope, context(input.projectId, record.categoryId, record.id, fieldName))
      await tx.insert(auditEvents).values({
        actorUserId: input.actorUserId, channel: input.channel, action: 'credential.secret_revealed', outcome: AUDIT_OUTCOME.SUCCEEDED,
        projectId: input.projectId, targetType: 'credential', targetId: record.id, metadata: { target: input.target },
      })
      return { ok: true, value } as const
    })
  }
  catch {
    return { ok: false, code: CREDENTIAL_ERROR.OPERATION_FAILED }
  }
}

export async function updateCredential(
  db: CredentialDatabase,
  crypto: CredentialCrypto,
  input: ActorCommand & Readonly<{
    credentialId: string
    categoryId: string
    title: string
    login: ValueOperation
    password: ValueOperation
    fields: readonly UpdateField[]
  }>,
): Promise<Result> {
  const title = input.title.trim()
  if (!validTitle(title) || !validFields(input.fields)) return { ok: false, code: CREDENTIAL_ERROR.INVALID_INPUT }
  try {
    return await db.transaction(async (tx) => {
      const access = await resolveCredentialActorAccess(tx as unknown as CredentialDatabase, input.actorUserId, input.projectId)
      if (!access?.permissions.has(PROJECT_PERMISSION.CREDENTIALS_UPDATE)
        || !await hasCredentialCategoryAccess(tx as unknown as CredentialDatabase, access, input.projectId, input.categoryId))
        return { ok: false, code: CREDENTIAL_ERROR.NOT_FOUND } as const
      const [record] = await tx.select().from(credentials).where(and(
        eq(credentials.id, input.credentialId), eq(credentials.projectId, input.projectId), isNull(credentials.archivedAt),
      )).for('update')
      if (!record || record.categoryId !== input.categoryId
        || !await hasCredentialCategoryAccess(tx as unknown as CredentialDatabase, access, input.projectId, record.categoryId))
        return { ok: false, code: CREDENTIAL_ERROR.NOT_FOUND } as const

      const login = applyOperation(crypto, input.login, context(input.projectId, record.categoryId, record.id, 'login'))
      const password = applyOperation(crypto, input.password, context(input.projectId, record.categoryId, record.id, 'password'))
      const now = new Date()
      await tx.update(credentials).set({
        title,
        updatedAt: now,
        updatedByUserId: input.actorUserId,
        ...(login === undefined ? {} : envelopeColumns(login, 'login')),
        ...(password === undefined ? {} : envelopeColumns(password, 'password')),
      }).where(eq(credentials.id, record.id))

      const existingFields = await tx.select().from(credentialFields).where(eq(credentialFields.credentialId, record.id))
      const existingById = new Map(existingFields.map(field => [field.id, field]))
      if (existingFields.length > 0) {
        await tx.update(credentialFields)
          .set({ position: sql`${credentialFields.position} + 1000` })
          .where(eq(credentialFields.credentialId, record.id))
      }
      const keptIds: string[] = []
      for (const [position, field] of input.fields.entries()) {
        const id = field.id ?? randomUUID()
        const existing = existingById.get(id)
        if (!existing && field.value.kind === 'keep') return { ok: false, code: CREDENTIAL_ERROR.INVALID_INPUT } as const
        const envelope = field.value.kind === 'keep'
          ? undefined
          : field.value.kind === 'clear'
            ? crypto.encrypt('', context(input.projectId, record.categoryId, record.id, `field:${id}`))
            : crypto.encrypt(field.value.value, context(input.projectId, record.categoryId, record.id, `field:${id}`))
        if (existing) {
          keptIds.push(id)
          await tx.update(credentialFields).set({
            label: field.label.trim(), type: field.type, position, updatedAt: now,
            ...(envelope ? { ciphertext: envelope.ciphertext, nonce: envelope.nonce, keyVersion: envelope.keyVersion } : {}),
          }).where(eq(credentialFields.id, id))
        }
        else if (envelope) {
          keptIds.push(id)
          await tx.insert(credentialFields).values({
            id, credentialId: record.id, label: field.label.trim(), type: field.type, position,
            ciphertext: envelope.ciphertext, nonce: envelope.nonce, keyVersion: envelope.keyVersion,
          })
        }
      }
      if (keptIds.length === 0) await tx.delete(credentialFields).where(eq(credentialFields.credentialId, record.id))
      else await tx.delete(credentialFields).where(and(eq(credentialFields.credentialId, record.id), notInArray(credentialFields.id, keptIds)))
      await tx.insert(auditEvents).values({
        actorUserId: input.actorUserId, channel: input.channel, action: 'credential.updated', outcome: AUDIT_OUTCOME.SUCCEEDED,
        projectId: input.projectId, targetType: 'credential', targetId: record.id,
        metadata: { categoryId: record.categoryId, dynamicFieldCount: input.fields.length },
      })
      return { ok: true } as const
    })
  }
  catch {
    return { ok: false, code: CREDENTIAL_ERROR.OPERATION_FAILED }
  }
}

export async function archiveCredential(
  db: CredentialDatabase,
  input: ActorCommand & Readonly<{ credentialId: string }>,
): Promise<Result> {
  try {
    return await db.transaction(async (tx) => {
      const access = await resolveCredentialActorAccess(tx as unknown as CredentialDatabase, input.actorUserId, input.projectId)
      if (!access?.permissions.has(PROJECT_PERMISSION.CREDENTIALS_ARCHIVE)) return { ok: false, code: CREDENTIAL_ERROR.NOT_FOUND } as const
      const [record] = await tx.select({ id: credentials.id, categoryId: credentials.categoryId }).from(credentials).where(and(
        eq(credentials.id, input.credentialId), eq(credentials.projectId, input.projectId), isNull(credentials.archivedAt),
      )).for('update')
      if (!record || !await hasCredentialCategoryAccess(tx as unknown as CredentialDatabase, access, input.projectId, record.categoryId))
        return { ok: false, code: CREDENTIAL_ERROR.NOT_FOUND } as const
      const now = new Date()
      await tx.update(credentials).set({ archivedAt: now, archivedByUserId: input.actorUserId, updatedAt: now, updatedByUserId: input.actorUserId })
        .where(eq(credentials.id, record.id))
      await tx.insert(auditEvents).values({
        actorUserId: input.actorUserId, channel: input.channel, action: 'credential.archived', outcome: AUDIT_OUTCOME.SUCCEEDED,
        projectId: input.projectId, targetType: 'credential', targetId: record.id, metadata: { categoryId: record.categoryId },
      })
      return { ok: true } as const
    })
  }
  catch {
    return { ok: false, code: CREDENTIAL_ERROR.OPERATION_FAILED }
  }
}
