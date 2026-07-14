import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AUDIT_CHANNEL } from '../../../shared/projects/constants'
import type { DocumentImageStorage } from '../../../server/infrastructure/storage/s3-document-images'
import { readDocumentImageWith, uploadDocumentImageWith } from '../../../server/modules/files/document-images'
import { createProjectPersistence } from '../../../server/modules/projects/create-project'
import { createTestDatabase, resetTestDatabase, TEST_DATABASE_URL } from '../../helpers/database'

vi.stubEnv('DATABASE_URL', TEST_DATABASE_URL)

const ownerId = '00000000-0000-4000-8000-000000000031'

beforeEach(async () => {
  await resetTestDatabase()
  const database = createTestDatabase()
  try {
    await migrate(database.db, { migrationsFolder: 'drizzle' })
    await database.queryClient`
      insert into "user" (id, name, email, email_verified, status)
      values (${ownerId}, 'Owner', 'image-owner@example.com', true, 'active')
    `
  }
  finally {
    await database.close()
  }
})

describe('document image storage boundary', () => {
  it('stores private metadata and serves bytes only through project authorization', async () => {
    const objects = new Map<string, { bytes: Buffer, mimeType: string }>()
    const storage: DocumentImageStorage = {
      put: async (key, bytes, mimeType) => { objects.set(key, { bytes, mimeType }) },
      get: async key => objects.get(key) ?? null,
      remove: async key => { objects.delete(key) },
    }
    const database = createTestDatabase()
    try {
      const project = await createProjectPersistence(database.db)({
        actorUserId: ownerId,
        channel: AUDIT_CHANNEL.WEB,
        name: 'Image project',
        description: null,
      })
      const otherProject = await createProjectPersistence(database.db)({
        actorUserId: ownerId,
        channel: AUDIT_CHANNEL.WEB,
        name: 'Other image project',
        description: null,
      })
      const bytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
      const uploaded = await uploadDocumentImageWith(database.db, storage)({
        actorUserId: ownerId,
        projectId: project.projectId,
        channel: AUDIT_CHANNEL.WEB,
        filename: 'diagram.png',
        mimeType: 'image/png',
        bytes,
      })
      expect(uploaded).toMatchObject({ ok: true, value: { filename: 'diagram.png', byteSize: 8 } })
      if (!uploaded.ok) throw new Error('Expected upload')

      await expect(readDocumentImageWith(database.db, storage)({
        actorUserId: ownerId,
        projectId: project.projectId,
        imageId: uploaded.value.id,
      })).resolves.toMatchObject({ bytes, mimeType: 'image/png', filename: 'diagram.png' })
      await expect(readDocumentImageWith(database.db, storage)({
        actorUserId: ownerId,
        projectId: otherProject.projectId,
        imageId: uploaded.value.id,
      })).resolves.toBeNull()

      const metadata = await database.queryClient<{ objectKey: string }[]>`
        select object_key as "objectKey" from document_images where id = ${uploaded.value.id}
      `
      expect(metadata[0]?.objectKey).toContain(project.projectId)
      expect(JSON.stringify(uploaded.value)).not.toContain(metadata[0]?.objectKey)
    }
    finally {
      await database.close()
    }
  })
})
