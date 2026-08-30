import { sql } from 'drizzle-orm'
import {
  boolean,
  check,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { OAUTH_GRANT_STATUS } from '../../../../shared/identity/constants'
import { session, user } from './auth'

const timezoneTimestamp = (name: string) => timestamp(name, { withTimezone: true })

export const oauthClient = pgTable('oauth_client', {
  id: uuid('id').defaultRandom().primaryKey(),
  clientId: text('client_id').notNull().unique(),
  clientSecret: text('client_secret'),
  disabled: boolean('disabled').default(false),
  skipConsent: boolean('skip_consent'),
  enableEndSession: boolean('enable_end_session'),
  subjectType: text('subject_type'),
  scopes: text('scopes').array(),
  userId: uuid('user_id').references(() => user.id, { onDelete: 'cascade' }),
  createdAt: timezoneTimestamp('created_at').defaultNow().notNull(),
  updatedAt: timezoneTimestamp('updated_at').defaultNow().notNull(),
  name: text('name'),
  uri: text('uri'),
  icon: text('icon'),
  contacts: text('contacts').array(),
  tos: text('tos'),
  policy: text('policy'),
  softwareId: text('software_id'),
  softwareVersion: text('software_version'),
  softwareStatement: text('software_statement'),
  redirectUris: text('redirect_uris').array().notNull(),
  postLogoutRedirectUris: text('post_logout_redirect_uris').array(),
  tokenEndpointAuthMethod: text('token_endpoint_auth_method'),
  grantTypes: text('grant_types').array(),
  responseTypes: text('response_types').array(),
  public: boolean('public'),
  type: text('type'),
  requirePKCE: boolean('require_pkce'),
  referenceId: text('reference_id'),
  metadata: jsonb('metadata'),
}, table => [
  index('oauth_client_user_id_idx').on(table.userId),
])

export const oauthGrants = pgTable('oauth_grants', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  clientId: text('client_id').notNull().references(() => oauthClient.clientId, { onDelete: 'cascade' }),
  resource: text('resource').notNull(),
  scopes: text('scopes').array().notNull(),
  status: text('status', { enum: [OAUTH_GRANT_STATUS.ACTIVE, OAUTH_GRANT_STATUS.REVOKED] })
    .default(OAUTH_GRANT_STATUS.ACTIVE)
    .notNull(),
  createdAt: timezoneTimestamp('created_at').defaultNow().notNull(),
  updatedAt: timezoneTimestamp('updated_at').defaultNow().notNull(),
  revokedAt: timezoneTimestamp('revoked_at'),
}, table => [
  check('oauth_grants_status_check', sql`${table.status} in ('active', 'revoked')`),
  check('oauth_grants_resource_check', sql`${table.resource} = btrim(${table.resource}) and char_length(${table.resource}) between 1 and 2048`),
  check('oauth_grants_revocation_check', sql`
    (${table.status} = 'active' and ${table.revokedAt} is null)
    or (${table.status} = 'revoked' and ${table.revokedAt} is not null)
  `),
  uniqueIndex('oauth_grants_active_subject_unique')
    .on(table.userId, table.clientId, table.resource)
    .where(sql`${table.status} = 'active'`),
  index('oauth_grants_user_id_idx').on(table.userId),
  index('oauth_grants_client_id_idx').on(table.clientId),
  index('oauth_grants_status_idx').on(table.status),
])

export const oauthRefreshToken = pgTable('oauth_refresh_token', {
  id: uuid('id').defaultRandom().primaryKey(),
  token: text('token').notNull().unique(),
  clientId: text('client_id').notNull().references(() => oauthClient.clientId, { onDelete: 'cascade' }),
  sessionId: uuid('session_id').references(() => session.id, { onDelete: 'set null' }),
  userId: uuid('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  referenceId: text('reference_id'),
  expiresAt: timezoneTimestamp('expires_at').notNull(),
  createdAt: timezoneTimestamp('created_at').defaultNow().notNull(),
  revoked: timezoneTimestamp('revoked'),
  authTime: timezoneTimestamp('auth_time'),
  scopes: text('scopes').array().notNull(),
}, table => [
  index('oauth_refresh_token_client_id_idx').on(table.clientId),
  index('oauth_refresh_token_session_id_idx').on(table.sessionId),
  index('oauth_refresh_token_user_id_idx').on(table.userId),
  index('oauth_refresh_token_reference_id_idx').on(table.referenceId),
])

export const oauthAccessToken = pgTable('oauth_access_token', {
  id: uuid('id').defaultRandom().primaryKey(),
  token: text('token').notNull().unique(),
  clientId: text('client_id').notNull().references(() => oauthClient.clientId, { onDelete: 'cascade' }),
  sessionId: uuid('session_id').references(() => session.id, { onDelete: 'set null' }),
  userId: uuid('user_id').references(() => user.id, { onDelete: 'cascade' }),
  referenceId: text('reference_id'),
  refreshId: uuid('refresh_id').references(() => oauthRefreshToken.id, { onDelete: 'cascade' }),
  expiresAt: timezoneTimestamp('expires_at').notNull(),
  createdAt: timezoneTimestamp('created_at').defaultNow().notNull(),
  scopes: text('scopes').array().notNull(),
}, table => [
  index('oauth_access_token_client_id_idx').on(table.clientId),
  index('oauth_access_token_session_id_idx').on(table.sessionId),
  index('oauth_access_token_user_id_idx').on(table.userId),
  index('oauth_access_token_reference_id_idx').on(table.referenceId),
  index('oauth_access_token_refresh_id_idx').on(table.refreshId),
])

export const oauthConsent = pgTable('oauth_consent', {
  id: uuid('id').defaultRandom().primaryKey(),
  clientId: text('client_id').notNull().references(() => oauthClient.clientId, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => user.id, { onDelete: 'cascade' }),
  referenceId: text('reference_id'),
  scopes: text('scopes').array().notNull(),
  createdAt: timezoneTimestamp('created_at').defaultNow().notNull(),
  updatedAt: timezoneTimestamp('updated_at').defaultNow().notNull(),
}, table => [
  index('oauth_consent_client_id_idx').on(table.clientId),
  index('oauth_consent_user_id_idx').on(table.userId),
  index('oauth_consent_reference_id_idx').on(table.referenceId),
])
