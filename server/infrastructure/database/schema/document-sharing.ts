import { sql } from 'drizzle-orm'
import {
  check,
  foreignKey,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import {
  DOCUMENT_PUBLIC_SHARE_SCOPE,
  DOCUMENT_PUBLIC_SHARE_TOKEN_HASH_LENGTH,
} from '../../../../shared/documents/public-share-constants'
import { user } from './auth'
import { documents } from './documents'
import { projects } from './projects'

const enumValues = <T extends Record<string, string>>(values: T) =>
  Object.values(values) as [T[keyof T], ...T[keyof T][]]
const enumSql = (values: Record<string, string>) =>
  sql.raw(Object.values(values).map(value => `'${value.replaceAll("'", "''")}'`).join(', '))
const numberSql = (value: number) => sql.raw(String(value))
const timezoneTimestamp = (name: string) => timestamp(name, { withTimezone: true })

export const documentPublicShares = pgTable('document_public_shares', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  rootDocumentId: uuid('root_document_id').notNull(),
  scope: text('scope', { enum: enumValues(DOCUMENT_PUBLIC_SHARE_SCOPE) }).notNull(),
  tokenHash: text('token_hash').notNull(),
  tokenCiphertext: text('token_ciphertext').notNull(),
  tokenNonce: text('token_nonce').notNull(),
  tokenKeyVersion: integer('token_key_version').notNull(),
  createdByUserId: uuid('created_by_user_id').notNull().references(() => user.id, { onDelete: 'restrict' }),
  revokedByUserId: uuid('revoked_by_user_id').references(() => user.id, { onDelete: 'restrict' }),
  createdAt: timezoneTimestamp('created_at').defaultNow().notNull(),
  revokedAt: timezoneTimestamp('revoked_at'),
  updatedAt: timezoneTimestamp('updated_at').defaultNow().notNull(),
}, table => [
  foreignKey({
    name: 'document_public_shares_root_document_project_fk',
    columns: [table.rootDocumentId, table.projectId],
    foreignColumns: [documents.id, documents.projectId],
  }).onDelete('cascade'),
  check('document_public_shares_scope_check', sql`${table.scope} in (${enumSql(DOCUMENT_PUBLIC_SHARE_SCOPE)})`),
  check('document_public_shares_token_hash_check', sql`
    char_length(${table.tokenHash}) = ${numberSql(DOCUMENT_PUBLIC_SHARE_TOKEN_HASH_LENGTH)}
    and ${table.tokenHash} ~ '^[0-9a-f]+$'
  `),
  check('document_public_shares_envelope_check', sql`
    char_length(${table.tokenCiphertext}) > 0
    and char_length(${table.tokenNonce}) > 0
    and ${table.tokenKeyVersion} > 0
  `),
  check('document_public_shares_revocation_check', sql`
    (${table.revokedAt} is null and ${table.revokedByUserId} is null)
    or (${table.revokedAt} is not null and ${table.revokedByUserId} is not null)
  `),
  uniqueIndex('document_public_shares_token_hash_unique').on(table.tokenHash),
  uniqueIndex('document_public_shares_active_scope_unique')
    .on(table.projectId, table.rootDocumentId, table.scope)
    .where(sql`${table.revokedAt} is null`),
  index('document_public_shares_root_idx').on(table.projectId, table.rootDocumentId, table.createdAt),
  index('document_public_shares_revoked_at_idx').on(table.revokedAt),
])
