import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DOCUMENT_TEMPLATE } from '../../../shared/documents/constants'
import { AUDIT_CHANNEL, PROJECT_PERMISSION } from '../../../shared/projects/constants'
import { createDocumentPersistence, createDocumentWith } from '../../../server/modules/documents/create-document'
import { publishDocumentPersistence, publishDocumentWith } from '../../../server/modules/documents/document-versions'
import { searchDocumentsForUser } from '../../../server/modules/documents/search-documents'
import { updateDocumentDraftPersistence, updateDocumentDraftWith } from '../../../server/modules/documents/update-document-draft'
import { createProjectPersistence } from '../../../server/modules/projects/create-project'
import { createTestDatabase, resetTestDatabase, TEST_DATABASE_URL } from '../../helpers/database'

vi.stubEnv('DATABASE_URL', TEST_DATABASE_URL)

const ownerId = '00000000-0000-4000-8000-000000000031'
const viewerId = '00000000-0000-4000-8000-000000000032'
const outsiderId = '00000000-0000-4000-8000-000000000033'

beforeEach(async () => {
  await resetTestDatabase()
  const database = createTestDatabase()
  try {
    await migrate(database.db, { migrationsFolder: 'drizzle' })
    await database.queryClient`
      insert into "user" (id, name, email, email_verified, status) values
      (${ownerId}, 'Owner', 'search-owner@example.com', true, 'active'),
      (${viewerId}, 'Viewer', 'search-viewer@example.com', true, 'active'),
      (${outsiderId}, 'Outsider', 'search-outsider@example.com', true, 'active')
    `
  } finally {
    await database.close()
  }
})

describe('searchDocumentsForUser', () => {
  it('searches current drafts for editors and only the latest published snapshot for viewers', async () => {
    const database = createTestDatabase()
    try {
      const project = await createProjectPersistence(database.db)({
        actorUserId: ownerId,
        channel: AUDIT_CHANNEL.WEB,
        name: 'Searchable knowledge base',
        description: null,
      })
      const [viewerRole] = await database.queryClient<{ id: string }[]>`
        insert into project_roles (project_id, kind, display_name)
        values (${project.projectId}, 'custom', 'Document viewer')
        returning id
      `
      if (!viewerRole) throw new Error('Expected viewer role')
      await database.queryClient`
        insert into project_role_permissions (role_id, permission_code) values
        (${viewerRole.id}, ${PROJECT_PERMISSION.PROJECT_VIEW}),
        (${viewerRole.id}, ${PROJECT_PERMISSION.DOCUMENTS_VIEW})
      `
      await database.queryClient`
        insert into project_memberships (project_id, user_id, role_id)
        values (${project.projectId}, ${viewerId}, ${viewerRole.id})
      `

      const created = await createDocumentWith({ persist: createDocumentPersistence(database.db) })({
        actorUserId: ownerId,
        projectId: project.projectId,
        channel: AUDIT_CHANNEL.WEB,
        title: 'Публичная настройка API',
        parentId: null,
        template: DOCUMENT_TEMPLATE.BLANK,
      })
      if (!created.ok) throw new Error(`Expected document creation, received ${created.code}`)

      const update = updateDocumentDraftWith({ persist: updateDocumentDraftPersistence(database.db) })
      const publishedDraft = await update({
        actorUserId: ownerId,
        projectId: project.projectId,
        documentId: created.value.documentId,
        channel: AUDIT_CHANNEL.WEB,
        title: 'Публичная настройка API',
        content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Используйте токены доступа для интеграции.' }] }] },
        expectedRevision: 0,
      })
      if (!publishedDraft.ok) throw new Error(`Expected draft update, received ${publishedDraft.code}`)
      const published = await publishDocumentWith({ publish: publishDocumentPersistence(database.db) })({
        actorUserId: ownerId,
        projectId: project.projectId,
        documentId: created.value.documentId,
        channel: AUDIT_CHANNEL.WEB,
        changeSummary: '',
        expectedRevision: publishedDraft.value.draftRevision,
      })
      if (!published.ok) throw new Error(`Expected publication, received ${published.code}`)

      const privateDraft = await update({
        actorUserId: ownerId,
        projectId: project.projectId,
        documentId: created.value.documentId,
        channel: AUDIT_CHANNEL.WEB,
        title: 'Секретная новая схема',
        content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Черновой пароль ротации известен редакторам.' }] }] },
        expectedRevision: publishedDraft.value.draftRevision,
      })
      if (!privateDraft.ok) throw new Error(`Expected private draft, received ${privateDraft.code}`)

      await expect(searchDocumentsForUser(database.db, project.projectId, ownerId, 'пароль ротации'))
        .resolves.toMatchObject([{ id: created.value.documentId, title: 'Секретная новая схема', publicationState: 'draft' }])
      await expect(searchDocumentsForUser(database.db, project.projectId, viewerId, 'пароль ротации'))
        .resolves.toEqual([])
      await expect(searchDocumentsForUser(database.db, project.projectId, viewerId, 'токен доступа'))
        .resolves.toMatchObject([{ id: created.value.documentId, title: 'Публичная настройка API', publicationState: 'published' }])
      await expect(searchDocumentsForUser(database.db, project.projectId, outsiderId, 'токен'))
        .resolves.toBeNull()
    } finally {
      await database.close()
    }
  })
})
