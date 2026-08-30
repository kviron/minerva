import { randomBytes } from 'node:crypto'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { beforeEach, expect, it } from 'vitest'
import { AUDIT_CHANNEL } from '../../../shared/projects/constants'
import { createCredentialCategory } from '../../../server/modules/credentials/categories'
import { createCredentialCrypto } from '../../../server/modules/credentials/crypto'
import {
  archiveCredential,
  createCredential,
  listAccessibleArchivedCredentials,
  listAccessibleCredentials,
  revealCredentialSecret,
  searchAccessibleCredentials,
  updateCredential,
} from '../../../server/modules/credentials/credentials'
import { createProjectPersistence } from '../../../server/modules/projects/create-project'
import { createTestDatabase, resetTestDatabase } from '../../helpers/database'

beforeEach(resetTestDatabase)

it('stores encrypted values, returns only masked rows, updates explicitly, and reveals one field', async () => {
  const database = createTestDatabase()
  const crypto = createCredentialCrypto({ activeVersion: 1, keys: new Map([[1, randomBytes(32)]]) })
  try {
    await migrate(database.db, { migrationsFolder: 'drizzle' })
    const [admin] = await database.queryClient<{ id: string }[]>`
      insert into "user" (name, email, email_verified, status)
      values ('Admin', 'records-admin@example.com', true, 'active') returning id
    `
    const { projectId } = await createProjectPersistence(database.db)({
      actorUserId: admin!.id, channel: AUDIT_CHANNEL.WEB, name: 'Secrets', description: null,
    })
    const category = await createCredentialCategory(database.db, {
      actorUserId: admin!.id, channel: AUDIT_CHANNEL.WEB, projectId, name: 'Продакшен', description: null,
    })
    if (!category.ok) throw new Error('Expected category')

    const created = await createCredential(database.db, crypto, {
      actorUserId: admin!.id,
      channel: AUDIT_CHANNEL.WEB,
      projectId,
      categoryId: category.value.categoryId,
      title: ' Админ-панель ',
      login: 'root@example.com',
      updatedBy: { name: 'Admin', avatar: null },
      password: 'initial-password',
      fields: [
        { label: 'URL', type: 'url', value: 'https://admin.example.com' },
        { label: 'Комментарий', type: 'note', value: 'private note' },
      ],
    })
    expect(created.ok).toBe(true)
    if (!created.ok) throw new Error('Expected credential')

    const rows = await listAccessibleCredentials(database.db, crypto, {
      actorUserId: admin!.id, projectId, categoryId: null,
    })
    expect(rows).toEqual([expect.objectContaining({
      id: created.value.credentialId,
      title: 'Админ-панель',
      category: { id: category.value.categoryId, name: 'Продакшен' },
      hasLogin: true,
      hasPassword: true,
      canUpdate: true,
      login: 'root@example.com',
    })])
    expect(JSON.stringify(rows)).not.toMatch(/initial-password|ciphertext|nonce/iu)

    const stored = await database.queryClient`
      select c.*, coalesce(json_agg(f.*) filter (where f.id is not null), '[]') as fields
      from credentials c left join credential_fields f on f.credential_id = c.id
      where c.id = ${created.value.credentialId} group by c.id
    `
    expect(JSON.stringify(stored)).not.toMatch(/root@example|initial-password|admin\.example|private note/iu)

    expect(await revealCredentialSecret(database.db, crypto, {
      actorUserId: admin!.id, projectId, credentialId: created.value.credentialId, target: 'password', channel: AUDIT_CHANNEL.WEB,
    })).toEqual({ ok: true, value: 'initial-password' })

    const dynamicFieldId = rows[0]!.dynamicFields[0]!.id
    expect(await updateCredential(database.db, crypto, {
      actorUserId: admin!.id,
      channel: AUDIT_CHANNEL.WEB,
      projectId,
      credentialId: created.value.credentialId,
      categoryId: category.value.categoryId,
      title: 'Админ-панель 2',
      login: { kind: 'keep' },
      password: { kind: 'replace', value: 'rotated-password' },
      fields: [{ id: dynamicFieldId, label: 'URL', type: 'url', value: { kind: 'keep' } }],
    })).toEqual({ ok: true })
    expect(await revealCredentialSecret(database.db, crypto, {
      actorUserId: admin!.id, projectId, credentialId: created.value.credentialId, target: 'password', channel: AUDIT_CHANNEL.WEB,
    })).toEqual({ ok: true, value: 'rotated-password' })
    expect(await revealCredentialSecret(database.db, crypto, {
      actorUserId: admin!.id, projectId, credentialId: created.value.credentialId, target: `field:${dynamicFieldId}`, channel: AUDIT_CHANNEL.WEB,
    })).toEqual({ ok: true, value: 'https://admin.example.com' })

    for (const query of ['админ-панель', 'root@example', 'URL', 'admin.example.com']) {
      const searchRows = await searchAccessibleCredentials(database.db, crypto, {
        actorUserId: admin!.id, projectId, categoryId: null, query,
      })
      expect(searchRows.map(row => row.id)).toEqual([created.value.credentialId])
      expect(JSON.stringify(searchRows)).not.toMatch(/rotated-password|https:\/\/admin\.example\.com/iu)
    }
    expect(await searchAccessibleCredentials(database.db, crypto, {
      actorUserId: admin!.id, projectId, categoryId: null, query: 'not-found',
    })).toEqual([])

    const audits = await database.queryClient<{ metadata: unknown }[]>`
      select metadata from audit_events where project_id = ${projectId} and action like 'credential.%'
    `
    expect(JSON.stringify(audits)).not.toMatch(/initial-password|rotated-password|root@example|admin\.example|private note/iu)

    expect(await archiveCredential(database.db, {
      actorUserId: admin!.id, channel: AUDIT_CHANNEL.WEB, projectId, credentialId: created.value.credentialId,
    })).toEqual({ ok: true })
    expect(await listAccessibleCredentials(database.db, crypto, { actorUserId: admin!.id, projectId, categoryId: null })).toEqual([])
    const archivedRows = await listAccessibleArchivedCredentials(database.db, { actorUserId: admin!.id, projectId })
    expect(archivedRows).toEqual([expect.objectContaining({
      id: created.value.credentialId,
      category: { id: category.value.categoryId, name: 'Продакшен' },
      hasLogin: true,
      hasPassword: true,
      dynamicFieldCount: 1,
      archivedBy: { name: 'Admin' },
    })])
    expect(JSON.stringify(archivedRows)).not.toMatch(/root@example|rotated-password|ciphertext|nonce/iu)
  } finally {
    await database.close()
  }
})
