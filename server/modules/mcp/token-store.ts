import { and, eq, sql } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import {
  oauthAccessToken,
  oauthGrants,
  user,
} from '../../infrastructure/database/schema'
import type { McpTokenRecord } from './bearer-validator'

export function createMcpTokenStore(db: PostgresJsDatabase) {
  return {
    async findByTokenHash(tokenHash: string): Promise<McpTokenRecord | null> {
      const [row] = await db.select({
        userId: user.id,
        accountStatus: user.status,
        clientId: oauthAccessToken.clientId,
        grantId: oauthGrants.id,
        grantStatus: oauthGrants.status,
        grantResource: oauthGrants.resource,
        tokenScopes: oauthAccessToken.scopes,
        grantScopes: oauthGrants.scopes,
        expiresAt: oauthAccessToken.expiresAt,
      })
        .from(oauthAccessToken)
        .innerJoin(user, eq(user.id, oauthAccessToken.userId))
        .innerJoin(oauthGrants, and(
          sql`${oauthAccessToken.referenceId} = ${oauthGrants.id}::text`,
          eq(oauthGrants.userId, user.id),
          eq(oauthGrants.clientId, oauthAccessToken.clientId),
        ))
        .where(eq(oauthAccessToken.token, tokenHash))
        .limit(1)

      return row ?? null
    },
  }
}
