import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AUDIT_CHANNEL } from '../../../shared/projects/constants'
import { createProjectPersistence } from '../../../server/modules/projects/create-project'
import { updateProjectDescriptionWith } from '../../../server/modules/projects/project-description'
import { getProjectOverviewForUser } from '../../../server/modules/projects/get-project-overview'
import { listMemberProjects } from '../../../server/modules/projects/list-projects'
import { createTestDatabase, resetTestDatabase, TEST_DATABASE_URL } from '../../helpers/database'

vi.stubEnv('DATABASE_URL', TEST_DATABASE_URL)
const ownerId = '00000000-0000-4000-8000-000000000071'
const outsiderId = '00000000-0000-4000-8000-000000000072'

beforeEach(async () => {
  await resetTestDatabase()
  const database = createTestDatabase()
  try {
    await migrate(database.db, { migrationsFolder: 'drizzle' })
    await database.queryClient`
      insert into "user" (id, name, email, email_verified, status) values
      (${ownerId}, 'Owner', 'description-owner@example.com', true, 'active'),
      (${outsiderId}, 'Outsider', 'description-outsider@example.com', true, 'active')
    `
  } finally { await database.close() }
})

describe('project description update', () => {
  it('stores rich content, derives plain text, audits, and enforces project.update', async () => {
    const database = createTestDatabase()
    try {
      const created = await createProjectPersistence(database.db)({
        actorUserId: ownerId, channel: AUDIT_CHANNEL.WEB, name: 'Minerva', description: null,
      })
      const content = { type: 'doc' as const, content: [{ type: 'paragraph', content: [
        { type: 'text', text: 'Project ', marks: [{ type: 'bold' }] }, { type: 'text', text: 'knowledge' },
      ] }] }
      await expect(updateProjectDescriptionWith(database.db)({
        actorUserId: outsiderId, projectId: created.projectId, channel: AUDIT_CHANNEL.WEB, content,
      })).resolves.toEqual({ ok: false, code: 'NOT_FOUND' })
      await expect(updateProjectDescriptionWith(database.db)({
        actorUserId: ownerId, projectId: created.projectId, channel: AUDIT_CHANNEL.WEB, content,
      })).resolves.toMatchObject({ ok: true, value: { description: 'Project knowledge', descriptionContent: content } })
      expect((await listMemberProjects(database.db, ownerId)).items[0]?.description).toBe('Project knowledge')
      await expect(getProjectOverviewForUser(database.db, created.projectId, ownerId)).resolves.toMatchObject({ descriptionContent: content })
      const audits = await database.queryClient<{ action: string }[]>`
        select action from audit_events where project_id = ${created.projectId} and action = 'project.description_updated'
      `
      expect(audits).toEqual([{ action: 'project.description_updated' }])
    } finally { await database.close() }
  })
})
