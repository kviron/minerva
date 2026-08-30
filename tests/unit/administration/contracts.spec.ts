import { describe, expect, it } from 'vitest'
import {
  administrationAuditQuerySchema,
  administrationAuditResponseSchema,
  administrationAuditTargetResponseSchema,
  administrationUserDetailSchema,
  administrationUserRouteParamsSchema,
  administrationUsersResponseSchema,
} from '../../../shared/administration/contracts'

const user = {
  id: '21b9fc31-6e20-4399-a2ea-fb4de1024821',
  name: 'Анна Иванова',
  email: 'anna@example.com',
  username: 'anna',
  status: 'active',
  superAdmin: true,
  createdAt: '2026-07-01T10:00:00.000Z',
  lastLoginAt: null,
} as const

describe('administration contracts', () => {
  it('accepts only the safe user projection', () => {
    expect(administrationUsersResponseSchema.parse([user])).toHaveLength(1)
    expect(administrationUserDetailSchema.parse(user)).toEqual(user)
    expect(() => administrationUsersResponseSchema.parse([{ ...user, disabledReason: 'private' }])).toThrow()
  })

  it('requires a UUID route parameter', () => {
    expect(administrationUserRouteParamsSchema.parse({ id: user.id })).toEqual({ id: user.id })
    expect(() => administrationUserRouteParamsSchema.parse({ id: 'not-a-uuid' })).toThrow()
  })

  it('accepts only bounded audit target fields', () => {
    expect(administrationAuditTargetResponseSchema.parse({
      state: 'available',
      type: 'project',
      title: 'Minerva',
      fields: [{ label: 'Статус', value: 'active' }],
    }).title).toBe('Minerva')
    expect(() => administrationAuditTargetResponseSchema.parse({
      state: 'available',
      type: 'credential',
      title: 'Production',
      fields: [],
      password: 'secret',
    })).toThrow()
  })

  it('accepts only the bounded safe audit projection and filters', () => {
    const event = {
      id: '31b9fc31-6e20-4399-a2ea-fb4de1024821',
      createdAt: '2026-08-22T10:00:00.000Z',
      actor: { id: user.id, name: user.name, status: user.status },
      project: null,
      channel: 'api',
      action: 'document.updated',
      outcome: 'succeeded',
      targetType: 'document',
      targetId: '41b9fc31-6e20-4399-a2ea-fb4de1024821',
      details: [{ key: 'revision', value: 2 }],
    } as const

    expect(administrationAuditResponseSchema.parse({
      items: [event],
      page: 1,
      pageSize: 20,
      totalItems: 1,
      totalPages: 1,
    }).items).toHaveLength(1)
    expect(administrationAuditQuerySchema.parse({
      channel: 'mcp',
      search: 'document',
      projectId: '51b9fc31-6e20-4399-a2ea-fb4de1024821',
      page: '2',
      sort: 'action',
      direction: 'asc',
    })).toMatchObject({
      channel: 'mcp',
      search: 'document',
      projectId: '51b9fc31-6e20-4399-a2ea-fb4de1024821',
      page: 2,
      sort: 'action',
      direction: 'asc',
    })
    expect(() => administrationAuditResponseSchema.parse({
      items: [{ ...event, metadata: { token: 'secret' } }],
      page: 1,
      pageSize: 20,
      totalItems: 1,
      totalPages: 1,
    })).toThrow()
    expect(() => administrationAuditQuerySchema.parse({
      from: '2026-08-23T00:00:00.000Z',
      to: '2026-08-22T00:00:00.000Z',
    })).toThrow()
    expect(() => administrationAuditQuerySchema.parse({ projectId: 'not-a-uuid' })).toThrow()
    expect(() => administrationAuditQuerySchema.parse({ search: 'x'.repeat(161) })).toThrow()
  })
})
