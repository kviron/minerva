import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { authorizeProjectAssistant, loadProjectAssistantAccess } from '../../../server/modules/ai-assistant/authorize-project-assistant'
import { PROJECT_PERMISSION } from '../../../shared/projects/constants'
import { createTestDatabase, resetTestDatabase, TEST_DATABASE_URL } from '../../helpers/database'

vi.stubEnv('DATABASE_URL', TEST_DATABASE_URL)

const USER_ID = '00000000-0000-4000-8000-000000000081'
const PROJECT_ID = '00000000-0000-4000-8000-000000000082'
const ROLE_ID = '00000000-0000-4000-8000-000000000083'

beforeEach(async () => {
  await resetTestDatabase()
  const database = createTestDatabase()
  try {
    await migrate(database.db, { migrationsFolder: 'drizzle' })
    await database.queryClient`
      insert into "user" (id, name, email, email_verified, status)
      values (${USER_ID}, 'AI Member', 'ai-member@example.com', true, 'active')
    `
    await database.queryClient`
      insert into projects (id, name, status, created_by_user_id)
      values (${PROJECT_ID}, 'AI Project', 'active', ${USER_ID})
    `
    await database.queryClient`
      insert into project_roles (id, project_id, kind, built_in_key, display_name)
      values (${ROLE_ID}, ${PROJECT_ID}, 'custom', null, 'Custom AI User')
    `
    await database.queryClient`
      insert into project_role_permissions (role_id, permission_code)
      values (${ROLE_ID}, 'project.ai.use')
    `
    await database.queryClient`
      insert into project_memberships (project_id, user_id, role_id, status)
      values (${PROJECT_ID}, ${USER_ID}, ${ROLE_ID}, 'active')
    `
  } finally {
    await database.close()
  }
})

describe('project AI assistant database authorization', () => {
  it('re-evaluates custom permissions, membership, project, and account state server-side', async () => {
    const database = createTestDatabase()
    const authorize = (permission: typeof PROJECT_PERMISSION.PROJECT_AI_USE | typeof PROJECT_PERMISSION.PROJECT_AI_MANAGE) =>
      authorizeProjectAssistant(
        { loadAccess: (projectId, userId) => loadProjectAssistantAccess(database.db, projectId, userId) },
        { projectId: PROJECT_ID, userId: USER_ID, permission },
      )

    try {
      await expect(authorize(PROJECT_PERMISSION.PROJECT_AI_USE)).resolves.toEqual({ allowed: true })
      await expect(authorize(PROJECT_PERMISSION.PROJECT_AI_MANAGE)).resolves.toEqual({ allowed: false, code: 'PERMISSION_DENIED' })

      await database.queryClient`
        insert into project_role_permissions (role_id, permission_code)
        values (${ROLE_ID}, 'project.ai.manage')
      `
      await expect(authorize(PROJECT_PERMISSION.PROJECT_AI_MANAGE)).resolves.toEqual({ allowed: true })

      await database.queryClient`update project_memberships set status = 'removed', removed_at = now() where project_id = ${PROJECT_ID} and user_id = ${USER_ID}`
      await expect(authorize(PROJECT_PERMISSION.PROJECT_AI_USE)).resolves.toEqual({ allowed: false, code: 'PERMISSION_DENIED' })

      await database.queryClient`update project_memberships set status = 'active', removed_at = null where project_id = ${PROJECT_ID} and user_id = ${USER_ID}`
      await database.queryClient`update projects set status = 'archived', archived_at = now(), archived_by_user_id = ${USER_ID} where id = ${PROJECT_ID}`
      await expect(authorize(PROJECT_PERMISSION.PROJECT_AI_USE)).resolves.toEqual({ allowed: false, code: 'PERMISSION_DENIED' })

      await database.queryClient`update projects set status = 'active', archived_at = null, archived_by_user_id = null where id = ${PROJECT_ID}`
      await database.queryClient`update "user" set status = 'disabled', disabled_at = now() where id = ${USER_ID}`
      await expect(authorize(PROJECT_PERMISSION.PROJECT_AI_USE)).resolves.toEqual({ allowed: false, code: 'PERMISSION_DENIED' })
    } finally {
      await database.close()
    }
  })
})
