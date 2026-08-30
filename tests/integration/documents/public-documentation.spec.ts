import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DOCUMENT_TEMPLATE } from '../../../shared/documents/constants'
import { DOCUMENT_PUBLIC_SHARE_SCOPE } from '../../../shared/documents/public-share-constants'
import { AUDIT_CHANNEL } from '../../../shared/projects/constants'
import { createDocumentPersistence, createDocumentWith } from '../../../server/modules/documents/create-document'
import { createDocumentPublicShareRepository } from '../../../server/modules/documents/document-public-share-repository'
import { createDocumentPublicShareManagementService } from '../../../server/modules/documents/document-public-shares'
import { publishDocumentPersistence, publishDocumentWith } from '../../../server/modules/documents/document-versions'
import { createPublicDocumentationRepository } from '../../../server/modules/documents/public-documentation-repository'
import { createPublicDocumentationService } from '../../../server/modules/documents/public-documentation'
import { createDocumentPublicShareCrypto } from '../../../server/modules/documents/public-share-crypto'
import { updateDocumentDraftPersistence, updateDocumentDraftWith } from '../../../server/modules/documents/update-document-draft'
import { createProjectPersistence } from '../../../server/modules/projects/create-project'
import { createTestDatabase, resetTestDatabase, TEST_DATABASE_URL } from '../../helpers/database'

vi.stubEnv('DATABASE_URL', TEST_DATABASE_URL)

const ownerId = '00000000-0000-4000-8000-000000000551'
const imageId = '00000000-0000-4000-8000-000000000552'
const unreferencedImageId = '00000000-0000-4000-8000-000000000553'

beforeEach(async () => {
  await resetTestDatabase()
  const database = createTestDatabase()
  try {
    await migrate(database.db, { migrationsFolder: 'drizzle' })
    await database.queryClient`
      insert into "user" (id, name, email, email_verified, status)
      values (${ownerId}, 'Public owner', 'public-reader-owner@example.com', true, 'active')
    `
  }
  finally {
    await database.close()
  }
})

describe('public documentation projection persistence', () => {
  it('tracks current published branch membership, latest snapshots, revocation, and image references', async () => {
    const database = createTestDatabase()
    try {
      const project = await createProjectPersistence(database.db)({
        actorUserId: ownerId,
        channel: AUDIT_CHANNEL.WEB,
        name: 'Shared project',
        description: null,
      })
      const create = createDocumentWith({ persist: createDocumentPersistence(database.db) })
      const createPage = async (title: string, parentId: string | null): Promise<string> => {
        const result = await create({
          actorUserId: ownerId,
          projectId: project.projectId,
          channel: AUDIT_CHANNEL.WEB,
          title,
          parentId,
          template: DOCUMENT_TEMPLATE.BLANK,
        })
        if (!result.ok) throw new Error(`Document fixture failed: ${result.code}`)
        return result.value.documentId
      }
      const rootId = await createPage('Draft root title', null)
      const childId = await createPage('First child title', rootId)
      const otherRootId = await createPage('Other root', null)
      await database.queryClient`
        insert into document_images (id, project_id, object_key, filename, mime_type, byte_size, uploaded_by_user_id)
        values
          (${imageId}, ${project.projectId}, 'objects/referenced', 'referenced.png', 'image/png', 8, ${ownerId}),
          (${unreferencedImageId}, ${project.projectId}, 'objects/private', 'private.png', 'image/png', 8, ${ownerId})
      `
      const update = updateDocumentDraftWith({ persist: updateDocumentDraftPersistence(database.db) })
      const rootDraft = await update({
        actorUserId: ownerId,
        projectId: project.projectId,
        documentId: rootId,
        channel: AUDIT_CHANNEL.WEB,
        title: 'Published root title',
        content: { type: 'doc', content: [{ type: 'image', attrs: { imageId, alt: 'Diagram' } }] },
        expectedRevision: 0,
      })
      if (!rootDraft.ok) throw new Error(`Root update failed: ${rootDraft.code}`)
      const publish = publishDocumentWith({ publish: publishDocumentPersistence(database.db) })
      for (const [documentId, expectedRevision] of [[rootId, 1], [childId, 0], [otherRootId, 0]] as const) {
        const result = await publish({
          actorUserId: ownerId,
          projectId: project.projectId,
          documentId,
          channel: AUDIT_CHANNEL.WEB,
          expectedRevision,
        })
        if (!result.ok) throw new Error(`Publication fixture failed: ${result.code}`)
      }
      const childDraft = await update({
        actorUserId: ownerId,
        projectId: project.projectId,
        documentId: childId,
        channel: AUDIT_CHANNEL.WEB,
        title: 'Latest child title',
        content: { type: 'doc', content: [] },
        expectedRevision: 0,
      })
      if (!childDraft.ok) throw new Error(`Child update failed: ${childDraft.code}`)
      const childPublish = await publish({
        actorUserId: ownerId,
        projectId: project.projectId,
        documentId: childId,
        channel: AUDIT_CHANNEL.WEB,
        expectedRevision: 1,
      })
      if (!childPublish.ok) throw new Error(`Child publication failed: ${childPublish.code}`)

      const crypto = createDocumentPublicShareCrypto({
        activeVersion: 1,
        keys: new Map([[1, Buffer.alloc(32, 5)]]),
      })
      const management = createDocumentPublicShareManagementService({
        repository: createDocumentPublicShareRepository(database.db),
        crypto,
        publicBaseUrl: 'https://minerva.example/',
      })
      const opened = await management.open({
        projectId: project.projectId,
        rootDocumentId: rootId,
        actorUserId: ownerId,
        scope: DOCUMENT_PUBLIC_SHARE_SCOPE.BRANCH,
      })
      if (!opened.ok) throw new Error(`Share fixture failed: ${opened.code}`)
      const token = new URL(opened.value.url).pathname.split('/').at(-1)
      if (!token) throw new Error('Expected capability token')
      const publicReader = createPublicDocumentationService({
        repository: createPublicDocumentationRepository(database.db),
      })

      await expect(publicReader.readPage({ token, selectedDocumentId: childId }))
        .resolves.toMatchObject({
          projectName: 'Shared project',
          page: { id: childId, title: 'Latest child title' },
          tree: [{ id: rootId, title: 'Published root title', children: [{ id: childId }] }],
        })
      const concurrentReads = await Promise.all(Array.from(
        { length: 4 },
        () => publicReader.readPage({ token, selectedDocumentId: childId }),
      ))
      expect(concurrentReads.every(result => result?.page.title === 'Latest child title')).toBe(true)
      await expect(publicReader.resolveImage({ token, imageId }))
        .resolves.toMatchObject({ objectKey: 'objects/referenced' })
      await expect(publicReader.resolveImage({ token, imageId: unreferencedImageId })).resolves.toBeNull()

      const postShareDraft = await update({
        actorUserId: ownerId,
        projectId: project.projectId,
        documentId: childId,
        channel: AUDIT_CHANNEL.WEB,
        title: 'Published after sharing',
        content: { type: 'doc', content: [] },
        expectedRevision: 1,
      })
      if (!postShareDraft.ok) throw new Error(`Post-share update failed: ${postShareDraft.code}`)
      const postSharePublish = await publish({
        actorUserId: ownerId,
        projectId: project.projectId,
        documentId: childId,
        channel: AUDIT_CHANNEL.WEB,
        expectedRevision: 2,
      })
      if (!postSharePublish.ok) throw new Error(`Post-share publication failed: ${postSharePublish.code}`)
      await expect(publicReader.readPage({ token, selectedDocumentId: childId }))
        .resolves.toMatchObject({ page: { title: 'Published after sharing' } })

      await database.queryClient`update documents set parent_id = ${otherRootId} where id = ${childId}`
      await expect(publicReader.readPage({ token, selectedDocumentId: childId })).resolves.toBeNull()
      await database.queryClient`update documents set parent_id = ${rootId} where id = ${childId}`
      await expect(publicReader.readPage({ token, selectedDocumentId: childId }))
        .resolves.toMatchObject({ page: { title: 'Published after sharing' } })

      await management.revoke({
        projectId: project.projectId,
        rootDocumentId: rootId,
        actorUserId: ownerId,
        shareId: opened.value.share.id,
      })
      await expect(publicReader.readPage({ token, selectedDocumentId: rootId })).resolves.toBeNull()
      await expect(publicReader.resolveImage({ token, imageId })).resolves.toBeNull()
    }
    finally {
      await database.close()
    }
  })
})
