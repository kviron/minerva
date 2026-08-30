import { and, desc, eq, isNull } from 'drizzle-orm'
import { ACCOUNT_STATUS } from '../../../shared/identity/constants'
import {
  AUDIT_CHANNEL,
  AUDIT_OUTCOME,
  MEMBERSHIP_STATUS,
  PROJECT_PERMISSION,
  PROJECT_STATUS,
} from '../../../shared/projects/constants'
import type { getDatabase } from '../../infrastructure/database/client'
import { user } from '../../infrastructure/database/schema/auth'
import { documentPublicShares } from '../../infrastructure/database/schema/document-sharing'
import { documents, documentVersions } from '../../infrastructure/database/schema/documents'
import {
  auditEvents,
  projectMemberships,
  projectRolePermissions,
  projects,
} from '../../infrastructure/database/schema/projects'
import type {
  DocumentPublicShareRepository,
  StoredDocumentPublicShare,
} from './document-public-shares'

type Database = ReturnType<typeof getDatabase>['db']
type ShareExecutor = Pick<Database, 'select' | 'insert' | 'update'>

interface ManagementScope {
  readonly projectId: string
  readonly rootDocumentId: string
  readonly actorUserId: string
}

const authorizePublishedRoot = async (
  db: ShareExecutor,
  query: ManagementScope,
): Promise<boolean> => {
  const [access] = await db.select({ id: documents.id })
    .from(documents)
    .innerJoin(projects, eq(documents.projectId, projects.id))
    .innerJoin(projectMemberships, and(
      eq(projectMemberships.projectId, projects.id),
      eq(projectMemberships.userId, query.actorUserId),
    ))
    .innerJoin(user, eq(projectMemberships.userId, user.id))
    .innerJoin(projectRolePermissions, eq(projectMemberships.roleId, projectRolePermissions.roleId))
    .innerJoin(documentVersions, and(
      eq(documentVersions.projectId, documents.projectId),
      eq(documentVersions.documentId, documents.id),
    ))
    .where(and(
      eq(documents.id, query.rootDocumentId),
      eq(documents.projectId, query.projectId),
      isNull(documents.archivedAt),
      eq(projects.status, PROJECT_STATUS.ACTIVE),
      isNull(projects.archivedAt),
      eq(projectMemberships.status, MEMBERSHIP_STATUS.ACTIVE),
      eq(user.status, ACCOUNT_STATUS.ACTIVE),
      eq(projectRolePermissions.permissionCode, PROJECT_PERMISSION.DOCUMENTS_SHARE),
    ))
    .for('update')
    .limit(1)
  return access !== undefined
}

const selectShare = async (
  db: ShareExecutor,
  query: ManagementScope & Readonly<{ shareId: string }>,
): Promise<StoredDocumentPublicShare | null> => {
  const [record] = await db.select().from(documentPublicShares).where(and(
    eq(documentPublicShares.id, query.shareId),
    eq(documentPublicShares.projectId, query.projectId),
    eq(documentPublicShares.rootDocumentId, query.rootDocumentId),
  )).for('update').limit(1)
  return record ?? null
}

export const createDocumentPublicShareRepository = (
  db: Database,
): DocumentPublicShareRepository => ({
  async listManaged(query) {
    if (!await authorizePublishedRoot(db, query)) return null
    const rows = await db.select().from(documentPublicShares).where(and(
      eq(documentPublicShares.projectId, query.projectId),
      eq(documentPublicShares.rootDocumentId, query.rootDocumentId),
    )).orderBy(desc(documentPublicShares.createdAt), desc(documentPublicShares.id))
    const seen = new Set<string>()
    return rows.filter((row) => {
      if (seen.has(row.scope)) return false
      seen.add(row.scope)
      return true
    })
  },

  async createManaged(command) {
    return db.transaction(async (tx): Promise<StoredDocumentPublicShare | null> => {
      if (!await authorizePublishedRoot(tx, command)) return null
      const [existing] = await tx.select().from(documentPublicShares).where(and(
        eq(documentPublicShares.projectId, command.projectId),
        eq(documentPublicShares.rootDocumentId, command.rootDocumentId),
        eq(documentPublicShares.scope, command.scope),
        isNull(documentPublicShares.revokedAt),
      )).limit(1)
      if (existing) return existing

      const [created] = await tx.insert(documentPublicShares).values({
        id: command.id,
        projectId: command.projectId,
        rootDocumentId: command.rootDocumentId,
        scope: command.scope,
        tokenHash: command.tokenHash,
        tokenCiphertext: command.tokenCiphertext,
        tokenNonce: command.tokenNonce,
        tokenKeyVersion: command.tokenKeyVersion,
        createdByUserId: command.actorUserId,
        createdAt: command.now,
        updatedAt: command.now,
      }).returning()
      if (!created) throw new Error('Public document share insert returned no row')
      await tx.insert(auditEvents).values({
        actorUserId: command.actorUserId,
        channel: AUDIT_CHANNEL.WEB,
        action: 'document.public_share_created',
        outcome: AUDIT_OUTCOME.SUCCEEDED,
        projectId: command.projectId,
        targetType: 'document_public_share',
        targetId: created.id,
        metadata: { rootDocumentId: command.rootDocumentId, scope: command.scope },
      })
      return created
    })
  },

  async loadManaged(query) {
    if (!await authorizePublishedRoot(db, query)) return null
    return selectShare(db, query)
  },

  async rotateManaged(command) {
    return db.transaction(async (tx): Promise<StoredDocumentPublicShare | null> => {
      if (!await authorizePublishedRoot(tx, command)) return null
      const previous = await selectShare(tx, { ...command, shareId: command.previousShareId })
      if (!previous) return null
      if (previous.revokedAt !== null) {
        const [replayed] = await tx.select().from(documentPublicShares).where(and(
          eq(documentPublicShares.projectId, command.projectId),
          eq(documentPublicShares.rootDocumentId, command.rootDocumentId),
          eq(documentPublicShares.scope, previous.scope),
          isNull(documentPublicShares.revokedAt),
        )).limit(1)
        return replayed ?? null
      }
      if (command.replacement.scope !== previous.scope) return null

      await tx.update(documentPublicShares).set({
        revokedByUserId: command.actorUserId,
        revokedAt: command.now,
        updatedAt: command.now,
      }).where(eq(documentPublicShares.id, previous.id))
      const [created] = await tx.insert(documentPublicShares).values({
        id: command.replacement.id,
        projectId: command.projectId,
        rootDocumentId: command.rootDocumentId,
        scope: command.replacement.scope,
        tokenHash: command.replacement.tokenHash,
        tokenCiphertext: command.replacement.tokenCiphertext,
        tokenNonce: command.replacement.tokenNonce,
        tokenKeyVersion: command.replacement.tokenKeyVersion,
        createdByUserId: command.actorUserId,
        createdAt: command.now,
        updatedAt: command.now,
      }).returning()
      if (!created) throw new Error('Public document share rotation returned no row')
      await tx.insert(auditEvents).values({
        actorUserId: command.actorUserId,
        channel: AUDIT_CHANNEL.WEB,
        action: 'document.public_share_rotated',
        outcome: AUDIT_OUTCOME.SUCCEEDED,
        projectId: command.projectId,
        targetType: 'document_public_share',
        targetId: created.id,
        metadata: {
          rootDocumentId: command.rootDocumentId,
          scope: created.scope,
          previousShareId: previous.id,
        },
      })
      return created
    })
  },

  async revokeManaged(command) {
    return db.transaction(async (tx): Promise<StoredDocumentPublicShare | null> => {
      if (!await authorizePublishedRoot(tx, command)) return null
      const current = await selectShare(tx, { ...command, shareId: command.shareId })
      if (!current || current.revokedAt !== null) return current
      const [revoked] = await tx.update(documentPublicShares).set({
        revokedByUserId: command.actorUserId,
        revokedAt: command.now,
        updatedAt: command.now,
      }).where(and(
        eq(documentPublicShares.id, current.id),
        isNull(documentPublicShares.revokedAt),
      )).returning()
      if (!revoked) throw new Error('Public document share revocation returned no row')
      await tx.insert(auditEvents).values({
        actorUserId: command.actorUserId,
        channel: AUDIT_CHANNEL.WEB,
        action: 'document.public_share_revoked',
        outcome: AUDIT_OUTCOME.SUCCEEDED,
        projectId: command.projectId,
        targetType: 'document_public_share',
        targetId: revoked.id,
        metadata: { rootDocumentId: command.rootDocumentId, scope: revoked.scope },
      })
      return revoked
    })
  },
})

