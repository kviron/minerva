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
      { table_name: 'project_role_permissions', columns: ['role_id', 'permission'] },
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
          'project_role_permissions_permission_check',
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

    expect(membershipRoleForeignKey).toEqual([{ delete_rule: 'CASCADE' }])

    const userForeignKeys = await database.queryClient<{ table_name: string, delete_rule: string }[]>`
      select distinct tc.table_name, rc.delete_rule
      from information_schema.table_constraints tc
      join information_schema.key_column_usage kcu
        on kcu.constraint_schema = tc.constraint_schema
       and kcu.constraint_name = tc.constraint_name
      join information_schema.referential_constraints rc
        on rc.constraint_schema = tc.constraint_schema
       and rc.constraint_name = tc.constraint_name
      where tc.table_schema = 'public'
        and tc.constraint_type = 'FOREIGN KEY'
        and tc.table_name in ('projects', 'project_memberships', 'audit_events')
        and kcu.column_name in ('created_by_user_id', 'archived_by_user_id', 'user_id', 'removed_by_user_id', 'actor_user_id')
    `

    expect(userForeignKeys).not.toHaveLength(0)
    expect(userForeignKeys.every(foreignKey => foreignKey.delete_rule === 'RESTRICT')).toBe(true)
  } finally {
    await database.close()
  }
})
