import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DOCUMENT_TEMPLATE } from '../../../shared/documents/constants'
import { AUDIT_CHANNEL, PROJECT_PERMISSION } from '../../../shared/projects/constants'
import { createDocumentPersistence, createDocumentWith } from '../../../server/modules/documents/create-document'
import {
  archiveDocumentPersistence,
  archiveDocumentWith,
  discardDocumentPersistence,
  discardDocumentWith,
  listArchivedDocumentBatchesForUser,
  restoreDocumentPersistence,
  restoreDocumentWith,
} from '../../../server/modules/documents/document-archive'
import { listDocumentTreeForUser } from '../../../server/modules/documents/read-documents'
import { createProjectPersistence } from '../../../server/modules/projects/create-project'
import { createTestDatabase, resetTestDatabase, TEST_DATABASE_URL } from '../../helpers/database'

vi.stubEnv('DATABASE_URL', TEST_DATABASE_URL)

const ownerId = '00000000-0000-4000-8000-000000000041'
const readerId = '00000000-0000-4000-8000-000000000042'

beforeEach(async () => {
  await resetTestDatabase()
  const database = createTestDatabase()
  try {
    await migrate(database.db, { migrationsFolder: 'drizzle' })
    await database.queryClient`
      insert into "user" (id, name, email, email_verified, status) values
      (${ownerId}, 'Owner', 'archive-owner@example.com', true, 'active'),
      (${readerId}, 'Reader', 'archive-reader@example.com', true, 'active')
    `
  }
  finally {
    await database.close()
  }
})

describe('document archive and restore', () => {
  it('permanently discards only a complete never-published branch and compacts siblings', async () => {
    const database = createTestDatabase()
    try {
      const project = await createProjectPersistence(database.db)({ actorUserId: ownerId, channel: AUDIT_CHANNEL.WEB, name: 'Discard drafts', description: null })
      const create = createDocumentWith({ persist: createDocumentPersistence(database.db) })
      const rootA = await create({ actorUserId: ownerId, projectId: project.projectId, channel: AUDIT_CHANNEL.WEB, title: 'A', parentId: null, template: DOCUMENT_TEMPLATE.BLANK })
      const rootB = await create({ actorUserId: ownerId, projectId: project.projectId, channel: AUDIT_CHANNEL.WEB, title: 'B', parentId: null, template: DOCUMENT_TEMPLATE.BLANK })
      const rootC = await create({ actorUserId: ownerId, projectId: project.projectId, channel: AUDIT_CHANNEL.WEB, title: 'C', parentId: null, template: DOCUMENT_TEMPLATE.BLANK })
      if (!rootA.ok || !rootB.ok || !rootC.ok) throw new Error('Expected root fixtures')
      const child = await create({ actorUserId: ownerId, projectId: project.projectId, channel: AUDIT_CHANNEL.WEB, title: 'B1', parentId: rootB.value.documentId, template: DOCUMENT_TEMPLATE.BLANK })
      if (!child.ok) throw new Error('Expected child fixture')

      const discard = discardDocumentWith({ discard: discardDocumentPersistence(database.db) })
      await expect(discard({ actorUserId: ownerId, projectId: project.projectId, documentId: rootB.value.documentId, channel: AUDIT_CHANNEL.WEB }))
        .resolves.toMatchObject({ ok: true, value: { deletedCount: 2 } })
      await expect(database.queryClient<{ id: string, position: number }[]>`
        select id, position from documents where project_id = ${project.projectId} order by position
      `).resolves.toEqual([
        { id: rootA.value.documentId, position: 0 },
        { id: rootC.value.documentId, position: 1 },
      ])
      await expect(database.queryClient<{ action: string, metadata: { deletedCount: number } }[]>`
        select action, metadata from audit_events
        where target_id = ${rootB.value.documentId} and action = 'document.discarded'
      `).resolves.toMatchObject([{ action: 'document.discarded', metadata: { deletedCount: 2 } }])
    }
    finally {
      await database.close()
    }
  })

  it('rejects permanent discard when historical publication data exists', async () => {
    const database = createTestDatabase()
    try {
      const project = await createProjectPersistence(database.db)({ actorUserId: ownerId, channel: AUDIT_CHANNEL.WEB, name: 'Protected history', description: null })
      const created = await createDocumentWith({ persist: createDocumentPersistence(database.db) })({ actorUserId: ownerId, projectId: project.projectId, channel: AUDIT_CHANNEL.WEB, title: 'Published once', parentId: null, template: DOCUMENT_TEMPLATE.BLANK })
      if (!created.ok) throw new Error('Expected document fixture')
      await database.queryClient`
        insert into document_versions (
          project_id, document_id, version_number, source_draft_revision, title,
          draft_content, change_summary, published_by_user_id
        ) values (
          ${project.projectId}, ${created.value.documentId}, 1, 0, 'Published once',
          ${JSON.stringify({ type: 'doc', content: [] })}::jsonb, '', ${ownerId}
        )
      `
      await expect(listDocumentTreeForUser(database.db, project.projectId, ownerId))
        .resolves.toMatchObject([{ id: created.value.documentId, hasPublishedVersions: true }])
      const discard = discardDocumentWith({ discard: discardDocumentPersistence(database.db) })
      await expect(discard({ actorUserId: ownerId, projectId: project.projectId, documentId: created.value.documentId, channel: AUDIT_CHANNEL.WEB }))
        .resolves.toEqual({ ok: false, code: 'NOT_DISCARDABLE' })
      await expect(database.queryClient<{ id: string }[]>`select id from documents where id = ${created.value.documentId}`)
        .resolves.toEqual([{ id: created.value.documentId }])
    }
    finally {
      await database.close()
    }
  })

  it('archives and restores a complete branch without changing document identity or draft state', async () => {
    const database = createTestDatabase()
    try {
      const project = await createProjectPersistence(database.db)({ actorUserId: ownerId, channel: AUDIT_CHANNEL.WEB, name: 'Recoverable docs', description: null })
      const create = createDocumentWith({ persist: createDocumentPersistence(database.db) })
      const rootA = await create({ actorUserId: ownerId, projectId: project.projectId, channel: AUDIT_CHANNEL.WEB, title: 'A', parentId: null, template: DOCUMENT_TEMPLATE.BLANK })
      const rootB = await create({ actorUserId: ownerId, projectId: project.projectId, channel: AUDIT_CHANNEL.WEB, title: 'B', parentId: null, template: DOCUMENT_TEMPLATE.TECHNICAL_NOTES })
      if (!rootA.ok || !rootB.ok) throw new Error('Expected root fixtures')
      const child = await create({ actorUserId: ownerId, projectId: project.projectId, channel: AUDIT_CHANNEL.WEB, title: 'B1', parentId: rootB.value.documentId, template: DOCUMENT_TEMPLATE.BLANK })
      if (!child.ok) throw new Error('Expected child fixture')
      const grandchild = await create({ actorUserId: ownerId, projectId: project.projectId, channel: AUDIT_CHANNEL.WEB, title: 'B1.1', parentId: child.value.documentId, template: DOCUMENT_TEMPLATE.BLANK })
      if (!grandchild.ok) throw new Error('Expected grandchild fixture')

      const before = await database.queryClient<{ id: string, slug: string, draftRevision: number, draftContent: unknown }[]>`
        select id, slug, draft_revision as "draftRevision", draft_content as "draftContent"
        from documents where id = ${rootB.value.documentId}
      `
      const archive = archiveDocumentWith({ archive: archiveDocumentPersistence(database.db) })
      await expect(archive({ actorUserId: ownerId, projectId: project.projectId, documentId: rootB.value.documentId, channel: AUDIT_CHANNEL.WEB }))
        .resolves.toMatchObject({ ok: true, value: { archiveBatchId: rootB.value.documentId, archivedCount: 3 } })
      await expect(listDocumentTreeForUser(database.db, project.projectId, ownerId)).resolves.toMatchObject([
        { id: rootA.value.documentId, children: [] },
      ])
      await expect(listArchivedDocumentBatchesForUser(database.db, project.projectId, ownerId)).resolves.toMatchObject([
        { id: rootB.value.documentId, title: 'B', pageCount: 3, archivedByName: 'Owner' },
      ])
      const replacement = await create({ actorUserId: ownerId, projectId: project.projectId, channel: AUDIT_CHANNEL.WEB, title: 'B', parentId: null, template: DOCUMENT_TEMPLATE.BLANK })
      if (!replacement.ok) throw new Error('Expected replacement fixture')
      await expect(database.queryClient<{ slug: string }[]>`select slug from documents where id = ${replacement.value.documentId}`)
        .resolves.toEqual([{ slug: 'b-2' }])

      const restore = restoreDocumentWith({ restore: restoreDocumentPersistence(database.db) })
      await expect(restore({ actorUserId: ownerId, projectId: project.projectId, documentId: rootB.value.documentId, channel: AUDIT_CHANNEL.WEB }))
        .resolves.toMatchObject({ ok: true, value: { restoredCount: 3 } })
      await expect(listDocumentTreeForUser(database.db, project.projectId, ownerId)).resolves.toMatchObject([
        { id: rootA.value.documentId },
        { id: rootB.value.documentId, children: [{ id: child.value.documentId, children: [{ id: grandchild.value.documentId }] }] },
        { id: replacement.value.documentId },
      ])
      const after = await database.queryClient<{ id: string, slug: string, draftRevision: number, draftContent: unknown }[]>`
        select id, slug, draft_revision as "draftRevision", draft_content as "draftContent"
        from documents where id = ${rootB.value.documentId}
      `
      expect(after).toEqual(before)
      const audit = await database.queryClient<{ action: string, metadata: unknown }[]>`
        select action, metadata from audit_events
        where target_id = ${rootB.value.documentId} and action in ('document.archived', 'document.restored')
      `
      expect(audit).toHaveLength(2)
      expect(JSON.stringify(audit)).not.toContain('draftContent')
    }
    finally {
      await database.close()
    }
  })

  it('does not disclose or mutate the archive without stable permission codes', async () => {
    const database = createTestDatabase()
    try {
      const project = await createProjectPersistence(database.db)({ actorUserId: ownerId, channel: AUDIT_CHANNEL.WEB, name: 'Protected archive', description: null })
      const created = await createDocumentWith({ persist: createDocumentPersistence(database.db) })({ actorUserId: ownerId, projectId: project.projectId, channel: AUDIT_CHANNEL.WEB, title: 'Protected', parentId: null, template: DOCUMENT_TEMPLATE.BLANK })
      if (!created.ok) throw new Error('Expected document fixture')
      const [role] = await database.queryClient<{ id: string }[]>`
        insert into project_roles (project_id, kind, display_name) values (${project.projectId}, 'custom', 'Project only') returning id
      `
      if (!role) throw new Error('Expected role fixture')
      await database.queryClient`
        insert into project_role_permissions (role_id, permission_code) values (${role.id}, ${PROJECT_PERMISSION.PROJECT_VIEW})
      `
      await database.queryClient`
        insert into project_memberships (project_id, user_id, role_id) values (${project.projectId}, ${readerId}, ${role.id})
      `
      await expect(archiveDocumentWith({ archive: archiveDocumentPersistence(database.db) })({ actorUserId: readerId, projectId: project.projectId, documentId: created.value.documentId, channel: AUDIT_CHANNEL.WEB }))
        .resolves.toEqual({ ok: false, code: 'NOT_FOUND' })
      await expect(discardDocumentWith({ discard: discardDocumentPersistence(database.db) })({ actorUserId: readerId, projectId: project.projectId, documentId: created.value.documentId, channel: AUDIT_CHANNEL.WEB }))
        .resolves.toEqual({ ok: false, code: 'NOT_FOUND' })
      await expect(listArchivedDocumentBatchesForUser(database.db, project.projectId, readerId)).resolves.toBeNull()
    }
    finally {
      await database.close()
    }
  })
})
