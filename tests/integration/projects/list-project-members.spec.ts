import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AUDIT_CHANNEL, MEMBERSHIP_STATUS, PROJECT_ROLE_KEY } from '../../../shared/projects/constants'
import { createProjectPersistence } from '../../../server/modules/projects/create-project'
import { listProjectMembersWith } from '../../../server/modules/projects/list-project-members'
import { createTestDatabase, resetTestDatabase, TEST_DATABASE_URL } from '../../helpers/database'

vi.stubEnv('DATABASE_URL', TEST_DATABASE_URL)
const ownerId = '00000000-0000-4000-8000-000000000081'
const memberId = '00000000-0000-4000-8000-000000000082'
const outsiderId = '00000000-0000-4000-8000-000000000083'

beforeEach(async () => {
  await resetTestDatabase()
  const database = createTestDatabase()
  try {
    await migrate(database.db, { migrationsFolder: 'drizzle' })
    await database.queryClient`
      insert into "user" (id, name, email, email_verified, status) values
      (${ownerId}, 'Owner', 'members-owner@example.com', true, 'active'),
      (${memberId}, 'Editor', 'members-editor@example.com', true, 'active'),
      (${outsiderId}, 'Outsider', 'members-outsider@example.com', true, 'active')
    `
  } finally { await database.close() }
})

describe('project member list', () => {
  it('returns active members with safe role projections only to members.view actors', async () => {
    const database = createTestDatabase()
    try {
      const project = await createProjectPersistence(database.db)({
        actorUserId: ownerId, channel: AUDIT_CHANNEL.WEB, name: 'Members', description: null,
      })
      const [editorRole] = await database.queryClient<{ id: string }[]>`
        select id from project_roles where project_id = ${project.projectId} and built_in_key = ${PROJECT_ROLE_KEY.EDITOR}
      `
      if (!editorRole) throw new Error('Expected editor role')
      await database.queryClient`
        insert into project_memberships (project_id, user_id, role_id, status)
        values (${project.projectId}, ${memberId}, ${editorRole.id}, ${MEMBERSHIP_STATUS.ACTIVE})
      `
      await expect(listProjectMembersWith(database.db, project.projectId, ownerId)).resolves.toEqual(expect.arrayContaining([
        expect.objectContaining({ id: ownerId, email: 'members-owner@example.com', role: { builtInKey: 'admin', customName: null } }),
        expect.objectContaining({ id: memberId, email: 'members-editor@example.com', role: { builtInKey: 'editor', customName: null } }),
      ]))
      await expect(listProjectMembersWith(database.db, project.projectId, outsiderId)).resolves.toBeNull()
    } finally { await database.close() }
  })
})
