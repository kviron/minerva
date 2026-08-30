import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { createTestDatabase, resetTestDatabase, TEST_DATABASE_URL } from '../../helpers/database'

vi.stubEnv('DATABASE_URL', TEST_DATABASE_URL)

beforeEach(async () => {
  await resetTestDatabase()
})

const journalSchema = z.object({
  version: z.string(),
  dialect: z.string(),
  entries: z.array(z.object({
    idx: z.number().int(),
    version: z.string(),
    when: z.number(),
    tag: z.string(),
    breakpoints: z.boolean(),
  }).strict()),
}).strict()

const migrateThroughDocumentPublicShares = async (database: ReturnType<typeof createTestDatabase>) => {
  const temporaryRoot = await mkdtemp(join(tmpdir(), 'minerva-lifecycle-migrations-'))
  const migrationFolder = join(temporaryRoot, 'drizzle')
  await cp('drizzle', migrationFolder, { recursive: true })
  const journalPath = join(migrationFolder, 'meta', '_journal.json')
  const journal = journalSchema.parse(JSON.parse(await readFile(journalPath, 'utf8')))
  await writeFile(journalPath, JSON.stringify({
    ...journal,
    entries: journal.entries.filter(entry => entry.idx <= 20),
  }, null, 2))

  try {
    await migrate(database.db, { migrationsFolder: migrationFolder })
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true })
  }
}

describe('project lifecycle migration', () => {
  it('adds current-state metadata and immutable lifecycle history storage', async () => {
    const database = createTestDatabase()
    try {
      await migrate(database.db, { migrationsFolder: 'drizzle' })
      const projectColumns = await database.queryClient<{ column_name: string }[]>`
        select column_name
        from information_schema.columns
        where table_schema = 'public' and table_name = 'projects'
        order by column_name
      `
      expect(projectColumns.map(column => column.column_name)).toEqual(expect.arrayContaining([
        'lifecycle_revision',
        'status_changed_at',
        'status_changed_by_user_id',
      ]))

      const [historyTable] = await database.queryClient<{ table_name: string }[]>`
        select table_name
        from information_schema.tables
        where table_schema = 'public' and table_name = 'project_lifecycle_events'
      `
      expect(historyTable?.table_name).toBe('project_lifecycle_events')
    } finally {
      await database.close()
    }
  })

  it('fails with a stable preflight code when legacy archive metadata is inconsistent', async () => {
    const database = createTestDatabase()
    try {
      await migrateThroughDocumentPublicShares(database)
      await database.queryClient`
        insert into "user" (id, name, email, email_verified, status)
        values ('00000000-0000-4000-8000-000000000051', 'Legacy owner', 'legacy-owner@example.com', true, 'active')
      `
      await database.queryClient`
        insert into projects (
          id, name, status, created_by_user_id, archived_at, archived_by_user_id
        ) values (
          '00000000-0000-4000-8000-000000000052',
          'Inconsistent legacy project',
          'active',
          '00000000-0000-4000-8000-000000000051',
          now(),
          '00000000-0000-4000-8000-000000000051'
        )
      `

      await expect(migrate(database.db, { migrationsFolder: 'drizzle' }))
        .rejects.toThrow('MINERVA_PROJECT_LIFECYCLE_PREFLIGHT_FAILED')
    } finally {
      await database.close()
    }
  })

  it('backfills legacy metadata and grants new permissions only to built-in admins', async () => {
    const database = createTestDatabase()
    try {
      await migrateThroughDocumentPublicShares(database)
      await database.queryClient`
        insert into "user" (id, name, email, email_verified, status)
        values
          ('00000000-0000-4000-8000-000000000061', 'Legacy owner', 'legacy-owner-2@example.com', true, 'active'),
          ('00000000-0000-4000-8000-000000000062', 'Legacy archiver', 'legacy-archiver@example.com', true, 'active')
      `
      await database.queryClient`
        insert into projects (
          id, name, status, created_by_user_id, created_at, archived_at, archived_by_user_id
        ) values
          (
            '00000000-0000-4000-8000-000000000063', 'Legacy active', 'active',
            '00000000-0000-4000-8000-000000000061', '2026-01-01T10:00:00Z', null, null
          ),
          (
            '00000000-0000-4000-8000-000000000064', 'Legacy archived', 'archived',
            '00000000-0000-4000-8000-000000000061', '2026-01-02T10:00:00Z',
            '2026-02-01T12:00:00Z', '00000000-0000-4000-8000-000000000062'
          )
      `
      await database.queryClient`
        insert into project_roles (id, project_id, kind, built_in_key, display_name)
        values
          ('00000000-0000-4000-8000-000000000065', '00000000-0000-4000-8000-000000000063', 'built_in', 'admin', 'Admin'),
          ('00000000-0000-4000-8000-000000000066', '00000000-0000-4000-8000-000000000063', 'built_in', 'editor', 'Editor'),
          ('00000000-0000-4000-8000-000000000067', '00000000-0000-4000-8000-000000000063', 'custom', null, 'Custom')
      `

      await migrate(database.db, { migrationsFolder: 'drizzle' })

      const projects = await database.queryClient<{
        id: string
        lifecycle_revision: number
        status_changed_at: string
        status_changed_by_user_id: string
      }[]>`
        select id, lifecycle_revision, status_changed_at::text, status_changed_by_user_id
        from projects
        order by id
      `
      expect(projects).toEqual([
        {
          id: '00000000-0000-4000-8000-000000000063',
          lifecycle_revision: 0,
          status_changed_at: '2026-01-01 10:00:00+00',
          status_changed_by_user_id: '00000000-0000-4000-8000-000000000061',
        },
        {
          id: '00000000-0000-4000-8000-000000000064',
          lifecycle_revision: 0,
          status_changed_at: '2026-02-01 12:00:00+00',
          status_changed_by_user_id: '00000000-0000-4000-8000-000000000062',
        },
      ])

      const permissions = await database.queryClient<{ built_in_key: string | null, permission_code: string }[]>`
        select roles.built_in_key, permissions.permission_code
        from project_role_permissions permissions
        join project_roles roles on roles.id = permissions.role_id
        where permissions.permission_code in ('project.pause', 'project.resume', 'project.close', 'project.reopen')
        order by permissions.permission_code
      `
      expect(permissions).toEqual([
        { built_in_key: 'admin', permission_code: 'project.close' },
        { built_in_key: 'admin', permission_code: 'project.pause' },
        { built_in_key: 'admin', permission_code: 'project.reopen' },
        { built_in_key: 'admin', permission_code: 'project.resume' },
      ])
    } finally {
      await database.close()
    }
  })

  it('enforces archive consistency and immutable-event invariants in PostgreSQL', async () => {
    const database = createTestDatabase()
    try {
      await migrate(database.db, { migrationsFolder: 'drizzle' })
      await database.queryClient`
        insert into "user" (id, name, email, email_verified, status)
        values ('00000000-0000-4000-8000-000000000071', 'Constraint actor', 'constraint-actor@example.com', true, 'active')
      `
      await database.queryClient`
        insert into projects (id, name, created_by_user_id)
        values ('00000000-0000-4000-8000-000000000072', 'Constrained project',
          '00000000-0000-4000-8000-000000000071')
      `
      const [initialMetadata] = await database.queryClient<{ status_changed_by_user_id: string }[]>`
        select status_changed_by_user_id from projects where id = '00000000-0000-4000-8000-000000000072'
      `
      expect(initialMetadata).toEqual({ status_changed_by_user_id: '00000000-0000-4000-8000-000000000071' })
      await expect(database.queryClient`
        update projects set archived_at = now() where id = '00000000-0000-4000-8000-000000000072'
      `).rejects.toThrow()
      await expect(database.queryClient`
        insert into project_lifecycle_events (
          project_id, transition, previous_state, next_state, revision, actor_user_id, channel, transition_id
        ) values (
          '00000000-0000-4000-8000-000000000072', 'resume', 'active', 'paused', 1,
          '00000000-0000-4000-8000-000000000071', 'api', '00000000-0000-4000-8000-000000000073'
        )
      `).rejects.toThrow()
      await expect(database.queryClient`
        insert into project_lifecycle_events (
          project_id, transition, previous_state, next_state, revision, reason, actor_user_id, channel, transition_id
        ) values (
          '00000000-0000-4000-8000-000000000072', 'pause', 'active', 'paused', 1, ' ',
          '00000000-0000-4000-8000-000000000071', 'api', '00000000-0000-4000-8000-000000000074'
        )
      `).rejects.toThrow()
      await database.queryClient`
        insert into project_lifecycle_events (
          project_id, transition, previous_state, next_state, revision, actor_user_id, channel, transition_id
        ) values (
          '00000000-0000-4000-8000-000000000072', 'pause', 'active', 'paused', 1,
          '00000000-0000-4000-8000-000000000071', 'api', '00000000-0000-4000-8000-000000000075'
        )
      `
      await expect(database.queryClient`
        insert into project_lifecycle_events (
          project_id, transition, previous_state, next_state, revision, actor_user_id, channel, transition_id
        ) values (
          '00000000-0000-4000-8000-000000000072', 'pause', 'active', 'paused', 1,
          '00000000-0000-4000-8000-000000000071', 'api', '00000000-0000-4000-8000-000000000076'
        )
      `).rejects.toThrow()
      await expect(database.queryClient`
        insert into project_lifecycle_events (
          project_id, transition, previous_state, next_state, revision, actor_user_id, channel, transition_id
        ) values (
          '00000000-0000-4000-8000-000000000072', 'resume', 'paused', 'active', 2,
          '00000000-0000-4000-8000-000000000071', 'api', '00000000-0000-4000-8000-000000000075'
        )
      `).rejects.toThrow()
    } finally {
      await database.close()
    }
  })
})
