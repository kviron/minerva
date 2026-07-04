import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { beforeEach, expect, it } from 'vitest'
import { createTestDatabase, resetTestDatabase } from '../../helpers/database'

beforeEach(resetTestDatabase)

it('creates the Better Auth identity tables', async () => {
  const database = createTestDatabase()

  try {
    await migrate(database.db, { migrationsFolder: 'drizzle' })

    const tables = await database.queryClient<{ table_name: string }[]>`
      select table_name
      from information_schema.tables
      where table_schema = 'public'
    `

    expect(tables.map(table => table.table_name)).toEqual(expect.arrayContaining([
      'user',
      'account',
      'session',
      'verification',
      'rate_limit',
    ]))
  } finally {
    await database.close()
  }
})

it('creates the projects RBAC tables and integrity constraints idempotently', async () => {
  const database = createTestDatabase()

  try {
    await migrate(database.db, { migrationsFolder: 'drizzle' })
    await migrate(database.db, { migrationsFolder: 'drizzle' })

    const tables = await database.queryClient<{ table_name: string }[]>`
      select table_name
      from information_schema.tables
      where table_schema = 'public'
    `

    expect(tables.map(table => table.table_name)).toEqual(expect.arrayContaining([
      'projects',
      'project_roles',
      'project_role_permissions',
      'project_memberships',
      'audit_events',
    ]))

    const uniqueConstraints = await database.queryClient<{ table_name: string, columns: string[] }[]>`
      select tc.table_name, array_agg(kcu.column_name order by kcu.ordinal_position)::text[] as columns
      from information_schema.table_constraints tc
      join information_schema.key_column_usage kcu
        on kcu.constraint_schema = tc.constraint_schema
       and kcu.constraint_name = tc.constraint_name
      where tc.constraint_schema = 'public'
        and tc.constraint_type = 'UNIQUE'
        and tc.table_name in ('project_roles', 'project_role_permissions', 'project_memberships')
      group by tc.table_name, tc.constraint_name
    `

    expect(uniqueConstraints).toEqual(expect.arrayContaining([
      { table_name: 'project_roles', columns: ['id', 'project_id'] },
      { table_name: 'project_role_permissions', columns: ['role_id', 'permission_code'] },
      { table_name: 'project_memberships', columns: ['project_id', 'user_id'] },
    ]))

    const builtInRoleIndex = await database.queryClient<{ indexdef: string }[]>`
      select indexdef
      from pg_indexes
      where schemaname = 'public'
        and indexname = 'project_roles_project_id_built_in_key_unique'
    `

    expect(builtInRoleIndex).toHaveLength(1)
    expect(builtInRoleIndex[0]?.indexdef).toContain('UNIQUE INDEX')
    expect(builtInRoleIndex[0]?.indexdef).toContain('WHERE (built_in_key IS NOT NULL)')

    const enumChecks = await database.queryClient<{ constraint_name: string }[]>`
      select constraint_name
      from information_schema.table_constraints
      where constraint_schema = 'public'
        and constraint_type = 'CHECK'
        and constraint_name in (
          'projects_status_check',
          'project_roles_kind_check',
          'project_roles_built_in_key_check',
          'project_role_permissions_permission_code_check',
          'project_memberships_status_check',
          'audit_events_channel_check',
          'audit_events_outcome_check'
        )
    `

    expect(enumChecks).toHaveLength(7)

    const membershipRoleForeignKey = await database.queryClient<{ delete_rule: string }[]>`
      select rc.delete_rule
      from information_schema.referential_constraints rc
      join information_schema.table_constraints tc
        on tc.constraint_schema = rc.constraint_schema
       and tc.constraint_name = rc.constraint_name
      join information_schema.key_column_usage kcu
        on kcu.constraint_schema = tc.constraint_schema
       and kcu.constraint_name = tc.constraint_name
      where tc.table_schema = 'public'
        and tc.table_name = 'project_memberships'
        and tc.constraint_type = 'FOREIGN KEY'
      group by tc.constraint_name, rc.delete_rule
      having array_agg(kcu.column_name order by kcu.ordinal_position)::text[] = array['role_id', 'project_id']::text[]
    `

    expect(membershipRoleForeignKey).toEqual([{ delete_rule: 'RESTRICT' }])

    const indexes = await database.queryClient<{ indexname: string }[]>`
      select indexname
      from pg_indexes
      where schemaname = 'public'
        and indexname in (
          'projects_status_idx',
          'projects_created_by_user_id_idx',
          'projects_archived_by_user_id_idx',
          'project_roles_project_id_idx',
          'project_role_permissions_role_id_idx',
          'project_memberships_project_id_idx',
          'project_memberships_user_id_idx',
          'project_memberships_role_id_idx',
          'project_memberships_status_idx',
          'project_memberships_removed_by_user_id_idx',
          'audit_events_project_id_idx',
          'audit_events_actor_user_id_idx',
          'audit_events_action_idx',
          'audit_events_created_at_idx'
        )
    `

    expect(indexes.map(index => index.indexname).sort()).toEqual([
      'audit_events_action_idx',
      'audit_events_actor_user_id_idx',
      'audit_events_created_at_idx',
      'audit_events_project_id_idx',
      'project_memberships_project_id_idx',
      'project_memberships_removed_by_user_id_idx',
      'project_memberships_role_id_idx',
      'project_memberships_status_idx',
      'project_memberships_user_id_idx',
      'project_role_permissions_role_id_idx',
      'project_roles_project_id_idx',
      'projects_archived_by_user_id_idx',
      'projects_created_by_user_id_idx',
      'projects_status_idx',
    ])

    const userForeignKeys = await database.queryClient<{
      table_name: string
      column_name: string
      referenced_table_name: string
      delete_rule: string
    }[]>`
      select tc.table_name, kcu.column_name, ccu.table_name as referenced_table_name, rc.delete_rule
      from information_schema.table_constraints tc
      join information_schema.key_column_usage kcu
        on kcu.constraint_schema = tc.constraint_schema
       and kcu.constraint_name = tc.constraint_name
      join information_schema.constraint_column_usage ccu
        on ccu.constraint_schema = tc.constraint_schema
       and ccu.constraint_name = tc.constraint_name
      join information_schema.referential_constraints rc
        on rc.constraint_schema = tc.constraint_schema
       and rc.constraint_name = tc.constraint_name
      where tc.table_schema = 'public'
        and tc.constraint_type = 'FOREIGN KEY'
        and tc.table_name in ('projects', 'project_memberships', 'audit_events')
        and kcu.column_name in ('created_by_user_id', 'archived_by_user_id', 'user_id', 'removed_by_user_id', 'actor_user_id')
        and ccu.table_name = 'user'
      order by tc.table_name, kcu.column_name
    `

    expect(userForeignKeys).toEqual([
      { table_name: 'audit_events', column_name: 'actor_user_id', referenced_table_name: 'user', delete_rule: 'RESTRICT' },
      { table_name: 'project_memberships', column_name: 'removed_by_user_id', referenced_table_name: 'user', delete_rule: 'RESTRICT' },
      { table_name: 'project_memberships', column_name: 'user_id', referenced_table_name: 'user', delete_rule: 'RESTRICT' },
      { table_name: 'projects', column_name: 'archived_by_user_id', referenced_table_name: 'user', delete_rule: 'RESTRICT' },
      { table_name: 'projects', column_name: 'created_by_user_id', referenced_table_name: 'user', delete_rule: 'RESTRICT' },
    ])
  } finally {
    await database.close()
  }
})

it('rejects invalid project RBAC rows at the database boundary', async () => {
  const database = createTestDatabase()

  try {
    await migrate(database.db, { migrationsFolder: 'drizzle' })

    const [user] = await database.queryClient<{ id: string }[]>`
      insert into "user" (name, email)
      values ('Schema test user', 'schema-test@example.com')
      returning id
    `
    const [projectA, projectB] = await database.queryClient<{ id: string }[]>`
      insert into projects (name, created_by_user_id)
      values ('Project A', ${user!.id}), ('Project B', ${user!.id})
      returning id
    `

    await expect(database.queryClient`
      insert into project_roles (project_id, kind, built_in_key, display_name)
      values (${projectA!.id}, 'built_in', null, 'Invalid built-in')
    `).rejects.toThrow()

    await expect(database.queryClient`
      insert into project_roles (project_id, kind, built_in_key, display_name)
      values (${projectA!.id}, 'custom', 'admin', 'Invalid custom')
    `).rejects.toThrow()

    await expect(database.queryClient`
      insert into projects (name, status, created_by_user_id)
      values ('Invalid status', 'deleted', ${user!.id})
    `).rejects.toThrow()

    const [role] = await database.queryClient<{ id: string }[]>`
      insert into project_roles (project_id, kind, built_in_key, display_name)
      values (${projectA!.id}, 'built_in', 'editor', 'Editor')
      returning id
    `

    await expect(database.queryClient`
      insert into project_role_permissions (role_id, permission_code)
      values (${role!.id}, 'project.destroy')
    `).rejects.toThrow()

    await database.queryClient`
      insert into project_role_permissions (role_id, permission_code)
      values (${role!.id}, 'project.view')
    `
    await expect(database.queryClient`
      insert into project_role_permissions (role_id, permission_code)
      values (${role!.id}, 'project.view')
    `).rejects.toThrow()

    await expect(database.queryClient`
      insert into project_memberships (project_id, user_id, role_id)
      values (${projectB!.id}, ${user!.id}, ${role!.id})
    `).rejects.toThrow()

    await database.queryClient`
      insert into project_memberships (project_id, user_id, role_id)
      values (${projectA!.id}, ${user!.id}, ${role!.id})
    `
    await expect(database.queryClient`
      delete from project_roles where id = ${role!.id}
    `).rejects.toThrow()

    const [membershipCount] = await database.queryClient<{ count: number }[]>`
      select count(*)::int as count
      from project_memberships
      where project_id = ${projectA!.id} and user_id = ${user!.id}
    `
    expect(membershipCount?.count).toBe(1)
  } finally {
    await database.close()
  }
})

it('enforces canonical project name and description storage', async () => {
  const database = createTestDatabase()
  const nameAtLimit = 'n'.repeat(120)
  const nameOverLimit = 'n'.repeat(121)
  const descriptionAtLimit = 'd'.repeat(2000)
  const descriptionOverLimit = 'd'.repeat(2001)

  try {
    await migrate(database.db, { migrationsFolder: 'drizzle' })
    const [user] = await database.queryClient<{ id: string }[]>`
      insert into "user" (name, email)
      values ('Project bounds user', 'project-bounds@example.com')
      returning id
    `

    for (const name of ['   ', ' Untrimmed', nameOverLimit]) {
      await expect(database.queryClient`
        insert into projects (name, created_by_user_id)
        values (${name}, ${user!.id})
      `).rejects.toThrow()
    }

    for (const description of [' Untrimmed', descriptionOverLimit]) {
      await expect(database.queryClient`
        insert into projects (name, description, created_by_user_id)
        values ('Valid name', ${description}, ${user!.id})
      `).rejects.toThrow()
    }

    await expect(database.queryClient`
      insert into projects (name, description, created_by_user_id)
      values (${nameAtLimit}, ${descriptionAtLimit}, ${user!.id})
    `).resolves.toBeDefined()
  } finally {
    await database.close()
  }
})
