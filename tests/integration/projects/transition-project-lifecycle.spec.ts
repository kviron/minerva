import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  AUDIT_CHANNEL,
  PROJECT_PERMISSION,
  PROJECT_STATUS,
} from '../../../shared/projects/constants'
import {
  PROJECT_LIFECYCLE_RECEIPT_OUTCOME,
  PROJECT_LIFECYCLE_TRANSITION,
} from '../../../shared/projects/project-lifecycle'
import { createProjectPersistence } from '../../../server/modules/projects/create-project'
import {
  transitionProjectLifecycleWith,
} from '../../../server/modules/projects/transition-project-lifecycle'
import { createTestDatabase, resetTestDatabase, TEST_DATABASE_URL } from '../../helpers/database'

vi.stubEnv('DATABASE_URL', TEST_DATABASE_URL)

const ownerId = '00000000-0000-4000-8000-000000000101'
const outsiderId = '00000000-0000-4000-8000-000000000102'
const customMemberId = '00000000-0000-4000-8000-000000000103'
const superAdminId = '00000000-0000-4000-8000-000000000104'

beforeEach(async () => {
  await resetTestDatabase()
  const database = createTestDatabase()
  try {
    await migrate(database.db, { migrationsFolder: 'drizzle' })
    await database.queryClient`
      insert into "user" (id, name, email, email_verified, super_admin, status) values
        (${ownerId}, 'Owner', 'lifecycle-owner@example.com', true, false, 'active'),
        (${outsiderId}, 'Outsider', 'lifecycle-outsider@example.com', true, false, 'active'),
        (${customMemberId}, 'Custom member', 'lifecycle-custom@example.com', true, false, 'active'),
        (${superAdminId}, 'Super Admin', 'lifecycle-super@example.com', true, true, 'active')
    `
  } finally {
    await database.close()
  }
})

const transitionId = (suffix: number) => `10000000-0000-4000-8000-${suffix.toString().padStart(12, '0')}`

describe('transitionProjectLifecycleWith', () => {
  it('applies the complete transition graph with monotonic history and archive attribution', async () => {
    const database = createTestDatabase()
    try {
      const created = await createProjectPersistence(database.db)({
        actorUserId: ownerId,
        channel: AUDIT_CHANNEL.WEB,
        name: 'Lifecycle graph',
        description: null,
      })
      const transition = transitionProjectLifecycleWith(database.db)
      const commands = [
        PROJECT_LIFECYCLE_TRANSITION.PAUSE,
        PROJECT_LIFECYCLE_TRANSITION.RESUME,
        PROJECT_LIFECYCLE_TRANSITION.CLOSE,
        PROJECT_LIFECYCLE_TRANSITION.REOPEN,
        PROJECT_LIFECYCLE_TRANSITION.CLOSE,
        PROJECT_LIFECYCLE_TRANSITION.ARCHIVE,
        PROJECT_LIFECYCLE_TRANSITION.RESTORE,
      ] as const

      for (const [index, command] of commands.entries()) {
        const result = await transition({
          actorUserId: ownerId,
          projectId: created.projectId,
          channel: AUDIT_CHANNEL.WEB,
          transition: command,
          expectedRevision: index,
          transitionId: transitionId(index + 1),
          reason: `Transition ${index + 1}`,
        })
        expect(result).toMatchObject({ ok: true, value: { outcome: 'applied', revision: index + 1 } })
      }

      const [project] = await database.queryClient<{
        status: string
        lifecycle_revision: number
        archived_at: string | null
        archived_by_user_id: string | null
      }[]>`
        select status, lifecycle_revision, archived_at, archived_by_user_id
        from projects where id = ${created.projectId}
      `
      expect(project).toMatchObject({
        status: PROJECT_STATUS.CLOSED,
        lifecycle_revision: 7,
        archived_at: null,
        archived_by_user_id: null,
      })
      const [counts] = await database.queryClient<{ history_count: number, audit_count: number, membership_count: number }[]>`
        select
          (select count(*)::int from project_lifecycle_events where project_id = ${created.projectId}) as history_count,
          (select count(*)::int from audit_events where project_id = ${created.projectId} and action = 'project.lifecycle_transitioned') as audit_count,
          (select count(*)::int from project_memberships where project_id = ${created.projectId}) as membership_count
      `
      expect(counts).toEqual({ history_count: 7, audit_count: 7, membership_count: 1 })

      const second = await createProjectPersistence(database.db)({
        actorUserId: ownerId,
        channel: AUDIT_CHANNEL.WEB,
        name: 'Close from paused',
        description: null,
      })
      await transition({ actorUserId: ownerId, projectId: second.projectId, channel: AUDIT_CHANNEL.WEB, transition: 'pause', expectedRevision: 0, transitionId: transitionId(20) })
      await expect(transition({ actorUserId: ownerId, projectId: second.projectId, channel: AUDIT_CHANNEL.WEB, transition: 'close', expectedRevision: 1, transitionId: transitionId(21) }))
        .resolves.toMatchObject({ ok: true, value: { currentState: PROJECT_STATUS.CLOSED } })
    } finally {
      await database.close()
    }
  })

  it('returns neutral denial, honors exact custom permission, and allows active super-admin bypass', async () => {
    const database = createTestDatabase()
    try {
      const created = await createProjectPersistence(database.db)({ actorUserId: ownerId, channel: AUDIT_CHANNEL.API, name: 'Access', description: null })
      const transition = transitionProjectLifecycleWith(database.db)
      const deniedInput = { actorUserId: outsiderId, projectId: created.projectId, channel: AUDIT_CHANNEL.API, transition: PROJECT_LIFECYCLE_TRANSITION.PAUSE, expectedRevision: 0, transitionId: transitionId(30) } as const
      await expect(transition(deniedInput)).resolves.toEqual({ ok: false, code: 'NOT_FOUND' })

      const [customRole] = await database.queryClient<{ id: string }[]>`
        insert into project_roles (project_id, kind, display_name)
        values (${created.projectId}, 'custom', 'Pauser') returning id
      `
      if (!customRole) throw new Error('Expected custom role')
      await database.queryClient`
        insert into project_role_permissions (role_id, permission_code)
        values (${customRole.id}, ${PROJECT_PERMISSION.PROJECT_PAUSE})
      `
      await database.queryClient`
        insert into project_memberships (project_id, user_id, role_id)
        values (${created.projectId}, ${customMemberId}, ${customRole.id})
      `
      await expect(transition({ ...deniedInput, actorUserId: customMemberId, transitionId: transitionId(31) }))
        .resolves.toMatchObject({ ok: true, value: { currentState: PROJECT_STATUS.PAUSED } })
      await expect(transition({
        actorUserId: superAdminId,
        projectId: created.projectId,
        channel: AUDIT_CHANNEL.API,
        transition: PROJECT_LIFECYCLE_TRANSITION.RESUME,
        expectedRevision: 1,
        transitionId: transitionId(32),
      })).resolves.toMatchObject({ ok: true, value: { currentState: PROJECT_STATUS.ACTIVE } })
    } finally {
      await database.close()
    }
  })

  it('rejects stale and illegal commands without changing state', async () => {
    const database = createTestDatabase()
    try {
      const created = await createProjectPersistence(database.db)({ actorUserId: ownerId, channel: AUDIT_CHANNEL.WEB, name: 'Conflicts', description: null })
      const transition = transitionProjectLifecycleWith(database.db)
      await expect(transition({ actorUserId: ownerId, projectId: created.projectId, channel: AUDIT_CHANNEL.WEB, transition: 'resume', expectedRevision: 0, transitionId: transitionId(40) }))
        .resolves.toMatchObject({ ok: false, code: 'transition_not_allowed', conflict: { currentState: 'active', currentRevision: 0 } })
      await transition({ actorUserId: ownerId, projectId: created.projectId, channel: AUDIT_CHANNEL.WEB, transition: 'pause', expectedRevision: 0, transitionId: transitionId(41) })
      await expect(transition({ actorUserId: ownerId, projectId: created.projectId, channel: AUDIT_CHANNEL.WEB, transition: 'resume', expectedRevision: 0, transitionId: transitionId(42) }))
        .resolves.toMatchObject({ ok: false, code: 'stale_revision', conflict: { currentState: 'paused', currentRevision: 1 } })
    } finally {
      await database.close()
    }
  })

  it('replays the same command and rejects conflicting transition-ID reuse', async () => {
    const database = createTestDatabase()
    try {
      const created = await createProjectPersistence(database.db)({ actorUserId: ownerId, channel: AUDIT_CHANNEL.API, name: 'Replay', description: null })
      const transition = transitionProjectLifecycleWith(database.db)
      const input = { actorUserId: ownerId, projectId: created.projectId, channel: AUDIT_CHANNEL.API, transition: PROJECT_LIFECYCLE_TRANSITION.PAUSE, expectedRevision: 0, transitionId: transitionId(50), reason: 'Maintenance' } as const
      const applied = await transition(input)
      expect(applied).toMatchObject({ ok: true, value: { outcome: PROJECT_LIFECYCLE_RECEIPT_OUTCOME.APPLIED } })
      await expect(transition(input)).resolves.toEqual(applied.ok
        ? { ok: true, value: { ...applied.value, outcome: PROJECT_LIFECYCLE_RECEIPT_OUTCOME.REPLAYED } }
        : applied)
      await expect(transition({ ...input, transition: PROJECT_LIFECYCLE_TRANSITION.CLOSE }))
        .resolves.toMatchObject({ ok: false, code: 'transition_id_conflict', conflict: { currentState: 'paused', currentRevision: 1 } })
      const [counts] = await database.queryClient<{ history_count: number, audit_count: number }[]>`
        select
          (select count(*)::int from project_lifecycle_events where project_id = ${created.projectId}) as history_count,
          (select count(*)::int from audit_events where project_id = ${created.projectId} and action = 'project.lifecycle_transitioned') as audit_count
      `
      expect(counts).toEqual({ history_count: 1, audit_count: 1 })
    } finally {
      await database.close()
    }
  })

  it('rolls back state and history when the audit write cannot complete', async () => {
    const database = createTestDatabase()
    try {
      const created = await createProjectPersistence(database.db)({ actorUserId: ownerId, channel: AUDIT_CHANNEL.WEB, name: 'Atomic', description: null })
      const transition = transitionProjectLifecycleWith(database.db, { beforeAudit: () => { throw new Error('audit unavailable') } })
      await expect(transition({ actorUserId: ownerId, projectId: created.projectId, channel: AUDIT_CHANNEL.WEB, transition: 'pause', expectedRevision: 0, transitionId: transitionId(60) }))
        .resolves.toEqual({ ok: false, code: 'OPERATION_FAILED' })
      const [state] = await database.queryClient<{ status: string, lifecycle_revision: number, history_count: number }[]>`
        select status, lifecycle_revision,
          (select count(*)::int from project_lifecycle_events where project_id = ${created.projectId}) as history_count
        from projects where id = ${created.projectId}
      `
      expect(state).toEqual({ status: 'active', lifecycle_revision: 0, history_count: 0 })
    } finally {
      await database.close()
    }
  })
})
