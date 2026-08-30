import { sql } from 'drizzle-orm'
import { check, index, integer, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core'
import type { DocumentImageMimeType } from '../../../modules/files/document-images'
import type { ProjectIconMimeType } from '../../../../shared/projects/types'
import { user } from './auth'
import { projects } from './projects'

const timezoneTimestamp = (name: string) => timestamp(name, { withTimezone: true })

export const documentImages = pgTable('document_images', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  objectKey: text('object_key').notNull(),
  filename: text('filename').notNull(),
  mimeType: text('mime_type').$type<DocumentImageMimeType>().notNull(),
  byteSize: integer('byte_size').notNull(),
  uploadedByUserId: uuid('uploaded_by_user_id').notNull().references(() => user.id, { onDelete: 'restrict' }),
  createdAt: timezoneTimestamp('created_at').defaultNow().notNull(),
  archivedAt: timezoneTimestamp('archived_at'),
}, table => [
  unique('document_images_id_project_id_unique').on(table.id, table.projectId),
  unique('document_images_object_key_unique').on(table.objectKey),
  check('document_images_filename_check', sql`${table.filename} = btrim(${table.filename}) and char_length(${table.filename}) between 1 and 200`),
  check('document_images_mime_type_check', sql`${table.mimeType} in ('image/png', 'image/jpeg', 'image/gif', 'image/webp')`),
  check('document_images_byte_size_check', sql`${table.byteSize} between 1 and 10485760`),
  index('document_images_project_created_idx').on(table.projectId, table.createdAt),
  index('document_images_uploaded_by_idx').on(table.uploadedByUserId),
])

export const projectIcons = pgTable('project_icons', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  objectKey: text('object_key').notNull(),
  mimeType: text('mime_type').$type<ProjectIconMimeType>().notNull(),
  byteSize: integer('byte_size').notNull(),
  updatedByUserId: uuid('updated_by_user_id').notNull().references(() => user.id, { onDelete: 'restrict' }),
  createdAt: timezoneTimestamp('created_at').defaultNow().notNull(),
  updatedAt: timezoneTimestamp('updated_at').defaultNow().notNull(),
}, table => [
  unique('project_icons_project_id_unique').on(table.projectId),
  unique('project_icons_object_key_unique').on(table.objectKey),
  check('project_icons_mime_type_check', sql`${table.mimeType} in ('image/png', 'image/jpeg', 'image/webp')`),
  check('project_icons_byte_size_check', sql`${table.byteSize} between 1 and 2097152`),
  index('project_icons_updated_by_user_id_idx').on(table.updatedByUserId),
])
