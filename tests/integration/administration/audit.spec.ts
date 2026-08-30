import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { listAdministrationAuditEvents } from '../../../server/modules/administration/list-audit-events'
import { getAdministrationAuditTarget } from '../../../server/modules/administration/get-audit-target'
import { createTestDatabase, resetTestDatabase, TEST_DATABASE_URL } from '../../helpers/database'

vi.stubEnv('DATABASE_URL', TEST_DATABASE_URL)

const superAdminId = '00000000-0000-4000-8000-000000000081'
const userId = '00000000-0000-4000-8000-000000000082'
const disabledAdminId = '00000000-0000-4000-8000-000000000083'
const projectId = '00000000-0000-4000-8000-000000000084'

beforeEach(async () => {
  await resetTestDatabase()
  const database = createTestDatabase()
  try {
    await migrate(database.db, { migrationsFolder: 'drizzle' })
    await database.queryClient`
      insert into "user" (id, name, email, email_verified, super_admin, status) values
      (${superAdminId}, 'Администратор', 'audit-admin@example.com', true, true, 'active'),
      (${userId}, 'Обычный пользователь', 'audit-user@example.com', true, false, 'active'),
      (${disabledAdminId}, 'Отключённый администратор', 'audit-disabled@example.com', true, true, 'disabled')
    `
    await database.queryClient`
      insert into projects (id, name, created_by_user_id) values
      (${projectId}, 'Аудит-проект', ${superAdminId})
    `
    await database.queryClient`
      insert into audit_events
        (id, created_at, actor_user_id, channel, action, outcome, project_id, target_type, target_id, metadata)
      values
        ('10000000-0000-4000-8000-000000000003', '2026-08-21T12:00:00Z', ${userId}, 'api', 'document.updated', 'succeeded', ${projectId}, 'document', null,
          ${JSON.stringify({ revision: 3, token: 'never-return', documentContent: 'private' })}::jsonb),
        ('10000000-0000-4000-8000-000000000002', '2026-08-21T11:00:00Z', ${disabledAdminId}, 'web', 'identity.disabled', 'succeeded', null, 'user', ${disabledAdminId}, ${JSON.stringify({ reason: 'private' })}::jsonb),
        ('10000000-0000-4000-8000-000000000001', '2026-08-21T10:00:00Z', null, 'mcp', 'mcp.authentication_rejected', 'failed', null, 'mcp_authentication', null, ${JSON.stringify({ requestId: 'private' })}::jsonb)
    `
  }
  finally {
    await database.close()
  }
})

describe('administration audit browsing', () => {
  it('rechecks active super-admin, projects safe fields, paginates, and audits reads', async () => {
    const database = createTestDatabase()
    try {
      await expect(listAdministrationAuditEvents(database.db, userId, { page: 1, sort: 'createdAt', direction: 'desc' }))
        .rejects.toMatchObject({ code: 'FORBIDDEN' })
      await expect(listAdministrationAuditEvents(database.db, disabledAdminId, { page: 1, sort: 'createdAt', direction: 'desc' }))
        .rejects.toMatchObject({ code: 'FORBIDDEN' })

      const first = await listAdministrationAuditEvents(database.db, superAdminId, {
        page: 1,
        sort: 'action',
        direction: 'asc',
      })
      expect(first.items.map(event => event.action)).toEqual([
        'document.updated',
        'identity.disabled',
        'mcp.authentication_rejected',
      ])
      expect(first.items[0]).toMatchObject({
        actor: { id: userId, status: 'active' },
        project: { id: projectId, name: 'Аудит-проект' },
        details: [{ key: 'revision', value: 3 }],
      })
      expect(JSON.stringify(first)).not.toMatch(/never-return|documentContent|reason|requestId/)
      expect(first).toMatchObject({ page: 1, pageSize: 20, totalItems: 3, totalPages: 1 })

      const byOutcome = await listAdministrationAuditEvents(database.db, superAdminId, {
        page: 1,
        sort: 'outcome',
        direction: 'desc',
        outcome: 'failed',
      })
      expect(byOutcome.items.map(event => event.action)).toEqual(['mcp.authentication_rejected'])
      expect(byOutcome.items[0]?.actor).toBeNull()
      expect(byOutcome).toMatchObject({ totalItems: 1, totalPages: 1 })

      const byProject = await listAdministrationAuditEvents(database.db, superAdminId, {
        page: 1,
        sort: 'createdAt',
        direction: 'desc',
        projectId,
      })
      expect(byProject.items.map(event => event.action)).toEqual(['document.updated'])
      expect(byProject.items[0]?.project?.id).toBe(projectId)
      expect(byProject).toMatchObject({ totalItems: 1, totalPages: 1 })

      const bySearch = await listAdministrationAuditEvents(database.db, superAdminId, {
        page: 1,
        sort: 'createdAt',
        direction: 'desc',
        search: 'аудит-проект',
      })
      expect(bySearch.items.map(event => event.action)).toEqual(['document.updated'])
      expect(bySearch).toMatchObject({ totalItems: 1, totalPages: 1 })

      const reads = await database.queryClient<{ action: string, metadata: unknown }[]>`
        select action, metadata from audit_events
        where action = 'administration.audit_viewed'
        order by created_at, id
      `
      expect(reads).toHaveLength(4)
      expect(reads.every(event => JSON.stringify(event.metadata).includes('resultCount'))).toBe(true)

      const [targetAudit] = await database.queryClient<{ id: string }[]>`
        insert into audit_events
          (actor_user_id, channel, action, outcome, project_id, target_type, target_id, metadata)
        values (${superAdminId}, 'web', 'project.updated', 'succeeded', ${projectId}, 'project', ${projectId}, '{}'::jsonb)
        returning id
      `
      expect(targetAudit).toBeDefined()
      if (targetAudit === undefined) throw new Error('Expected audit target fixture')
      const target = await getAdministrationAuditTarget(database.db, superAdminId, targetAudit.id)
      expect(target).toMatchObject({ state: 'available', type: 'project' })
      expect(JSON.stringify(target)).not.toMatch(/descriptionContent|metadata|createdByUserId/)
    }
    finally {
      await database.close()
    }
  })

  it('returns exactly twenty rows per numbered page', async () => {
    const database = createTestDatabase()
    try {
      await database.queryClient`
        insert into audit_events
          (created_at, actor_user_id, channel, action, outcome, target_type, metadata)
        select
          '2026-08-20T00:00:00Z'::timestamptz + value * interval '1 minute',
          null,
          'system',
          'bulk.event_' || lpad(value::text, 2, '0'),
          'succeeded',
          'test_event',
          '{}'::jsonb
        from generate_series(1, 22) as value
      `

      const first = await listAdministrationAuditEvents(database.db, superAdminId, {
        page: 1,
        sort: 'createdAt',
        direction: 'asc',
      })
      expect(first.items).toHaveLength(20)
      expect(first).toMatchObject({ page: 1, pageSize: 20, totalItems: 25, totalPages: 2 })

      const second = await listAdministrationAuditEvents(database.db, superAdminId, {
        page: 2,
        sort: 'createdAt',
        direction: 'asc',
      })
      expect(second.page).toBe(2)
      expect(second.items.length).toBeLessThanOrEqual(20)
      expect(second.totalPages).toBe(2)
    }
    finally {
      await database.close()
    }
  })
})
