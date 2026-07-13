import { sql } from 'drizzle-orm'
import { check, foreignKey, index, integer, pgTable, text, timestamp, unique, uniqueIndex, uuid } from 'drizzle-orm/pg-core'
import { CREDENTIAL_FIELD_TYPE } from '../../../../shared/credentials/constants'
import { user } from './auth'
import { projectMemberships, projectRoles, projects } from './projects'

const enumValues = <T extends Record<string, string>>(values: T) => Object.values(values) as [T[keyof T], ...T[keyof T][]]
const enumSql = (values: Record<string, string>) => sql.raw(Object.values(values).map(value => `'${value.replaceAll("'", "''")}'`).join(', '))
const timezoneTimestamp = (name: string) => timestamp(name, { withTimezone: true })

export const credentialCategories = pgTable('credential_categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  normalizedName: text('normalized_name').notNull(),
  description: text('description'),
  position: integer('position').default(0).notNull(),
  createdByUserId: uuid('created_by_user_id').notNull().references(() => user.id, { onDelete: 'restrict' }),
  createdAt: timezoneTimestamp('created_at').defaultNow().notNull(),
  updatedAt: timezoneTimestamp('updated_at').defaultNow().notNull(),
  archivedAt: timezoneTimestamp('archived_at'),
  archivedByUserId: uuid('archived_by_user_id').references(() => user.id, { onDelete: 'restrict' }),
}, table => [
  check('credential_categories_name_check', sql`${table.name} = btrim(${table.name}) and char_length(${table.name}) between 1 and 120`),
  check('credential_categories_normalized_name_check', sql`${table.normalizedName} = btrim(${table.normalizedName}) and char_length(${table.normalizedName}) between 1 and 120`),
  check('credential_categories_description_check', sql`${table.description} is null or (${table.description} = btrim(${table.description}) and char_length(${table.description}) <= 2000)`),
  check('credential_categories_position_check', sql`${table.position} >= 0`),
  unique('credential_categories_id_project_id_unique').on(table.id, table.projectId),
  uniqueIndex('credential_categories_active_name_unique').on(table.projectId, table.normalizedName).where(sql`${table.archivedAt} is null`),
  index('credential_categories_project_id_position_idx').on(table.projectId, table.position),
])

export const credentialCategoryRoleGrants = pgTable('credential_category_role_grants', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').notNull(),
  categoryId: uuid('category_id').notNull(),
  roleId: uuid('role_id').notNull(),
  createdByUserId: uuid('created_by_user_id').notNull().references(() => user.id, { onDelete: 'restrict' }),
  createdAt: timezoneTimestamp('created_at').defaultNow().notNull(),
}, table => [
  foreignKey({ columns: [table.categoryId, table.projectId], foreignColumns: [credentialCategories.id, credentialCategories.projectId], name: 'credential_category_role_grants_category_project_fk' }).onDelete('cascade'),
  foreignKey({ columns: [table.roleId, table.projectId], foreignColumns: [projectRoles.id, projectRoles.projectId], name: 'credential_category_role_grants_role_project_fk' }).onDelete('cascade'),
  unique('credential_category_role_grants_category_role_unique').on(table.categoryId, table.roleId),
  index('credential_category_role_grants_role_id_idx').on(table.roleId),
])

export const credentialCategoryMemberGrants = pgTable('credential_category_member_grants', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').notNull(),
  categoryId: uuid('category_id').notNull(),
  membershipId: uuid('membership_id').notNull(),
  createdByUserId: uuid('created_by_user_id').notNull().references(() => user.id, { onDelete: 'restrict' }),
  createdAt: timezoneTimestamp('created_at').defaultNow().notNull(),
}, table => [
  foreignKey({ columns: [table.categoryId, table.projectId], foreignColumns: [credentialCategories.id, credentialCategories.projectId], name: 'credential_category_member_grants_category_project_fk' }).onDelete('cascade'),
  foreignKey({ columns: [table.membershipId, table.projectId], foreignColumns: [projectMemberships.id, projectMemberships.projectId], name: 'credential_category_member_grants_membership_project_fk' }).onDelete('cascade'),
  unique('credential_category_member_grants_category_membership_unique').on(table.categoryId, table.membershipId),
  index('credential_category_member_grants_membership_id_idx').on(table.membershipId),
])

export const credentials = pgTable('credentials', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').notNull(),
  categoryId: uuid('category_id').notNull(),
  title: text('title').notNull(),
  loginCiphertext: text('login_ciphertext'),
  loginNonce: text('login_nonce'),
  loginKeyVersion: integer('login_key_version'),
  passwordCiphertext: text('password_ciphertext'),
  passwordNonce: text('password_nonce'),
  passwordKeyVersion: integer('password_key_version'),
  createdByUserId: uuid('created_by_user_id').notNull().references(() => user.id, { onDelete: 'restrict' }),
  updatedByUserId: uuid('updated_by_user_id').notNull().references(() => user.id, { onDelete: 'restrict' }),
  createdAt: timezoneTimestamp('created_at').defaultNow().notNull(),
  updatedAt: timezoneTimestamp('updated_at').defaultNow().notNull(),
  archivedAt: timezoneTimestamp('archived_at'),
  archivedByUserId: uuid('archived_by_user_id').references(() => user.id, { onDelete: 'restrict' }),
}, table => [
  foreignKey({ columns: [table.categoryId, table.projectId], foreignColumns: [credentialCategories.id, credentialCategories.projectId], name: 'credentials_category_project_fk' }).onDelete('restrict'),
  check('credentials_title_check', sql`${table.title} = btrim(${table.title}) and char_length(${table.title}) between 1 and 200`),
  check('credentials_login_envelope_check', sql`(${table.loginCiphertext} is null and ${table.loginNonce} is null and ${table.loginKeyVersion} is null) or (${table.loginCiphertext} is not null and ${table.loginNonce} is not null and ${table.loginKeyVersion} > 0)`),
  check('credentials_password_envelope_check', sql`(${table.passwordCiphertext} is null and ${table.passwordNonce} is null and ${table.passwordKeyVersion} is null) or (${table.passwordCiphertext} is not null and ${table.passwordNonce} is not null and ${table.passwordKeyVersion} > 0)`),
  unique('credentials_id_project_id_unique').on(table.id, table.projectId),
  index('credentials_category_id_updated_at_idx').on(table.categoryId, table.updatedAt),
])

export const credentialFields = pgTable('credential_fields', {
  id: uuid('id').defaultRandom().primaryKey(),
  credentialId: uuid('credential_id').notNull().references(() => credentials.id, { onDelete: 'cascade' }),
  label: text('label').notNull(),
  type: text('type', { enum: enumValues(CREDENTIAL_FIELD_TYPE) }).notNull(),
  position: integer('position').notNull(),
  ciphertext: text('ciphertext').notNull(),
  nonce: text('nonce').notNull(),
  keyVersion: integer('key_version').notNull(),
  createdAt: timezoneTimestamp('created_at').defaultNow().notNull(),
  updatedAt: timezoneTimestamp('updated_at').defaultNow().notNull(),
}, table => [
  check('credential_fields_label_check', sql`${table.label} = btrim(${table.label}) and char_length(${table.label}) between 1 and 120`),
  check('credential_fields_type_check', sql`${table.type} in (${enumSql(CREDENTIAL_FIELD_TYPE)})`),
  check('credential_fields_position_check', sql`${table.position} >= 0`),
  check('credential_fields_key_version_check', sql`${table.keyVersion} > 0`),
  unique('credential_fields_credential_id_position_unique').on(table.credentialId, table.position),
  index('credential_fields_credential_id_idx').on(table.credentialId),
])
