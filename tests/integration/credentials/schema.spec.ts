import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { beforeEach, expect, it } from 'vitest'
import { createTestDatabase, resetTestDatabase } from '../../helpers/database'

beforeEach(resetTestDatabase)

it('enforces project-scoped credential categories, grants, envelopes, and fields', async () => {
  const database = createTestDatabase()

  try {
    await migrate(database.db, { migrationsFolder: 'drizzle' })

    const [actor, member] = await database.queryClient<{ id: string }[]>`
      insert into "user" (name, email)
      values ('Admin', 'credential-admin@example.com'), ('Member', 'credential-member@example.com')
      returning id
    `
    const [projectA, projectB] = await database.queryClient<{ id: string }[]>`
      insert into projects (name, created_by_user_id)
      values ('Project A', ${actor!.id}), ('Project B', ${actor!.id})
      returning id
    `
    const [roleA, roleB] = await database.queryClient<{ id: string }[]>`
      insert into project_roles (project_id, kind, built_in_key, display_name)
      values (${projectA!.id}, 'built_in', 'admin', 'Admin'), (${projectB!.id}, 'built_in', 'viewer', 'Viewer')
      returning id
    `
    const [membershipB] = await database.queryClient<{ id: string }[]>`
      insert into project_memberships (project_id, user_id, role_id)
      values (${projectB!.id}, ${member!.id}, ${roleB!.id})
      returning id
    `

    const [{ count }] = await database.queryClient<{ count: number }[]>`
      select count(*)::int as count from credential_categories
    `
    expect(count).toBe(0)

    const [categoryA] = await database.queryClient<{ id: string }[]>`
      insert into credential_categories (project_id, name, normalized_name, created_by_user_id)
      values (${projectA!.id}, 'Продакшен', 'продакшен', ${actor!.id})
      returning id
    `

    await expect(database.queryClient`
      insert into credential_category_role_grants (project_id, category_id, role_id, created_by_user_id)
      values (${projectA!.id}, ${categoryA!.id}, ${roleB!.id}, ${actor!.id})
    `).rejects.toThrow()
    await expect(database.queryClient`
      insert into credential_category_member_grants (project_id, category_id, membership_id, created_by_user_id)
      values (${projectA!.id}, ${categoryA!.id}, ${membershipB!.id}, ${actor!.id})
    `).rejects.toThrow()

    await expect(database.queryClient`
      insert into credentials (project_id, category_id, title, login_ciphertext, created_by_user_id, updated_by_user_id)
      values (${projectA!.id}, ${categoryA!.id}, 'Broken envelope', 'ciphertext', ${actor!.id}, ${actor!.id})
    `).rejects.toThrow()

    const [credential] = await database.queryClient<{ id: string }[]>`
      insert into credentials (project_id, category_id, title, password_ciphertext, password_nonce, password_key_version, created_by_user_id, updated_by_user_id)
      values (${projectA!.id}, ${categoryA!.id}, 'Admin panel', 'ciphertext', 'nonce', 1, ${actor!.id}, ${actor!.id})
      returning id
    `
    await expect(database.queryClient`
      insert into credential_fields (credential_id, label, type, position, ciphertext, nonce, key_version)
      values (${credential!.id}, 'Invalid', 'binary', 0, 'ciphertext', 'nonce', 1)
    `).rejects.toThrow()
    await database.queryClient`
      insert into credential_fields (credential_id, label, type, position, ciphertext, nonce, key_version)
      values (${credential!.id}, 'URL', 'url', 0, 'ciphertext', 'nonce', 1)
    `
    await expect(database.queryClient`
      insert into credential_fields (credential_id, label, type, position, ciphertext, nonce, key_version)
      values (${credential!.id}, 'Duplicate position', 'text', 0, 'ciphertext', 'nonce', 1)
    `).rejects.toThrow()

    expect(roleA).toBeDefined()
  } finally {
    await database.close()
  }
})
