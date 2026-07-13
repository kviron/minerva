import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { beforeEach, expect, it } from 'vitest'
import { AUDIT_CHANNEL } from '../../../shared/projects/constants'
import {
  createCredentialCategory,
  archiveCredentialCategory,
  listAccessibleCredentialCategories,
  replaceCredentialCategoryGrants,
  updateCredentialCategory,
} from '../../../server/modules/credentials/categories'
import { createProjectPersistence } from '../../../server/modules/projects/create-project'
import { createTestDatabase, resetTestDatabase } from '../../helpers/database'

beforeEach(resetTestDatabase)

it('combines Admin, role, and individual category access and revokes it immediately', async () => {
  const database = createTestDatabase()
  try {
    await migrate(database.db, { migrationsFolder: 'drizzle' })
    const users = await database.queryClient<{ id: string }[]>`
      insert into "user" (name, email, email_verified, status) values
      ('Admin', 'acl-admin@example.com', true, 'active'),
      ('Viewer', 'acl-viewer@example.com', true, 'active'),
      ('Selected', 'acl-selected@example.com', true, 'active'),
      ('Other', 'acl-other@example.com', true, 'active')
      returning id
    `
    const [admin, viewer, selected, other] = users
    const { projectId } = await createProjectPersistence(database.db)({
      actorUserId: admin!.id,
      channel: AUDIT_CHANNEL.WEB,
      name: 'ACL project',
      description: null,
    })
    const roles = await database.queryClient<{ id: string, built_in_key: string }[]>`
      select id, built_in_key from project_roles where project_id = ${projectId}
    `
    const viewerRole = roles.find(role => role.built_in_key === 'viewer')!
    const editorRole = roles.find(role => role.built_in_key === 'editor')!
    await database.queryClient`
      insert into project_role_permissions (role_id, permission_code)
      values (${viewerRole.id}, 'credentials.view'), (${editorRole.id}, 'credentials.view')
    `
    const memberships = await database.queryClient<{ id: string, user_id: string }[]>`
      insert into project_memberships (project_id, user_id, role_id) values
      (${projectId}, ${viewer!.id}, ${viewerRole.id}),
      (${projectId}, ${selected!.id}, ${editorRole.id}),
      (${projectId}, ${other!.id}, ${editorRole.id})
      returning id, user_id
    `

    const created = await createCredentialCategory(database.db, {
      actorUserId: admin!.id,
      channel: AUDIT_CHANNEL.WEB,
      projectId,
      name: ' Продакшен ',
      description: ' Основной контур ',
    })
    expect(created.ok).toBe(true)
    if (!created.ok) throw new Error('Expected category creation')

    expect(await listAccessibleCredentialCategories(database.db, { actorUserId: admin!.id, projectId }))
      .toEqual([expect.objectContaining({ id: created.value.categoryId, name: 'Продакшен' })])
    expect(await listAccessibleCredentialCategories(database.db, { actorUserId: viewer!.id, projectId })).toEqual([])

    const replaced = await replaceCredentialCategoryGrants(database.db, {
      actorUserId: admin!.id,
      channel: AUDIT_CHANNEL.WEB,
      projectId,
      categoryId: created.value.categoryId,
      roleIds: [viewerRole.id],
      membershipIds: [memberships.find(row => row.user_id === selected!.id)!.id],
    })
    expect(replaced).toEqual({ ok: true })

    expect(await listAccessibleCredentialCategories(database.db, { actorUserId: viewer!.id, projectId })).toHaveLength(1)
    expect(await listAccessibleCredentialCategories(database.db, { actorUserId: selected!.id, projectId })).toHaveLength(1)
    expect(await listAccessibleCredentialCategories(database.db, { actorUserId: other!.id, projectId })).toEqual([])

    expect(await replaceCredentialCategoryGrants(database.db, {
      actorUserId: admin!.id,
      channel: AUDIT_CHANNEL.WEB,
      projectId,
      categoryId: created.value.categoryId,
      roleIds: [],
      membershipIds: [],
    })).toEqual({ ok: true })
    expect(await listAccessibleCredentialCategories(database.db, { actorUserId: viewer!.id, projectId })).toEqual([])
    expect(await listAccessibleCredentialCategories(database.db, { actorUserId: selected!.id, projectId })).toEqual([])

    expect(await updateCredentialCategory(database.db, {
      actorUserId: admin!.id,
      channel: AUDIT_CHANNEL.WEB,
      projectId,
      categoryId: created.value.categoryId,
      name: 'Production',
      description: null,
    })).toEqual({ ok: true })
    expect(await listAccessibleCredentialCategories(database.db, { actorUserId: admin!.id, projectId }))
      .toEqual([expect.objectContaining({ name: 'Production', description: null })])

    expect(await archiveCredentialCategory(database.db, {
      actorUserId: admin!.id,
      channel: AUDIT_CHANNEL.WEB,
      projectId,
      categoryId: created.value.categoryId,
    })).toEqual({ ok: true })
    expect(await listAccessibleCredentialCategories(database.db, { actorUserId: admin!.id, projectId })).toEqual([])

    const audits = await database.queryClient<{ action: string, metadata: unknown }[]>`
      select action, metadata from audit_events
      where project_id = ${projectId} and action like 'credential_category.%'
      order by created_at, action
    `
    expect(audits.map(row => row.action)).toEqual(expect.arrayContaining([
      'credential_category.created',
      'credential_category.access_replaced',
      'credential_category.updated',
      'credential_category.archived',
    ]))
    expect(JSON.stringify(audits)).not.toContain(viewer!.id)
    expect(JSON.stringify(audits)).not.toContain(selected!.id)
  } finally {
    await database.close()
  }
})

it('rejects cross-project grant subjects without partially replacing grants', async () => {
  const database = createTestDatabase()
  try {
    await migrate(database.db, { migrationsFolder: 'drizzle' })
    const [admin] = await database.queryClient<{ id: string }[]>`
      insert into "user" (name, email, email_verified, status)
      values ('Admin', 'cross-admin@example.com', true, 'active') returning id
    `
    const persist = createProjectPersistence(database.db)
    const projectA = await persist({ actorUserId: admin!.id, channel: AUDIT_CHANNEL.WEB, name: 'A', description: null })
    const projectB = await persist({ actorUserId: admin!.id, channel: AUDIT_CHANNEL.WEB, name: 'B', description: null })
    const [foreignRole] = await database.queryClient<{ id: string }[]>`
      select id from project_roles where project_id = ${projectB.projectId} limit 1
    `
    const category = await createCredentialCategory(database.db, {
      actorUserId: admin!.id, channel: AUDIT_CHANNEL.WEB, projectId: projectA.projectId, name: 'Prod', description: null,
    })
    if (!category.ok) throw new Error('Expected category creation')

    expect(await replaceCredentialCategoryGrants(database.db, {
      actorUserId: admin!.id,
      channel: AUDIT_CHANNEL.WEB,
      projectId: projectA.projectId,
      categoryId: category.value.categoryId,
      roleIds: [foreignRole!.id],
      membershipIds: [],
    })).toEqual({ ok: false, code: 'INVALID_GRANT_SUBJECT' })

    const [{ count }] = await database.queryClient<{ count: number }[]>`
      select count(*)::int as count from credential_category_role_grants where category_id = ${category.value.categoryId}
    `
    expect(count).toBe(0)
  } finally {
    await database.close()
  }
})
