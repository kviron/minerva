import { sql } from 'drizzle-orm'
import { check, foreignKey, index, integer, jsonb, pgTable, text, timestamp, unique, uniqueIndex, uuid } from 'drizzle-orm/pg-core'
import { DOCUMENT_PUBLICATION_STATE, type DocumentPublicationState } from '../../../../shared/documents/constants'
import type { DocumentContent } from '../../../../shared/documents/contracts'
import { user } from './auth'
import { projects } from './projects'

const timezoneTimestamp = (name: string) => timestamp(name, { withTimezone: true })

export const documents = pgTable('documents', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  parentId: uuid('parent_id'),
  title: text('title').notNull(),
  slug: text('slug').notNull(),
  position: integer('position').default(0).notNull(),
  ownerUserId: uuid('owner_user_id').notNull().references(() => user.id, { onDelete: 'restrict' }),
  draftRevision: integer('draft_revision').default(0).notNull(),
  draftContent: jsonb('draft_content').$type<DocumentContent>().default(sql`'{"type":"doc","content":[]}'::jsonb`).notNull(),
  publicationState: text('publication_state').$type<DocumentPublicationState>().default(DOCUMENT_PUBLICATION_STATE.DRAFT).notNull(),
  createdAt: timezoneTimestamp('created_at').defaultNow().notNull(),
  updatedAt: timezoneTimestamp('updated_at').defaultNow().notNull(),
  archivedAt: timezoneTimestamp('archived_at'),
  archivedByUserId: uuid('archived_by_user_id').references(() => user.id, { onDelete: 'restrict' }),
}, table => [
  unique('documents_id_project_id_unique').on(table.id, table.projectId),
  foreignKey({
    columns: [table.parentId, table.projectId],
    foreignColumns: [table.id, table.projectId],
    name: 'documents_parent_project_fk',
  }).onDelete('cascade'),
  check('documents_title_check', sql`${table.title} = btrim(${table.title}) and char_length(${table.title}) between 1 and 200`),
  check('documents_slug_check', sql`${table.slug} = lower(btrim(${table.slug})) and ${table.slug} ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' and char_length(${table.slug}) between 1 and 160`),
  check('documents_position_check', sql`${table.position} >= 0`),
  check('documents_draft_revision_check', sql`${table.draftRevision} >= 0`),
  check('documents_publication_state_check', sql`${table.publicationState} in ('draft', 'published')`),
  uniqueIndex('documents_active_project_slug_unique').on(table.projectId, table.slug).where(sql`${table.archivedAt} is null`),
  index('documents_project_parent_position_idx').on(table.projectId, table.parentId, table.position),
  index('documents_owner_user_id_idx').on(table.ownerUserId),
  index('documents_archived_by_user_id_idx').on(table.archivedByUserId),
])
