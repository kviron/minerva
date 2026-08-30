import { describe, expect, it } from 'vitest'
import {
  projectAdministrationAuditDetails,
  projectAdministrationAuditEvent,
} from '../../../server/modules/administration/audit-projection'

describe('administration audit safe projection', () => {
  it('copies only explicitly allowed non-negative integer metadata', () => {
    const details = projectAdministrationAuditDetails({
      revision: 4,
      versionNumber: 2,
      grantCount: -1,
      resultCount: 1.5,
      password: 'secret',
      token: 'secret-token',
      documentContent: { type: 'doc' },
      requestId: 'private-correlation',
    })

    expect(details).toEqual([
      { key: 'revision', value: 4 },
      { key: 'versionNumber', value: 2 },
    ])
    expect(JSON.stringify(details)).not.toMatch(/secret|token|documentContent|requestId/)
  })

  it('projects disabled and anonymous actors without raw metadata', () => {
    const event = projectAdministrationAuditEvent({
      id: '31b9fc31-6e20-4399-a2ea-fb4de1024821',
      createdAt: new Date('2026-08-22T10:00:00.000Z'),
      actorUserId: null,
      actorName: null,
      actorStatus: null,
      projectId: null,
      projectName: null,
      channel: 'mcp',
      action: 'mcp.authentication_rejected',
      outcome: 'failed',
      targetType: 'mcp_authentication',
      targetId: null,
      metadata: { requestId: 'do-not-expose' },
    })

    expect(event.actor).toBeNull()
    expect(event.details).toEqual([])
    expect(event).not.toHaveProperty('metadata')
  })
})
