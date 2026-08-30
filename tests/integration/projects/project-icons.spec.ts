import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AUDIT_CHANNEL } from '../../../shared/projects/constants'
import type { PrivateObjectStorage } from '../../../server/infrastructure/storage/s3-private-objects'
import { createProjectPersistence } from '../../../server/modules/projects/create-project'
import {
  deleteProjectIconWith,
  readProjectIconWith,
  uploadProjectIconWith,
} from '../../../server/modules/projects/project-icons'
import { listMemberProjects } from '../../../server/modules/projects/list-projects'
import { createTestDatabase, resetTestDatabase, TEST_DATABASE_URL } from '../../helpers/database'

vi.stubEnv('DATABASE_URL', TEST_DATABASE_URL)

const ownerId = '00000000-0000-4000-8000-000000000061'
const firstIconId = '00000000-0000-4000-8000-000000000062'
const secondIconId = '00000000-0000-4000-8000-000000000063'
const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1])

beforeEach(async () => {
  await resetTestDatabase()
  const database = createTestDatabase()
  try {
    await migrate(database.db, { migrationsFolder: 'drizzle' })
    await database.queryClient`
      insert into "user" (id, name, email, email_verified, status)
      values (${ownerId}, 'Owner', 'project-icon-owner@example.com', true, 'active')
    `
  }
  finally {
    await database.close()
  }
})

describe('project icon storage boundary', () => {
  it('replaces private objects, projects only the icon id, and removes the current icon', async () => {
    const objects = new Map<string, { bytes: Buffer, mimeType: string }>()
    const storage: PrivateObjectStorage = {
      put: async (key, bytes, mimeType) => { objects.set(key, { bytes, mimeType }) },
      get: async key => objects.get(key) ?? null,
      remove: async key => { objects.delete(key) },
    }
    const database = createTestDatabase()
    try {
      const project = await createProjectPersistence(database.db)({
        actorUserId: ownerId,
        channel: AUDIT_CHANNEL.WEB,
        name: 'Icon project',
        description: null,
      })

      const first = await uploadProjectIconWith(database.db, storage, () => firstIconId)({
        actorUserId: ownerId,
        projectId: project.projectId,
        channel: AUDIT_CHANNEL.WEB,
        mimeType: 'image/png',
        bytes: png,
      })
      expect(first).toEqual({ ok: true, value: { iconId: firstIconId } })
      expect((await listMemberProjects(database.db, ownerId)).items[0]?.iconId).toBe(firstIconId)
      await expect(readProjectIconWith(database.db, storage)({
        actorUserId: ownerId,
        projectId: project.projectId,
      })).resolves.toEqual({ bytes: png, mimeType: 'image/png' })

      const second = await uploadProjectIconWith(database.db, storage, () => secondIconId)({
        actorUserId: ownerId,
        projectId: project.projectId,
        channel: AUDIT_CHANNEL.WEB,
        mimeType: 'image/png',
        bytes: png,
      })
      expect(second).toEqual({ ok: true, value: { iconId: secondIconId } })
      expect([...objects.keys()]).toEqual([`projects/${project.projectId}/icons/${secondIconId}`])

      await expect(deleteProjectIconWith(database.db, storage)({
        actorUserId: ownerId,
        projectId: project.projectId,
        channel: AUDIT_CHANNEL.WEB,
      })).resolves.toEqual({ ok: true, value: { iconId: null } })
      expect(objects.size).toBe(0)
      expect((await listMemberProjects(database.db, ownerId)).items[0]?.iconId).toBeNull()

      const audits = await database.queryClient<{ action: string, metadata: unknown }[]>`
        select action, metadata from audit_events
        where project_id = ${project.projectId} and action like 'project.icon_%'
        order by created_at
      `
      expect(audits.map(event => event.action)).toEqual([
        'project.icon_updated',
        'project.icon_updated',
        'project.icon_removed',
      ])
      expect(JSON.stringify(audits)).not.toContain('object_key')
    }
    finally {
      await database.close()
    }
  })
})
