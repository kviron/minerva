import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DOCUMENT_TEMPLATE } from '../../../shared/documents/constants'
import { DOCUMENT_PUBLIC_SHARE_SCOPE } from '../../../shared/documents/public-share-constants'
import { AUDIT_CHANNEL } from '../../../shared/projects/constants'
import { createDocumentPersistence, createDocumentWith } from '../../../server/modules/documents/create-document'
import { archiveDocumentPersistence, archiveDocumentWith } from '../../../server/modules/documents/document-archive'
import { createDocumentPublicShareRepository } from '../../../server/modules/documents/document-public-share-repository'
import { createDocumentPublicShareManagementService } from '../../../server/modules/documents/document-public-shares'
import { publishDocumentPersistence, publishDocumentWith } from '../../../server/modules/documents/document-versions'
import { createDocumentPublicShareCrypto } from '../../../server/modules/documents/public-share-crypto'
import { createProjectPersistence } from '../../../server/modules/projects/create-project'
import { createTestDatabase, resetTestDatabase, TEST_DATABASE_URL } from '../../helpers/database'

vi.stubEnv('DATABASE_URL', TEST_DATABASE_URL)

const ownerId = '00000000-0000-4000-8000-000000000451'
const outsiderId = '00000000-0000-4000-8000-000000000452'

beforeEach(async () => {
  await resetTestDatabase()
  const database = createTestDatabase()
  try {
    await migrate(database.db, { migrationsFolder: 'drizzle' })
    await database.queryClient`
      insert into "user" (id, name, email, email_verified, status)
      values
        (${ownerId}, 'Share owner', 'share-owner@example.com', true, 'active'),
        (${outsiderId}, 'Outsider', 'share-outsider@example.com', true, 'active')
    `
  }
  finally {
    await database.close()
  }
})

describe('public document share persistence', () => {
  it('creates, replays, rotates and revokes one encrypted capability atomically', async () => {
    const database = createTestDatabase()
    try {
      const project = await createProjectPersistence(database.db)({
        actorUserId: ownerId,
        channel: AUDIT_CHANNEL.WEB,
        name: 'Public documentation',
        description: null,
      })
      const created = await createDocumentWith({ persist: createDocumentPersistence(database.db) })({
        actorUserId: ownerId,
        projectId: project.projectId,
        channel: AUDIT_CHANNEL.WEB,
        title: 'Published root',
        parentId: null,
        template: DOCUMENT_TEMPLATE.BLANK,
      })
      if (!created.ok) throw new Error(`Document fixture failed: ${created.code}`)
      const published = await publishDocumentWith({ publish: publishDocumentPersistence(database.db) })({
        actorUserId: ownerId,
        projectId: project.projectId,
        documentId: created.value.documentId,
        channel: AUDIT_CHANNEL.WEB,
        expectedRevision: 0,
      })
      if (!published.ok) throw new Error(`Publication fixture failed: ${published.code}`)

      const crypto = createDocumentPublicShareCrypto({
        activeVersion: 1,
        keys: new Map([[1, Buffer.alloc(32, 7)]]),
      })
      const service = createDocumentPublicShareManagementService({
        repository: createDocumentPublicShareRepository(database.db),
        crypto,
        publicBaseUrl: 'https://minerva.example/',
      })
      const command = {
        projectId: project.projectId,
        rootDocumentId: created.value.documentId,
        actorUserId: ownerId,
        scope: DOCUMENT_PUBLIC_SHARE_SCOPE.BRANCH,
      }

      const opened = await Promise.all([service.open(command), service.open(command)])
      expect(opened[0]).toMatchObject({ ok: true })
      expect(opened[1]).toEqual(opened[0])
      if (!opened[0]?.ok) throw new Error('Expected an opened share')
      const firstUrl = opened[0].value.url
      const firstToken = new URL(firstUrl).pathname.split('/').at(-1)
      expect(firstToken).toHaveLength(43)

      const stored = await database.queryClient<{
        id: string
        tokenHash: string
        tokenCiphertext: string
        revokedAt: Date | null
      }[]>`
        select id, token_hash as "tokenHash", token_ciphertext as "tokenCiphertext",
          revoked_at as "revokedAt"
        from document_public_shares
      `
      expect(stored).toHaveLength(1)
      expect(stored[0]?.tokenHash).toHaveLength(64)
      expect(stored[0]?.tokenHash).not.toBe(firstToken)
      expect(stored[0]?.tokenCiphertext).not.toContain(firstToken)

      const shareId = opened[0].value.share.id
      await expect(service.copy({ ...command, shareId })).resolves.toEqual(opened[0])
      const rotated = await Promise.all([
        service.rotate({ ...command, shareId }),
        service.rotate({ ...command, shareId }),
      ])
      expect(rotated[0]).toMatchObject({ ok: true })
      expect(rotated[1]).toEqual(rotated[0])
      if (!rotated[0]?.ok) throw new Error('Expected a rotated share')
      expect(rotated[0].value.url).not.toBe(firstUrl)

      const rotatedId = rotated[0].value.share.id
      const revoked = await service.revoke({ ...command, shareId: rotatedId })
      expect(revoked).toMatchObject({ ok: true, value: { status: 'revoked' } })
      await expect(service.revoke({ ...command, shareId: rotatedId })).resolves.toEqual(revoked)

      const effects = await database.queryClient<{ action: string, metadata: unknown }[]>`
        select action, metadata from audit_events
        where action like 'document.public_share_%'
        order by created_at
      `
      expect(effects.map(effect => effect.action)).toEqual([
        'document.public_share_created',
        'document.public_share_rotated',
        'document.public_share_revoked',
      ])
      expect(JSON.stringify(effects)).not.toContain(firstToken)
      expect(JSON.stringify(effects)).not.toContain('Published root')
    }
    finally {
      await database.close()
    }
  })

  it('fails closed for a document without a published snapshot', async () => {
    const database = createTestDatabase()
    try {
      const project = await createProjectPersistence(database.db)({
        actorUserId: ownerId,
        channel: AUDIT_CHANNEL.WEB,
        name: 'Draft documentation',
        description: null,
      })
      const created = await createDocumentWith({ persist: createDocumentPersistence(database.db) })({
        actorUserId: ownerId,
        projectId: project.projectId,
        channel: AUDIT_CHANNEL.WEB,
        title: 'Private draft',
        parentId: null,
        template: DOCUMENT_TEMPLATE.BLANK,
      })
      if (!created.ok) throw new Error(`Document fixture failed: ${created.code}`)
      const service = createDocumentPublicShareManagementService({
        repository: createDocumentPublicShareRepository(database.db),
        crypto: createDocumentPublicShareCrypto({
          activeVersion: 1,
          keys: new Map([[1, Buffer.alloc(32, 8)]]),
        }),
        publicBaseUrl: 'https://minerva.example/',
      })

      await expect(service.open({
        projectId: project.projectId,
        rootDocumentId: created.value.documentId,
        actorUserId: ownerId,
        scope: DOCUMENT_PUBLIC_SHARE_SCOPE.DOCUMENT,
      })).resolves.toEqual({ ok: false, code: 'NOT_FOUND' })
      await expect(database.queryClient`select id from document_public_shares`).resolves.toHaveLength(0)
    }
    finally {
      await database.close()
    }
  })

  it('does not reveal or mutate shares across user, project, or archive boundaries', async () => {
    const database = createTestDatabase()
    try {
      const firstProject = await createProjectPersistence(database.db)({
        actorUserId: ownerId,
        channel: AUDIT_CHANNEL.WEB,
        name: 'Protected public docs',
        description: null,
      })
      const secondProject = await createProjectPersistence(database.db)({
        actorUserId: ownerId,
        channel: AUDIT_CHANNEL.WEB,
        name: 'Other project',
        description: null,
      })
      const created = await createDocumentWith({ persist: createDocumentPersistence(database.db) })({
        actorUserId: ownerId,
        projectId: firstProject.projectId,
        channel: AUDIT_CHANNEL.WEB,
        title: 'Protected published page',
        parentId: null,
        template: DOCUMENT_TEMPLATE.BLANK,
      })
      if (!created.ok) throw new Error(`Document fixture failed: ${created.code}`)
      const published = await publishDocumentWith({ publish: publishDocumentPersistence(database.db) })({
        actorUserId: ownerId,
        projectId: firstProject.projectId,
        documentId: created.value.documentId,
        channel: AUDIT_CHANNEL.WEB,
        expectedRevision: 0,
      })
      if (!published.ok) throw new Error(`Publication fixture failed: ${published.code}`)
      const service = createDocumentPublicShareManagementService({
        repository: createDocumentPublicShareRepository(database.db),
        crypto: createDocumentPublicShareCrypto({
          activeVersion: 1,
          keys: new Map([[1, Buffer.alloc(32, 9)]]),
        }),
        publicBaseUrl: 'https://minerva.example/',
      })
      const opened = await service.open({
        projectId: firstProject.projectId,
        rootDocumentId: created.value.documentId,
        actorUserId: ownerId,
        scope: DOCUMENT_PUBLIC_SHARE_SCOPE.DOCUMENT,
      })
      if (!opened.ok) throw new Error('Expected an opened share')
      const query = {
        projectId: firstProject.projectId,
        rootDocumentId: created.value.documentId,
        shareId: opened.value.share.id,
      }

      await expect(service.copy({ ...query, actorUserId: outsiderId }))
        .resolves.toEqual({ ok: false, code: 'NOT_FOUND' })
      await expect(service.copy({ ...query, projectId: secondProject.projectId, actorUserId: ownerId }))
        .resolves.toEqual({ ok: false, code: 'NOT_FOUND' })

      const archived = await archiveDocumentWith({ archive: archiveDocumentPersistence(database.db) })({
        actorUserId: ownerId,
        projectId: firstProject.projectId,
        documentId: created.value.documentId,
        channel: AUDIT_CHANNEL.WEB,
      })
      expect(archived).toMatchObject({ ok: true })
      await expect(service.copy({ ...query, actorUserId: ownerId }))
        .resolves.toEqual({ ok: false, code: 'NOT_FOUND' })
      await expect(database.queryClient<{ count: number }[]>`
        select count(*)::int as count from audit_events
        where action like 'document.public_share_%'
      `).resolves.toEqual([{ count: 1 }])
    }
    finally {
      await database.close()
    }
  })
})
