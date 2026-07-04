import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ACCOUNT_STATUS } from '../../../shared/identity/constants'
import { AUDIT_CHANNEL, MEMBERSHIP_STATUS, PROJECT_ROLE_KEY, PROJECT_STATUS } from '../../../shared/projects/constants'
import { createProjectPersistence, createProjectWith } from '../../../server/modules/projects/create-project'
import { BUILT_IN_PROJECT_ROLES } from '../../../server/modules/projects/project-templates'
import { createTestDatabase, resetTestDatabase, TEST_DATABASE_URL } from '../../helpers/database'

vi.stubEnv('DATABASE_URL', TEST_DATABASE_URL)

beforeEach(async () => {
  await resetTestDatabase()
  const database = createTestDatabase()
  try {
    await migrate(database.db, { migrationsFolder: 'drizzle' })
    await database.queryClient`
      insert into "user" (id, name, email, email_verified, status) values
      ('00000000-0000-4000-8000-000000000001', 'Active', 'active@example.com', true, 'active'),
      ('00000000-0000-4000-8000-000000000002', 'Disabled', 'disabled@example.com', true, 'disabled')
    `
  } finally {
    await database.close()
  }
})

const command = (name: string) => ({
  actorUserId: '00000000-0000-4000-8000-000000000001',
  channel: AUDIT_CHANNEL.WEB,
  name,
  description: 'Knowledge base',
})

describe('createProjectPersistence', () => {
  async function expectProjectDomainEmpty(database: ReturnType<typeof createTestDatabase>) {
    for (const table of ['projects', 'project_roles', 'project_role_permissions', 'project_memberships', 'audit_events']) {
      const [row] = await database.queryClient.unsafe<{ count: string }[]>(`select count(*) from ${table}`)
      expect(row?.count, table).toBe('0')
    }
  }

  it('atomically creates a project with isolated built-in RBAC, creator membership, and audit event', async () => {
    const database = createTestDatabase()
    try {
      const persist = createProjectPersistence(database.db)
      const firstResult = await createProjectWith({ persist })({
        actor: { userId: command('').actorUserId, accountStatus: ACCOUNT_STATUS.ACTIVE },
        channel: AUDIT_CHANNEL.WEB,
        name: '  First  ',
        description: '  Knowledge base  ',
      })
      if (!firstResult.ok) throw new Error('Expected project creation to succeed')
      const first = firstResult.value
      const second = await persist(command('Second'))

      const projects = await database.queryClient`select id, name, description, status, created_by_user_id from projects order by name`
      const roles = await database.queryClient`select id, project_id, built_in_key, display_name from project_roles order by project_id, built_in_key`
      const permissions = await database.queryClient`select r.project_id, r.built_in_key, p.permission_code from project_role_permissions p join project_roles r on r.id = p.role_id order by r.project_id, r.built_in_key, p.permission_code`
      const memberships = await database.queryClient`select project_id, user_id, role_id, status from project_memberships order by project_id`
      const audits = await database.queryClient`select actor_user_id, channel, action, outcome, project_id, target_type, target_id, metadata from audit_events order by project_id`

      expect(projects).toEqual([
        expect.objectContaining({ id: first.projectId, name: 'First', description: 'Knowledge base', status: PROJECT_STATUS.ACTIVE, created_by_user_id: command('').actorUserId }),
        expect.objectContaining({ id: second.projectId, name: 'Second', description: 'Knowledge base', status: PROJECT_STATUS.ACTIVE, created_by_user_id: command('').actorUserId }),
      ])
      expect(roles).toHaveLength(6)
      for (const projectId of [first.projectId, second.projectId]) {
        const projectRoles = roles.filter(role => role.project_id === projectId)
        expect(projectRoles.map(role => role.built_in_key).sort()).toEqual(Object.values(PROJECT_ROLE_KEY).sort())
        expect(new Set(projectRoles.map(role => role.id))).toHaveLength(3)
        for (const role of projectRoles) {
          expect(permissions.filter(row => row.project_id === projectId && row.built_in_key === role.built_in_key).map(row => row.permission_code).sort())
            .toEqual([...BUILT_IN_PROJECT_ROLES[role.built_in_key as keyof typeof BUILT_IN_PROJECT_ROLES].permissions].sort())
        }
      }
      expect(new Set(roles.map(role => role.id))).toHaveLength(6)
      expect(memberships).toHaveLength(2)
      for (const membership of memberships) {
        expect(membership).toMatchObject({ user_id: command('').actorUserId, status: MEMBERSHIP_STATUS.ACTIVE })
        expect(roles.find(role => role.id === membership.role_id)).toMatchObject({ project_id: membership.project_id, built_in_key: PROJECT_ROLE_KEY.ADMIN })
      }
      expect(audits).toEqual([first.projectId, second.projectId].sort().map(projectId => ({
        actor_user_id: command('').actorUserId,
        channel: AUDIT_CHANNEL.WEB,
        action: 'project.created',
        outcome: 'succeeded',
        project_id: projectId,
        target_type: 'project',
        target_id: projectId,
        metadata: { roleKey: PROJECT_ROLE_KEY.ADMIN },
      })))
    } finally {
      await database.close()
    }
  })

  it('rolls back every project-domain insert when audit preparation fails', async () => {
    const database = createTestDatabase()
    try {
      const persist = createProjectPersistence(database.db, { beforeAudit: () => { throw new Error('audit unavailable') } })
      const service = createProjectWith({ persist })
      await expect(service({ actor: { userId: command('').actorUserId, accountStatus: ACCOUNT_STATUS.ACTIVE }, channel: AUDIT_CHANNEL.WEB, name: ' Rollback ', description: null }))
        .resolves.toEqual({ ok: false, code: 'PROJECT_CREATE_FAILED' })

      await expectProjectDomainEmpty(database)
    } finally {
      await database.close()
    }
  })

  it('rejects a stale active claim when the locked database actor is disabled', async () => {
    const database = createTestDatabase()
    try {
      const service = createProjectWith({ persist: createProjectPersistence(database.db) })
      await expect(service({
        actor: { userId: '00000000-0000-4000-8000-000000000002', accountStatus: ACCOUNT_STATUS.ACTIVE },
        channel: AUDIT_CHANNEL.WEB,
        name: 'Forbidden',
      })).resolves.toEqual({ ok: false, code: 'ACCOUNT_INACTIVE' })
      await expectProjectDomainEmpty(database)
    } finally {
      await database.close()
    }
  })

  it('returns a safe auth error when the locked database actor is missing', async () => {
    const database = createTestDatabase()
    try {
      const service = createProjectWith({ persist: createProjectPersistence(database.db) })
      await expect(service({
        actor: { userId: '00000000-0000-4000-8000-000000000099', accountStatus: ACCOUNT_STATUS.ACTIVE },
        channel: AUDIT_CHANNEL.WEB,
        name: 'Missing actor',
      })).resolves.toEqual({ ok: false, code: 'AUTH_REQUIRED' })
      await expectProjectDomainEmpty(database)
    } finally {
      await database.close()
    }
  })
})
