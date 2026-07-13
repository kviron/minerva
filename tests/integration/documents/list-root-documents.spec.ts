import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DOCUMENT_TEMPLATE } from '../../../shared/documents/constants'
import { AUDIT_CHANNEL, PROJECT_PERMISSION } from '../../../shared/projects/constants'
import { createDocumentPersistence, createDocumentWith } from '../../../server/modules/documents/create-document'
import { listRootDocumentsForUser } from '../../../server/modules/documents/list-root-documents'
import { getDocumentForUser, listDocumentTreeForUser } from '../../../server/modules/documents/read-documents'
import {
  updateDocumentDraftPersistence,
  updateDocumentDraftWith,
} from '../../../server/modules/documents/update-document-draft'
import { createProjectPersistence } from '../../../server/modules/projects/create-project'
import { createTestDatabase, resetTestDatabase, TEST_DATABASE_URL } from '../../helpers/database'

vi.stubEnv('DATABASE_URL', TEST_DATABASE_URL)

const ownerId = '00000000-0000-4000-8000-000000000011'
const limitedMemberId = '00000000-0000-4000-8000-000000000012'

beforeEach(async () => {
  await resetTestDatabase()
  const database = createTestDatabase()
  try {
    await migrate(database.db, { migrationsFolder: 'drizzle' })
    await database.queryClient`
      insert into "user" (id, name, email, email_verified, status) values
      (${ownerId}, 'Owner', 'documents-owner@example.com', true, 'active'),
      (${limitedMemberId}, 'Limited', 'documents-limited@example.com', true, 'active')
    `
  } finally {
    await database.close()
  }
})

describe('listRootDocumentsForUser', () => {
  it('returns ordered active roots and direct child counts to a permitted member', async () => {
    const database = createTestDatabase()
    try {
      const project = await createProjectPersistence(database.db)({
        actorUserId: ownerId,
        channel: AUDIT_CHANNEL.WEB,
        name: 'Knowledge base',
        description: null,
      })
      const [architecture] = await database.queryClient<{ id: string }[]>`
        insert into documents (project_id, title, slug, position, owner_user_id)
        values (${project.projectId}, 'Архитектура', 'architecture', 0, ${ownerId})
        returning id
      `
      if (!architecture) {
        throw new Error('Expected root document fixture')
      }
      await database.queryClient`
        insert into documents (project_id, parent_id, title, slug, position, owner_user_id)
        values
          (${project.projectId}, ${architecture.id}, 'API', 'api', 0, ${ownerId}),
          (${project.projectId}, null, 'Эксплуатация', 'operations', 1, ${ownerId})
      `

      await expect(listRootDocumentsForUser(database.db, project.projectId, ownerId)).resolves.toMatchObject([
        { title: 'Архитектура', childCount: 1 },
        { title: 'Эксплуатация', childCount: 0 },
      ])
    } finally {
      await database.close()
    }
  })

  it('does not expose the tree to an active member without documents.view', async () => {
    const database = createTestDatabase()
    try {
      const project = await createProjectPersistence(database.db)({
        actorUserId: ownerId,
        channel: AUDIT_CHANNEL.WEB,
        name: 'Private knowledge base',
        description: null,
      })
      const [role] = await database.queryClient<{ id: string }[]>`
        insert into project_roles (project_id, kind, display_name)
        values (${project.projectId}, 'custom', 'Without documents')
        returning id
      `
      if (!role) {
        throw new Error('Expected project role fixture')
      }
      await database.queryClient`
        insert into project_role_permissions (role_id, permission_code)
        values (${role.id}, ${PROJECT_PERMISSION.PROJECT_VIEW})
      `
      await database.queryClient`
        insert into project_memberships (project_id, user_id, role_id)
        values (${project.projectId}, ${limitedMemberId}, ${role.id})
      `

      await expect(listRootDocumentsForUser(database.db, project.projectId, limitedMemberId)).resolves.toBeNull()
    } finally {
      await database.close()
    }
  })
})

describe('createDocumentWith', () => {
  it('creates ordered roots and children with unique slugs, template content, and an audit event', async () => {
    const database = createTestDatabase()
    try {
      const project = await createProjectPersistence(database.db)({
        actorUserId: ownerId,
        channel: AUDIT_CHANNEL.WEB,
        name: 'Documentation authoring',
        description: null,
      })
      const createDocument = createDocumentWith({ persist: createDocumentPersistence(database.db) })
      const firstRoot = await createDocument({
        actorUserId: ownerId,
        projectId: project.projectId,
        channel: AUDIT_CHANNEL.WEB,
        title: 'Архитектура',
        parentId: null,
        template: DOCUMENT_TEMPLATE.TECHNICAL_SPECIFICATION,
      })
      if (!firstRoot.ok) {
        throw new Error(`Expected root creation, received ${firstRoot.code}`)
      }
      const secondRoot = await createDocument({
        actorUserId: ownerId,
        projectId: project.projectId,
        channel: AUDIT_CHANNEL.WEB,
        title: 'Архитектура',
        parentId: null,
        template: DOCUMENT_TEMPLATE.BLANK,
      })
      if (!secondRoot.ok) {
        throw new Error(`Expected second root creation, received ${secondRoot.code}`)
      }
      const child = await createDocument({
        actorUserId: ownerId,
        projectId: project.projectId,
        channel: AUDIT_CHANNEL.WEB,
        title: 'API',
        parentId: firstRoot.value.documentId,
        template: DOCUMENT_TEMPLATE.TECHNICAL_NOTES,
      })
      if (!child.ok) {
        throw new Error(`Expected child creation, received ${child.code}`)
      }

      const rows = await database.queryClient<{
        id: string
        parentId: string | null
        slug: string
        position: number
        draftContent: { type?: string, content?: unknown[] }
      }[]>`
        select
          id,
          parent_id as "parentId",
          slug,
          position,
          draft_content as "draftContent"
        from documents
        where project_id = ${project.projectId}
        order by parent_id nulls first, position
      `
      expect(rows).toEqual(expect.arrayContaining([
        expect.objectContaining({
          id: firstRoot.value.documentId,
          parentId: null,
          slug: 'arhitektura',
          position: 0,
          draftContent: expect.objectContaining({ type: 'doc' }),
        }),
        expect.objectContaining({
          id: secondRoot.value.documentId,
          parentId: null,
          slug: 'arhitektura-2',
          position: 1,
        }),
        expect.objectContaining({
          id: child.value.documentId,
          parentId: firstRoot.value.documentId,
          slug: 'api',
          position: 0,
        }),
      ]))
      expect(rows.find(row => row.id === firstRoot.value.documentId)?.draftContent.content?.length).toBeGreaterThan(0)

      const auditRows = await database.queryClient<{ targetId: string }[]>`
        select target_id as "targetId"
        from audit_events
        where project_id = ${project.projectId} and action = 'document.created'
      `
      expect(auditRows.map(row => row.targetId)).toEqual(expect.arrayContaining([
        firstRoot.value.documentId,
        secondRoot.value.documentId,
        child.value.documentId,
      ]))
    } finally {
      await database.close()
    }
  })

  it('does not create a document for a member without documents.create', async () => {
    const database = createTestDatabase()
    try {
      const project = await createProjectPersistence(database.db)({
        actorUserId: ownerId,
        channel: AUDIT_CHANNEL.WEB,
        name: 'Read-only documentation',
        description: null,
      })
      const [role] = await database.queryClient<{ id: string }[]>`
        insert into project_roles (project_id, kind, display_name)
        values (${project.projectId}, 'custom', 'Documents reader')
        returning id
      `
      if (!role) {
        throw new Error('Expected project role fixture')
      }
      await database.queryClient`
        insert into project_role_permissions (role_id, permission_code)
        values
          (${role.id}, ${PROJECT_PERMISSION.PROJECT_VIEW}),
          (${role.id}, ${PROJECT_PERMISSION.DOCUMENTS_VIEW})
      `
      await database.queryClient`
        insert into project_memberships (project_id, user_id, role_id)
        values (${project.projectId}, ${limitedMemberId}, ${role.id})
      `

      const result = await createDocumentWith({ persist: createDocumentPersistence(database.db) })({
        actorUserId: limitedMemberId,
        projectId: project.projectId,
        channel: AUDIT_CHANNEL.WEB,
        title: 'Forbidden page',
        parentId: null,
        template: DOCUMENT_TEMPLATE.BLANK,
      })
      expect(result).toEqual({ ok: false, code: 'NOT_FOUND' })
      await expect(database.queryClient`
        select id from documents where project_id = ${project.projectId}
      `).resolves.toHaveLength(0)
    } finally {
      await database.close()
    }
  })
})

describe('document reader', () => {
  it('returns the complete ordered tree and selected-page context to a permitted member', async () => {
    const database = createTestDatabase()
    try {
      const project = await createProjectPersistence(database.db)({
        actorUserId: ownerId,
        channel: AUDIT_CHANNEL.WEB,
        name: 'Readable documentation',
        description: null,
      })
      const createDocument = createDocumentWith({ persist: createDocumentPersistence(database.db) })
      const root = await createDocument({
        actorUserId: ownerId,
        projectId: project.projectId,
        channel: AUDIT_CHANNEL.WEB,
        title: 'Архитектура',
        parentId: null,
        template: DOCUMENT_TEMPLATE.SITE_OVERVIEW,
      })
      if (!root.ok) {
        throw new Error(`Expected root creation, received ${root.code}`)
      }
      const child = await createDocument({
        actorUserId: ownerId,
        projectId: project.projectId,
        channel: AUDIT_CHANNEL.WEB,
        title: 'API',
        parentId: root.value.documentId,
        template: DOCUMENT_TEMPLATE.TECHNICAL_NOTES,
      })
      if (!child.ok) {
        throw new Error(`Expected child creation, received ${child.code}`)
      }

      await expect(listDocumentTreeForUser(database.db, project.projectId, ownerId)).resolves.toMatchObject([
        {
          id: root.value.documentId,
          children: [{ id: child.value.documentId, children: [] }],
        },
      ])
      await expect(getDocumentForUser(database.db, project.projectId, child.value.documentId, ownerId)).resolves.toMatchObject({
        id: child.value.documentId,
        parentId: root.value.documentId,
        draftContent: { type: 'doc' },
        ancestors: [{ id: root.value.documentId, title: 'Архитектура' }],
        children: [],
      })
    } finally {
      await database.close()
    }
  })

  it('does not disclose a document or tree without documents.view', async () => {
    const database = createTestDatabase()
    try {
      const project = await createProjectPersistence(database.db)({
        actorUserId: ownerId,
        channel: AUDIT_CHANNEL.WEB,
        name: 'Protected documentation',
        description: null,
      })
      const created = await createDocumentWith({ persist: createDocumentPersistence(database.db) })({
        actorUserId: ownerId,
        projectId: project.projectId,
        channel: AUDIT_CHANNEL.WEB,
        title: 'Private page',
        parentId: null,
        template: DOCUMENT_TEMPLATE.BLANK,
      })
      if (!created.ok) {
        throw new Error(`Expected document creation, received ${created.code}`)
      }
      const [role] = await database.queryClient<{ id: string }[]>`
        insert into project_roles (project_id, kind, display_name)
        values (${project.projectId}, 'custom', 'Project only')
        returning id
      `
      if (!role) {
        throw new Error('Expected project role fixture')
      }
      await database.queryClient`
        insert into project_role_permissions (role_id, permission_code)
        values (${role.id}, ${PROJECT_PERMISSION.PROJECT_VIEW})
      `
      await database.queryClient`
        insert into project_memberships (project_id, user_id, role_id)
        values (${project.projectId}, ${limitedMemberId}, ${role.id})
      `

      await expect(listDocumentTreeForUser(database.db, project.projectId, limitedMemberId)).resolves.toBeNull()
      await expect(getDocumentForUser(
        database.db,
        project.projectId,
        created.value.documentId,
        limitedMemberId,
      )).resolves.toBeNull()
    } finally {
      await database.close()
    }
  })
})

describe('document draft updates', () => {
  it('increments the revision atomically and rejects a stale concurrent update without leaking content into audit', async () => {
    const database = createTestDatabase()
    try {
      const project = await createProjectPersistence(database.db)({
        actorUserId: ownerId,
        channel: AUDIT_CHANNEL.WEB,
        name: 'Concurrent documentation',
        description: null,
      })
      const created = await createDocumentWith({ persist: createDocumentPersistence(database.db) })({
        actorUserId: ownerId,
        projectId: project.projectId,
        channel: AUDIT_CHANNEL.WEB,
        title: 'Architecture',
        parentId: null,
        template: DOCUMENT_TEMPLATE.BLANK,
      })
      if (!created.ok) {
        throw new Error(`Expected document creation, received ${created.code}`)
      }
      const update = updateDocumentDraftWith({ persist: updateDocumentDraftPersistence(database.db) })
      const first = await update({
        actorUserId: ownerId,
        projectId: project.projectId,
        documentId: created.value.documentId,
        channel: AUDIT_CHANNEL.WEB,
        title: 'Архитектура',
        content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Первая версия' }] }] },
        expectedRevision: 0,
      })
      expect(first).toMatchObject({ ok: true, value: { draftRevision: 1 } })

      const stale = await update({
        actorUserId: ownerId,
        projectId: project.projectId,
        documentId: created.value.documentId,
        channel: AUDIT_CHANNEL.WEB,
        title: 'Перезаписанная архитектура',
        content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Устаревшая версия' }] }] },
        expectedRevision: 0,
      })
      expect(stale).toEqual({ ok: false, code: 'DRAFT_CONFLICT' })

      await expect(getDocumentForUser(database.db, project.projectId, created.value.documentId, ownerId)).resolves.toMatchObject({
        title: 'Архитектура',
        draftRevision: 1,
        draftContent: { content: [{ content: [{ text: 'Первая версия' }] }] },
      })
      const auditRows = await database.queryClient<{ metadata: unknown }[]>`
        select metadata
        from audit_events
        where target_id = ${created.value.documentId} and action = 'document.draft_updated'
      `
      expect(auditRows).toHaveLength(1)
      expect(JSON.stringify(auditRows)).not.toContain('Первая версия')
      expect(JSON.stringify(auditRows)).not.toContain('Архитектура')
    } finally {
      await database.close()
    }
  })

  it('returns the same safe not-found result without documents.update_draft', async () => {
    const database = createTestDatabase()
    try {
      const project = await createProjectPersistence(database.db)({
        actorUserId: ownerId,
        channel: AUDIT_CHANNEL.WEB,
        name: 'Protected draft',
        description: null,
      })
      const created = await createDocumentWith({ persist: createDocumentPersistence(database.db) })({
        actorUserId: ownerId,
        projectId: project.projectId,
        channel: AUDIT_CHANNEL.WEB,
        title: 'Protected',
        parentId: null,
        template: DOCUMENT_TEMPLATE.BLANK,
      })
      if (!created.ok) {
        throw new Error(`Expected document creation, received ${created.code}`)
      }
      const [role] = await database.queryClient<{ id: string }[]>`
        insert into project_roles (project_id, kind, display_name)
        values (${project.projectId}, 'custom', 'Document viewer')
        returning id
      `
      if (!role) {
        throw new Error('Expected role fixture')
      }
      await database.queryClient`
        insert into project_role_permissions (role_id, permission_code)
        values
          (${role.id}, ${PROJECT_PERMISSION.PROJECT_VIEW}),
          (${role.id}, ${PROJECT_PERMISSION.DOCUMENTS_VIEW})
      `
      await database.queryClient`
        insert into project_memberships (project_id, user_id, role_id)
        values (${project.projectId}, ${limitedMemberId}, ${role.id})
      `

      const result = await updateDocumentDraftWith({ persist: updateDocumentDraftPersistence(database.db) })({
        actorUserId: limitedMemberId,
        projectId: project.projectId,
        documentId: created.value.documentId,
        channel: AUDIT_CHANNEL.WEB,
        title: 'Forbidden',
        content: { type: 'doc', content: [] },
        expectedRevision: 0,
      })
      expect(result).toEqual({ ok: false, code: 'NOT_FOUND' })
    } finally {
      await database.close()
    }
  })
})
