import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import {
  administrationProjectsResponseSchema,
  createProjectRequestSchema,
  createProjectResponseSchema,
  createProjectErrorResponseSchema,
  projectRouteParamsSchema,
  memberProjectsResponseSchema,
  projectMembersResponseSchema,
  projectLifecycleConflictResponseSchema,
  projectLifecycleHistoryResponseSchema,
  projectLifecycleTransitionRequestSchema,
  projectLifecycleTransitionResponseSchema,
  projectListQuerySchema,
  projectOperationModeSchema,
  projectOverviewSchema,
} from '../../../shared/projects/contracts'

const projectId = '21b9fc31-6e20-4399-a2ea-fb4de1024821'
const base = {
  id: projectId,
  name: 'Minerva',
  description: null,
  status: 'active',
  iconId: null,
  updatedAt: '2026-07-16T10:00:00.000Z',
}

describe('shared project HTTP contracts', () => {
  it('validates strict lifecycle transition, receipt, conflict, history, and list-filter contracts', () => {
    const transitionId = '00000000-0000-4000-8000-000000000041'
    expect(projectLifecycleTransitionRequestSchema.parse({
      transition: 'close',
      expectedRevision: 4,
      transitionId,
      reason: '  Проект завершён  ',
    })).toEqual({
      transition: 'close',
      expectedRevision: 4,
      transitionId,
      reason: 'Проект завершён',
    })

    for (const invalid of [
      { transition: 'delete', expectedRevision: 4, transitionId },
      { transition: 'close', expectedRevision: -1, transitionId },
      { transition: 'close', expectedRevision: 4, transitionId: 'not-a-uuid' },
      { transition: 'close', expectedRevision: 4, transitionId, reason: '   ' },
      { transition: 'close', expectedRevision: 4, transitionId, reason: 'x'.repeat(501) },
      { transition: 'close', expectedRevision: 4, transitionId, status: 'closed' },
    ]) expect(() => projectLifecycleTransitionRequestSchema.parse(invalid)).toThrow()

    expect(projectLifecycleTransitionResponseSchema.parse({
      outcome: 'replayed',
      transition: 'close',
      previousState: 'active',
      currentState: 'closed',
      revision: 5,
      transitionId,
      changedAt: '2026-08-29T10:00:00.000Z',
      availableTransitions: ['reopen', 'archive'],
    })).toMatchObject({ outcome: 'replayed', revision: 5 })

    expect(projectLifecycleConflictResponseSchema.parse({
      data: {
        code: 'stale_revision',
        currentState: 'paused',
        currentRevision: 5,
        availableTransitions: ['resume', 'close'],
      },
    })).toMatchObject({ data: { code: 'stale_revision' } })

    expect(projectLifecycleHistoryResponseSchema.parse({
      items: [{
        id: '00000000-0000-4000-8000-000000000042',
        transition: 'close',
        previousState: 'active',
        nextState: 'closed',
        revision: 5,
        reason: 'Проект завершён',
        actorUserId: '00000000-0000-4000-8000-000000000043',
        channel: 'web',
        createdAt: '2026-08-29T10:00:00.000Z',
      }],
      nextCursor: null,
    }).items).toHaveLength(1)

    expect(projectListQuerySchema.parse({ status: 'paused' })).toEqual({ status: 'paused', limit: 50 })
    expect(() => projectListQuerySchema.parse({ status: 'deleted' })).toThrow()
    expect(projectOperationModeSchema.parse('security_reduction')).toBe('security_reduction')
    expect(() => projectOperationModeSchema.parse('configuration_write')).toThrow()
    expect(() => projectLifecycleTransitionResponseSchema.parse({
      outcome: 'applied',
      transition: 'close',
      previousState: 'active',
      currentState: 'deleted',
      revision: 5,
      transitionId,
      changedAt: '2026-08-29T10:00:00.000Z',
      availableTransitions: [],
    })).toThrow()
  })

  it('owns strict member, administration, and overview response schemas', () => {
    expect(memberProjectsResponseSchema.parse({ items: [{ ...base, role: { builtInKey: 'admin', customName: null } }], nextCursor: null }).items).toHaveLength(1)
    expect(administrationProjectsResponseSchema.parse({ items: [{ ...base, activeMemberCount: 2 }], nextCursor: null }).items).toHaveLength(1)
    expect(projectOverviewSchema.parse({
      ...base,
      descriptionContent: { type: 'doc', content: [] },
      createdAt: '2026-07-15T10:00:00.000Z',
      activeMemberCount: 2,
      role: { builtInKey: null, customName: 'Reviewer' },
      permissions: ['project.view'],
    })).toMatchObject({ id: projectId })

    expect(() => memberProjectsResponseSchema.parse({ items: [{
      ...base,
      updatedAt: new Date(),
      role: { builtInKey: 'admin', customName: null },
    }], nextCursor: null })).toThrow()
    expect(() => administrationProjectsResponseSchema.parse({ items: [{ ...base, activeMemberCount: 2, privateField: true }], nextCursor: null })).toThrow()
  })

  it('validates the shared create request without accepting extra fields', () => {
    expect(createProjectRequestSchema.parse({ name: 'Project', description: null })).toEqual({ name: 'Project', description: null })
    expect(() => createProjectRequestSchema.parse({ name: 'Project', description: null, ownerId: projectId })).toThrow()
  })

  it('validates the create response returned to every client', () => {
    expect(createProjectResponseSchema.parse({ projectId })).toEqual({ projectId })
    expect(() => createProjectResponseSchema.parse({ projectId: 'not-a-uuid' })).toThrow()
    expect(() => createProjectResponseSchema.parse({ projectId, secret: true })).toThrow()
  })

  it('validates project route params and stable create errors', () => {
    expect(projectRouteParamsSchema.parse({ id: projectId })).toEqual({ id: projectId })
    expect(() => projectRouteParamsSchema.parse({ id: 'not-a-uuid' })).toThrow()
    expect(createProjectErrorResponseSchema.parse({ data: { code: 'INVALID_REQUEST' } })).toEqual({
      data: { code: 'INVALID_REQUEST' },
    })
    expect(() => createProjectErrorResponseSchema.parse({ data: { code: 'DATABASE_FAILED' } })).toThrow()
  })

  it('exposes only safe member and role fields', () => {
    expect(projectMembersResponseSchema.parse([{ 
      id: projectId,
      name: 'Мария',
      email: 'maria@example.com',
      joinedAt: '2026-07-19T10:00:00.000Z',
      role: { builtInKey: 'editor', customName: null },
    }])).toHaveLength(1)
    expect(() => projectMembersResponseSchema.parse([{ id: projectId, name: 'Мария', email: 'maria@example.com', password: 'secret' }])).toThrow()
  })

  it('does not import server infrastructure into the shared boundary', async () => {
    const source = await readFile(new URL('../../../shared/projects/contracts.ts', import.meta.url), 'utf8')
    expect(source).not.toContain('/server/')
    expect(source).not.toContain('drizzle-zod')
    expect(source).not.toContain('createSelectSchema')
  })

  it('is reused by both HTTP adapters instead of being redefined', async () => {
    const [clientSource, serverSource] = await Promise.all([
      readFile(new URL('../../../app/features/projects/api/projects-api.ts', import.meta.url), 'utf8'),
      readFile(new URL('../../../server/api/projects/index.post.ts', import.meta.url), 'utf8'),
    ])

    expect(clientSource).toContain('memberProjectsResponseSchema')
    expect(clientSource).toContain('administrationProjectsResponseSchema')
    expect(clientSource).toContain('projectOverviewSchema')
    expect(clientSource).not.toContain('z.object(')
    expect(serverSource).toContain('createProjectRequestSchema')
    expect(serverSource).toContain('readValidatedBody')
    expect(serverSource).toContain("'Cache-Control', 'private, no-store'")
    expect(serverSource).not.toContain('const isBody')
  })
})
