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
  draftInternalLinkTargetIds: uuid('draft_internal_link_target_ids').array().default(sql`ARRAY[]::uuid[]`).notNull(),
  draftReferencedImageIds: uuid('draft_referenced_image_ids').array().default(sql`ARRAY[]::uuid[]`).notNull(),
  publicationState: text('publication_state').$type<DocumentPublicationState>().default(DOCUMENT_PUBLICATION_STATE.DRAFT).notNull(),
  createdAt: timezoneTimestamp('created_at').defaultNow().notNull(),
  updatedAt: timezoneTimestamp('updated_at').defaultNow().notNull(),
  archivedAt: timezoneTimestamp('archived_at'),
  archivedByUserId: uuid('archived_by_user_id').references(() => user.id, { onDelete: 'restrict' }),
  archiveBatchId: uuid('archive_batch_id'),
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
  check('documents_archive_state_check', sql`(${table.archivedAt} is null and ${table.archiveBatchId} is null) or (${table.archivedAt} is not null and ${table.archiveBatchId} is not null)`),
  uniqueIndex('documents_project_slug_unique').on(table.projectId, table.slug),
  index('documents_project_parent_position_idx').on(table.projectId, table.parentId, table.position),
  index('documents_project_archive_batch_idx').on(table.projectId, table.archiveBatchId),
  index('documents_owner_user_id_idx').on(table.ownerUserId),
  index('documents_archived_by_user_id_idx').on(table.archivedByUserId),
])

export const documentVersions = pgTable('document_versions', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  documentId: uuid('document_id').notNull(),
  versionNumber: integer('version_number').notNull(),
  sourceDraftRevision: integer('source_draft_revision').notNull(),
  title: text('title').notNull(),
  draftContent: jsonb('draft_content').$type<DocumentContent>().notNull(),
  internalLinkTargetIds: uuid('internal_link_target_ids').array().default(sql`ARRAY[]::uuid[]`).notNull(),
  referencedImageIds: uuid('referenced_image_ids').array().default(sql`ARRAY[]::uuid[]`).notNull(),
  changeSummary: text('change_summary').notNull(),
  publishedByUserId: uuid('published_by_user_id').notNull().references(() => user.id, { onDelete: 'restrict' }),
  publishedAt: timezoneTimestamp('published_at').defaultNow().notNull(),
}, table => [
  unique('document_versions_document_number_unique').on(table.documentId, table.versionNumber),
  foreignKey({
    columns: [table.documentId, table.projectId],
    foreignColumns: [documents.id, documents.projectId],
    name: 'document_versions_document_project_fk',
  }).onDelete('cascade'),
  check('document_versions_number_check', sql`${table.versionNumber} > 0`),
  check('document_versions_source_revision_check', sql`${table.sourceDraftRevision} >= 0`),
  check('document_versions_title_check', sql`${table.title} = btrim(${table.title}) and char_length(${table.title}) between 1 and 200`),
  check('document_versions_change_summary_check', sql`${table.changeSummary} = btrim(${table.changeSummary}) and char_length(${table.changeSummary}) between 0 and 1000`),
  index('document_versions_project_document_idx').on(table.projectId, table.documentId, table.versionNumber),
  index('document_versions_published_by_user_id_idx').on(table.publishedByUserId),
])
