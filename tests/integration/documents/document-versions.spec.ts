import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DOCUMENT_TEMPLATE } from '../../../shared/documents/constants'
import { AUDIT_CHANNEL, PROJECT_PERMISSION } from '../../../shared/projects/constants'
import { createDocumentPersistence, createDocumentWith } from '../../../server/modules/documents/create-document'
import {
  getDocumentVersionForUser,
  listDocumentVersionsForUser,
  publishDocumentPersistence,
  publishDocumentWith,
  restoreDocumentVersionPersistence,
  restoreDocumentVersionWith,
} from '../../../server/modules/documents/document-versions'
import { updateDocumentDraftPersistence, updateDocumentDraftWith } from '../../../server/modules/documents/update-document-draft'
import { getDocumentForUser } from '../../../server/modules/documents/read-documents'
import { createProjectPersistence } from '../../../server/modules/projects/create-project'
import { createTestDatabase, resetTestDatabase, TEST_DATABASE_URL } from '../../helpers/database'

vi.stubEnv('DATABASE_URL', TEST_DATABASE_URL)

const ownerId = '00000000-0000-4000-8000-000000000021'
const readerId = '00000000-0000-4000-8000-000000000022'
const imageId = '00000000-0000-4000-8000-000000000023'
const secondContent = {
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Вторая публикация' }] }],
}

beforeEach(async () => {
  await resetTestDatabase()
  const database = createTestDatabase()
  try {
    await migrate(database.db, { migrationsFolder: 'drizzle' })
    await database.queryClient`
      insert into "user" (id, name, email, email_verified, status) values
      (${ownerId}, 'Owner', 'version-owner@example.com', true, 'active'),
      (${readerId}, 'Reader', 'version-reader@example.com', true, 'active')
    `
  }
  finally {
    await database.close()
  }
})

describe('document publication history', () => {
  it('keeps published snapshots immutable and restores a historical version into a new draft revision', async () => {
    const database = createTestDatabase()
    try {
      const project = await createProjectPersistence(database.db)({
        actorUserId: ownerId,
        channel: AUDIT_CHANNEL.WEB,
        name: 'Versioned documentation',
        description: null,
      })
      const created = await createDocumentWith({ persist: createDocumentPersistence(database.db) })({
        actorUserId: ownerId,
        projectId: project.projectId,
        channel: AUDIT_CHANNEL.WEB,
        title: 'Initial title',
        parentId: null,
        template: DOCUMENT_TEMPLATE.BLANK,
      })
      if (!created.ok) {
        throw new Error(`Expected document creation, received ${created.code}`)
      }
      const documentId = created.value.documentId
      const target = await createDocumentWith({ persist: createDocumentPersistence(database.db) })({
        actorUserId: ownerId,
        projectId: project.projectId,
        channel: AUDIT_CHANNEL.WEB,
        title: 'Linked page',
        parentId: null,
        template: DOCUMENT_TEMPLATE.BLANK,
      })
      if (!target.ok) throw new Error('Expected linked document fixture')
      await database.queryClient`
        insert into document_images (id, project_id, object_key, filename, mime_type, byte_size, uploaded_by_user_id)
        values (${imageId}, ${project.projectId}, ${`projects/${project.projectId}/document-images/${imageId}`}, 'diagram.png', 'image/png', 8, ${ownerId})
      `
      const linkedFirstContent = {
        type: 'doc',
        content: [
          { type: 'paragraph', content: [{
            type: 'text',
            text: 'Первая публикация',
            marks: [{ type: 'link', attrs: { href: `document:${target.value.documentId}` } }],
          }] },
          { type: 'image', attrs: { imageId, alt: 'Диаграмма' } },
        ],
      }
      const update = updateDocumentDraftWith({ persist: updateDocumentDraftPersistence(database.db) })
      const publish = publishDocumentWith({ publish: publishDocumentPersistence(database.db) })

      const firstDraft = await update({
        actorUserId: ownerId,
        projectId: project.projectId,
        documentId,
        channel: AUDIT_CHANNEL.WEB,
        title: 'Первая версия',
        content: linkedFirstContent,
        expectedRevision: 0,
      })
      expect(firstDraft).toMatchObject({ ok: true, value: { draftRevision: 1 } })
      await expect(getDocumentForUser(database.db, project.projectId, documentId, ownerId))
        .resolves.toMatchObject({ internalLinks: [{ id: target.value.documentId, title: 'Linked page' }] })
      await expect(getDocumentForUser(database.db, project.projectId, target.value.documentId, ownerId))
        .resolves.toMatchObject({ backlinks: [{ id: documentId, title: 'Первая версия' }] })
      const firstPublish = await publish({
        actorUserId: ownerId,
        projectId: project.projectId,
        documentId,
        channel: AUDIT_CHANNEL.WEB,
        expectedRevision: 1,
      })
      expect(firstPublish).toMatchObject({ ok: true, value: { versionNumber: 1 } })
      await expect(database.queryClient<{ internalLinkTargetIds: string[], referencedImageIds: string[] }[]>`
        select internal_link_target_ids as "internalLinkTargetIds", referenced_image_ids as "referencedImageIds"
        from document_versions where document_id = ${documentId} and version_number = 1
      `).resolves.toEqual([{ internalLinkTargetIds: [target.value.documentId], referencedImageIds: [imageId] }])

      const secondDraft = await update({
        actorUserId: ownerId,
        projectId: project.projectId,
        documentId,
        channel: AUDIT_CHANNEL.WEB,
        title: 'Вторая версия',
        content: secondContent,
        expectedRevision: 1,
      })
      expect(secondDraft).toMatchObject({ ok: true, value: { draftRevision: 2 } })
      const draftState = await database.queryClient<{ publicationState: string }[]>`
        select publication_state as "publicationState" from documents where id = ${documentId}
      `
      expect(draftState).toEqual([{ publicationState: 'draft' }])

      const secondPublish = await publish({
        actorUserId: ownerId,
        projectId: project.projectId,
        documentId,
        channel: AUDIT_CHANNEL.WEB,
        changeSummary: 'Второй выпуск',
        expectedRevision: 2,
      })
      expect(secondPublish).toMatchObject({ ok: true, value: { versionNumber: 2 } })
      await expect(listDocumentVersionsForUser(database.db, project.projectId, documentId, ownerId))
        .resolves.toMatchObject([
          { versionNumber: 2, title: 'Вторая версия', changeSummary: 'Второй выпуск' },
          { versionNumber: 1, title: 'Первая версия', changeSummary: '' },
        ])
      await expect(getDocumentVersionForUser(database.db, project.projectId, documentId, 1, ownerId))
        .resolves.toMatchObject({ title: 'Первая версия', content: linkedFirstContent })

      const restore = restoreDocumentVersionWith({ restore: restoreDocumentVersionPersistence(database.db) })
      const restored = await restore({
        actorUserId: ownerId,
        projectId: project.projectId,
        documentId,
        versionNumber: 1,
        expectedRevision: 2,
        channel: AUDIT_CHANNEL.WEB,
      })
      expect(restored).toMatchObject({
        ok: true,
        value: { draftRevision: 3, title: 'Первая версия', content: linkedFirstContent },
      })

      const documents = await database.queryClient<{
        title: string
        slug: string
        draftRevision: number
        publicationState: string
        internalLinkTargetIds: string[]
        referencedImageIds: string[]
      }[]>`
        select title, slug, draft_revision as "draftRevision", publication_state as "publicationState",
          draft_internal_link_target_ids as "internalLinkTargetIds",
          draft_referenced_image_ids as "referencedImageIds"
        from documents where id = ${documentId}
      `
      expect(documents).toEqual([{
        title: 'Первая версия',
        slug: 'initial-title',
        draftRevision: 3,
        publicationState: 'draft',
        internalLinkTargetIds: [target.value.documentId],
        referencedImageIds: [imageId],
      }])
      await expect(getDocumentForUser(database.db, project.projectId, target.value.documentId, ownerId))
        .resolves.toMatchObject({ backlinks: [{ id: documentId, title: 'Первая версия' }] })
      await expect(listDocumentVersionsForUser(database.db, project.projectId, documentId, ownerId))
        .resolves.toHaveLength(2)

      const audit = await database.queryClient<{ metadata: unknown }[]>`
        select metadata from audit_events
        where target_id = ${documentId} and action in ('document.published', 'document.version_restored')
      `
      expect(JSON.stringify(audit)).not.toContain('Первая публикация')
      expect(JSON.stringify(audit)).not.toContain('Вторая публикация')
    }
    finally {
      await database.close()
    }
  })

  it('does not expose history to a project member without documents.view_history', async () => {
    const database = createTestDatabase()
    try {
      const project = await createProjectPersistence(database.db)({
        actorUserId: ownerId,
        channel: AUDIT_CHANNEL.WEB,
        name: 'Protected history',
        description: null,
      })
      const created = await createDocumentWith({ persist: createDocumentPersistence(database.db) })({
        actorUserId: ownerId,
        projectId: project.projectId,
        channel: AUDIT_CHANNEL.WEB,
        title: 'Protected page',
        parentId: null,
        template: DOCUMENT_TEMPLATE.BLANK,
      })
      if (!created.ok) {
        throw new Error(`Expected document creation, received ${created.code}`)
      }
      const [role] = await database.queryClient<{ id: string }[]>`
        insert into project_roles (project_id, kind, display_name)
        values (${project.projectId}, 'custom', 'Reader') returning id
      `
      if (!role) {
        throw new Error('Expected role fixture')
      }
      await database.queryClient`
        insert into project_role_permissions (role_id, permission_code) values
        (${role.id}, ${PROJECT_PERMISSION.PROJECT_VIEW}),
        (${role.id}, ${PROJECT_PERMISSION.DOCUMENTS_VIEW})
      `
      await database.queryClient`
        insert into project_memberships (project_id, user_id, role_id)
        values (${project.projectId}, ${readerId}, ${role.id})
      `

      await expect(listDocumentVersionsForUser(database.db, project.projectId, created.value.documentId, readerId))
        .resolves.toBeNull()
      await expect(getDocumentVersionForUser(database.db, project.projectId, created.value.documentId, 1, readerId))
        .resolves.toBeNull()
    }
    finally {
      await database.close()
    }
  })
})
