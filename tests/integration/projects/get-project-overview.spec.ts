import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AUDIT_CHANNEL, PROJECT_PERMISSION } from '../../../shared/projects/constants'
import { createProjectPersistence } from '../../../server/modules/projects/create-project'
import { getProjectOverviewForUser } from '../../../server/modules/projects/get-project-overview'
import { listMemberProjects } from '../../../server/modules/projects/list-projects'
import { createTestDatabase, resetTestDatabase, TEST_DATABASE_URL } from '../../helpers/database'

vi.stubEnv('DATABASE_URL', TEST_DATABASE_URL)

const ownerId = '00000000-0000-4000-8000-000000000001'
const outsiderId = '00000000-0000-4000-8000-000000000002'

beforeEach(async () => {
  await resetTestDatabase()
  const database = createTestDatabase()
  try {
    await migrate(database.db, { migrationsFolder: 'drizzle' })
    await database.queryClient`
      insert into "user" (id, name, email, email_verified, status) values
      (${ownerId}, 'Owner', 'owner@example.com', true, 'active'),
      (${outsiderId}, 'Outsider', 'outsider@example.com', true, 'active')
    `
  } finally {
    await database.close()
  }
})

describe('getProjectOverviewForUser', () => {
  it('returns only the safe overview for an active member with project.view', async () => {
    const database = createTestDatabase()
    try {
      const created = await createProjectPersistence(database.db)({
        actorUserId: ownerId,
        channel: AUDIT_CHANNEL.WEB,
        name: 'Knowledge base',
        description: 'Project documentation',
      })

      await expect(getProjectOverviewForUser(database.db, created.projectId, ownerId)).resolves.toMatchObject({
        id: created.projectId,
        name: 'Knowledge base',
        description: 'Project documentation',
        activeMemberCount: 1,
        role: { builtInKey: 'admin', customName: null },
        permissions: expect.arrayContaining([PROJECT_PERMISSION.PROJECT_VIEW]),
      })
    } finally {
      await database.close()
    }
  })

  it('does not reveal a project to a user without an active permitted membership', async () => {
    const database = createTestDatabase()
    try {
      const created = await createProjectPersistence(database.db)({
        actorUserId: ownerId,
        channel: AUDIT_CHANNEL.WEB,
        name: 'Private project',
        description: null,
      })

      await expect(getProjectOverviewForUser(database.db, created.projectId, outsiderId)).resolves.toBeNull()
    } finally {
      await database.close()
    }
  })

  it('does not list a project when the active membership role lacks project.view', async () => {
    const database = createTestDatabase()
    try {
      const created = await createProjectPersistence(database.db)({
        actorUserId: ownerId,
        channel: AUDIT_CHANNEL.WEB,
        name: 'Restricted project',
        description: null,
      })
      const [role] = await database.queryClient<{ id: string }[]>`
        insert into project_roles (project_id, kind, display_name)
        values (${created.projectId}, 'custom', 'No project access')
        returning id
      `
      if (!role) throw new Error('Expected custom role')
      await database.queryClient`
        insert into project_memberships (project_id, user_id, role_id, status)
        values (${created.projectId}, ${outsiderId}, ${role.id}, 'active')
      `

      await expect(listMemberProjects(database.db, outsiderId)).resolves.toEqual({ items: [], nextCursor: null })
    } finally {
      await database.close()
    }
  })
})
