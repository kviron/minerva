import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DOCUMENT_TEMPLATE } from '../../../shared/documents/constants'
import { AUDIT_CHANNEL, PROJECT_PERMISSION } from '../../../shared/projects/constants'
import { createDocumentPersistence, createDocumentWith } from '../../../server/modules/documents/create-document'
import { moveDocumentPersistence, moveDocumentWith } from '../../../server/modules/documents/move-document'
import { createProjectPersistence } from '../../../server/modules/projects/create-project'
import { createTestDatabase, resetTestDatabase, TEST_DATABASE_URL } from '../../helpers/database'

vi.stubEnv('DATABASE_URL', TEST_DATABASE_URL)

const ownerId = '00000000-0000-4000-8000-000000000031'
const readerId = '00000000-0000-4000-8000-000000000032'

beforeEach(async () => {
  await resetTestDatabase()
  const database = createTestDatabase()
  try {
    await migrate(database.db, { migrationsFolder: 'drizzle' })
    await database.queryClient`
      insert into "user" (id, name, email, email_verified, status) values
      (${ownerId}, 'Owner', 'move-owner@example.com', true, 'active'),
      (${readerId}, 'Reader', 'move-reader@example.com', true, 'active')
    `
  }
  finally {
    await database.close()
  }
})

describe('document tree movement', () => {
  it('moves and reorders active documents while preserving identity and compacting positions', async () => {
    const database = createTestDatabase()
    try {
      const project = await createProjectPersistence(database.db)({
        actorUserId: ownerId,
        channel: AUDIT_CHANNEL.WEB,
        name: 'Movable documentation',
        description: null,
      })
      const create = createDocumentWith({ persist: createDocumentPersistence(database.db) })
      const rootA = await create({ actorUserId: ownerId, projectId: project.projectId, channel: AUDIT_CHANNEL.WEB, title: 'A', parentId: null, template: DOCUMENT_TEMPLATE.BLANK })
      const rootB = await create({ actorUserId: ownerId, projectId: project.projectId, channel: AUDIT_CHANNEL.WEB, title: 'B', parentId: null, template: DOCUMENT_TEMPLATE.BLANK })
      if (!rootA.ok || !rootB.ok) throw new Error('Expected root fixtures')
      const childA = await create({ actorUserId: ownerId, projectId: project.projectId, channel: AUDIT_CHANNEL.WEB, title: 'A1', parentId: rootA.value.documentId, template: DOCUMENT_TEMPLATE.BLANK })
      const childB = await create({ actorUserId: ownerId, projectId: project.projectId, channel: AUDIT_CHANNEL.WEB, title: 'A2', parentId: rootA.value.documentId, template: DOCUMENT_TEMPLATE.BLANK })
      if (!childA.ok || !childB.ok) throw new Error('Expected child fixtures')

      const move = moveDocumentWith({ persist: moveDocumentPersistence(database.db) })
      await expect(move({
        actorUserId: ownerId,
        projectId: project.projectId,
        documentId: childA.value.documentId,
        channel: AUDIT_CHANNEL.WEB,
        targetParentId: rootB.value.documentId,
        targetPosition: 0,
      })).resolves.toMatchObject({ ok: true, value: { parentId: rootB.value.documentId, position: 0 } })

      const rows = await database.queryClient<{
        id: string
        parentId: string | null
        position: number
        draftRevision: number
        slug: string
      }[]>`
        select id, parent_id as "parentId", position, draft_revision as "draftRevision", slug
        from documents where project_id = ${project.projectId}
        order by parent_id nulls first, position
      `
      expect(rows).toEqual(expect.arrayContaining([
        expect.objectContaining({ id: childB.value.documentId, parentId: rootA.value.documentId, position: 0 }),
        expect.objectContaining({ id: childA.value.documentId, parentId: rootB.value.documentId, position: 0, draftRevision: 0, slug: 'a1' }),
      ]))

      await expect(move({
        actorUserId: ownerId,
        projectId: project.projectId,
        documentId: rootB.value.documentId,
        channel: AUDIT_CHANNEL.WEB,
        targetParentId: childA.value.documentId,
        targetPosition: 0,
      })).resolves.toEqual({ ok: false, code: 'INVALID_MOVE' })

      const audit = await database.queryClient<{ metadata: unknown }[]>`
        select metadata from audit_events
        where target_id = ${childA.value.documentId} and action = 'document.moved'
      `
      expect(audit).toHaveLength(1)
      expect(JSON.stringify(audit)).not.toContain('draftContent')
    }
    finally {
      await database.close()
    }
  })

  it('returns the safe not-found result without documents.move', async () => {
    const database = createTestDatabase()
    try {
      const project = await createProjectPersistence(database.db)({ actorUserId: ownerId, channel: AUDIT_CHANNEL.WEB, name: 'Protected tree', description: null })
      const created = await createDocumentWith({ persist: createDocumentPersistence(database.db) })({
        actorUserId: ownerId,
        projectId: project.projectId,
        channel: AUDIT_CHANNEL.WEB,
        title: 'Protected',
        parentId: null,
        template: DOCUMENT_TEMPLATE.BLANK,
      })
      if (!created.ok) throw new Error('Expected document fixture')
      const [role] = await database.queryClient<{ id: string }[]>`
        insert into project_roles (project_id, kind, display_name)
        values (${project.projectId}, 'custom', 'Reader') returning id
      `
      if (!role) throw new Error('Expected role fixture')
      await database.queryClient`
        insert into project_role_permissions (role_id, permission_code) values
        (${role.id}, ${PROJECT_PERMISSION.PROJECT_VIEW}),
        (${role.id}, ${PROJECT_PERMISSION.DOCUMENTS_VIEW})
      `
      await database.queryClient`
        insert into project_memberships (project_id, user_id, role_id)
        values (${project.projectId}, ${readerId}, ${role.id})
      `

      await expect(moveDocumentWith({ persist: moveDocumentPersistence(database.db) })({
        actorUserId: readerId,
        projectId: project.projectId,
        documentId: created.value.documentId,
        channel: AUDIT_CHANNEL.WEB,
        targetParentId: null,
        targetPosition: 0,
      })).resolves.toEqual({ ok: false, code: 'NOT_FOUND' })
    }
    finally {
      await database.close()
    }
  })
})
