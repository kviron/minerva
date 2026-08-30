import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { AUDIT_CHANNEL, AUDIT_OUTCOME } from '../../../shared/projects/constants'
import { auditEvents } from '../../infrastructure/database/schema'

export type RejectedMcpAuthentication = Readonly<{ requestId: string }>

export const createMcpAuthenticationAudit = (db: PostgresJsDatabase) => ({
  async recordRejected(input: RejectedMcpAuthentication): Promise<void> {
    await db.insert(auditEvents).values({
      actorUserId: null,
      channel: AUDIT_CHANNEL.MCP,
      action: 'mcp.authentication_rejected',
      outcome: AUDIT_OUTCOME.FAILED,
      targetType: 'mcp_authentication',
      targetId: null,
      metadata: { requestId: input.requestId },
    })
  },
})
