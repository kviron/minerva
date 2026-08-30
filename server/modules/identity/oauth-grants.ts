import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { and, eq, sql } from 'drizzle-orm'
import { ACCOUNT_STATUS, OAUTH_GRANT_STATUS } from '../../../shared/identity/constants'
import { AUDIT_OUTCOME } from '../../../shared/projects/constants'
import type { AuditChannel } from '../../../shared/projects/types'
import type { OAuthGrantSummary } from '../../../shared/oauth-grants/contracts'
import {
  auditEvents,
  oauthAccessToken,
  oauthClient,
  oauthConsent,
  oauthGrants,
  oauthRefreshToken,
  user,
} from '../../infrastructure/database/schema'

export const OAUTH_GRANT_REVOCATION_RESULT = {
  REVOKED: 'revoked',
  NOT_FOUND: 'not_found',
  STALE: 'stale',
  ALREADY_REVOKED: 'already_revoked',
  ACCOUNT_INACTIVE: 'account_inactive',
} as const

type OAuthGrantRevocationResult = Readonly<{
  type: typeof OAUTH_GRANT_REVOCATION_RESULT[keyof typeof OAUTH_GRANT_REVOCATION_RESULT]
}>

type RevokeOAuthGrantCommand = Readonly<{
  actorUserId: string
  grantId: string
  expectedUpdatedAt: string
  channel: AuditChannel
}>

type EnsureActiveOAuthGrantCommand = Readonly<{
  actorUserId: string
  clientId: string
  resource: string
  scopes: readonly string[]
}>

type OAuthDatabase = PostgresJsDatabase

export function createOAuthGrantManagement(db: OAuthDatabase) {
  return {
    ensureActive(command: EnsureActiveOAuthGrantCommand): Promise<string> {
      return db.transaction(async (tx): Promise<string> => {
        const [actor] = await tx.select({ status: user.status })
          .from(user)
          .where(eq(user.id, command.actorUserId))
          .for('update')
        if (actor?.status !== ACCOUNT_STATUS.ACTIVE) throw new Error('OAuth grant actor is inactive')

        const [existing] = await tx.select({ id: oauthGrants.id, scopes: oauthGrants.scopes })
          .from(oauthGrants)
          .where(and(
            eq(oauthGrants.userId, command.actorUserId),
            eq(oauthGrants.clientId, command.clientId),
            eq(oauthGrants.resource, command.resource),
            eq(oauthGrants.status, OAUTH_GRANT_STATUS.ACTIVE),
          ))
          .for('update')

        if (existing) {
          if (existing.scopes.join(' ') !== command.scopes.join(' ')) {
            await tx.update(oauthGrants).set({ scopes: [...command.scopes], updatedAt: new Date() })
              .where(eq(oauthGrants.id, existing.id))
          }
          return existing.id
        }

        const [created] = await tx.insert(oauthGrants).values({
          userId: command.actorUserId,
          clientId: command.clientId,
          resource: command.resource,
          scopes: [...command.scopes],
        }).returning({ id: oauthGrants.id })
        if (!created) throw new Error('OAuth grant insert returned no row')
        return created.id
      })
    },

    async listActive(actorUserId: string): Promise<readonly OAuthGrantSummary[]> {
      const rows = await db.select({
        id: oauthGrants.id,
        clientId: oauthClient.clientId,
        clientName: oauthClient.name,
        resource: oauthGrants.resource,
        scopes: oauthGrants.scopes,
        createdAt: oauthGrants.createdAt,
        updatedAt: oauthGrants.updatedAt,
      })
        .from(oauthGrants)
        .innerJoin(oauthClient, eq(oauthClient.clientId, oauthGrants.clientId))
        .innerJoin(oauthConsent, sql`${oauthConsent.referenceId} = ${oauthGrants.id}::text`)
        .where(and(
          eq(oauthGrants.userId, actorUserId),
          eq(oauthGrants.status, OAUTH_GRANT_STATUS.ACTIVE),
        ))
        .orderBy(oauthGrants.createdAt)

      return rows.map(row => ({
        id: row.id,
        client: { id: row.clientId, name: row.clientName ?? row.clientId },
        resource: row.resource,
        scopes: row.scopes,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      }))
    },

    revoke(command: RevokeOAuthGrantCommand): Promise<OAuthGrantRevocationResult> {
      return db.transaction(async (tx): Promise<OAuthGrantRevocationResult> => {
        const [actor] = await tx.select({ status: user.status })
          .from(user)
          .where(eq(user.id, command.actorUserId))
          .for('update')

        if (actor?.status !== ACCOUNT_STATUS.ACTIVE) {
          return { type: OAUTH_GRANT_REVOCATION_RESULT.ACCOUNT_INACTIVE }
        }

        const [grant] = await tx.select({
          id: oauthGrants.id,
          status: oauthGrants.status,
          updatedAt: oauthGrants.updatedAt,
        })
          .from(oauthGrants)
          .where(and(
            eq(oauthGrants.id, command.grantId),
            eq(oauthGrants.userId, command.actorUserId),
          ))
          .for('update')

        if (!grant) return { type: OAUTH_GRANT_REVOCATION_RESULT.NOT_FOUND }
        if (grant.status === OAUTH_GRANT_STATUS.REVOKED) {
          return { type: OAUTH_GRANT_REVOCATION_RESULT.ALREADY_REVOKED }
        }

        const expectedUpdatedAt = new Date(command.expectedUpdatedAt)
        if (!Number.isFinite(expectedUpdatedAt.getTime()) || expectedUpdatedAt.getTime() !== grant.updatedAt.getTime()) {
          return { type: OAUTH_GRANT_REVOCATION_RESULT.STALE }
        }

        const revokedAt = new Date()
        await tx.delete(oauthAccessToken).where(eq(oauthAccessToken.referenceId, grant.id))
        await tx.delete(oauthRefreshToken).where(eq(oauthRefreshToken.referenceId, grant.id))
        await tx.delete(oauthConsent).where(eq(oauthConsent.referenceId, grant.id))
        await tx.update(oauthGrants).set({
          status: OAUTH_GRANT_STATUS.REVOKED,
          revokedAt,
          updatedAt: revokedAt,
        }).where(eq(oauthGrants.id, grant.id))
        await tx.insert(auditEvents).values({
          actorUserId: command.actorUserId,
          channel: command.channel,
          action: 'oauth.grant_revoked',
          outcome: AUDIT_OUTCOME.SUCCEEDED,
          targetType: 'oauth_grant',
          targetId: grant.id,
          metadata: {},
        })

        return { type: OAUTH_GRANT_REVOCATION_RESULT.REVOKED }
      })
    },
  }
}
