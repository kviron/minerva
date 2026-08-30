import { sql } from 'drizzle-orm'
import { check, index, jsonb, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core'
import { projects } from './projects'
import { oauthGrants } from './oauth'

const timezoneTimestamp = (name: string) => timestamp(name, { withTimezone: true })

export const mcpIdempotencyRecords = pgTable('mcp_idempotency_records', {
  id: uuid('id').defaultRandom().primaryKey(),
  grantId: uuid('grant_id').notNull().references(() => oauthGrants.id, { onDelete: 'cascade' }),
  toolName: text('tool_name').notNull(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  idempotencyKey: text('idempotency_key').notNull(),
  requestHash: text('request_hash').notNull(),
  status: text('status', { enum: ['in_progress', 'completed'] }).notNull(),
  leaseToken: uuid('lease_token'),
  leaseExpiresAt: timezoneTimestamp('lease_expires_at'),
  safeResult: jsonb('safe_result'),
  createdAt: timezoneTimestamp('created_at').defaultNow().notNull(),
  updatedAt: timezoneTimestamp('updated_at').defaultNow().notNull(),
  retentionExpiresAt: timezoneTimestamp('retention_expires_at').notNull(),
}, table => [
  unique('mcp_idempotency_scope_unique')
    .on(table.grantId, table.toolName, table.projectId, table.idempotencyKey),
  check('mcp_idempotency_tool_name_check', sql`
    ${table.toolName} = btrim(${table.toolName})
    and char_length(${table.toolName}) between 1 and 128
    and ${table.toolName} ~ '^[a-z0-9_]+$'
  `),
  check('mcp_idempotency_key_check', sql`
    ${table.idempotencyKey} = btrim(${table.idempotencyKey})
    and char_length(${table.idempotencyKey}) between 1 and 128
  `),
  check('mcp_idempotency_request_hash_check', sql`${table.requestHash} ~ '^[a-f0-9]{64}$'`),
  check('mcp_idempotency_state_check', sql`
    (${table.status} = 'in_progress'
      and ${table.leaseToken} is not null
      and ${table.leaseExpiresAt} is not null
      and ${table.safeResult} is null)
    or
    (${table.status} = 'completed'
      and ${table.leaseToken} is null
      and ${table.leaseExpiresAt} is null
      and ${table.safeResult} is not null)
  `),
  check('mcp_idempotency_retention_check', sql`
    ${table.retentionExpiresAt} > ${table.createdAt}
    and ${table.retentionExpiresAt} <= ${table.createdAt} + interval '7 days'
    and (${table.leaseExpiresAt} is null or ${table.leaseExpiresAt} <= ${table.retentionExpiresAt})
  `),
  index('mcp_idempotency_retention_idx').on(table.retentionExpiresAt),
  index('mcp_idempotency_grant_idx').on(table.grantId),
])
