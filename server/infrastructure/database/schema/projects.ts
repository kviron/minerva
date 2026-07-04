import { relations, sql } from 'drizzle-orm'
import {
  check,
  foreignKey,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import {
  AUDIT_CHANNEL,
  AUDIT_OUTCOME,
  MEMBERSHIP_STATUS,
  PROJECT_PERMISSION,
  PROJECT_ROLE_KEY,
  PROJECT_ROLE_KIND,
  PROJECT_STATUS,
} from '../../../../shared/projects/constants'
import { user } from './auth'

const enumValues = <T extends Record<string, string>>(values: T) => Object.values(values) as [T[keyof T], ...T[keyof T][]]
const enumSql = (values: Record<string, string>) => sql.raw(Object.values(values).map(value => `'${value.replaceAll("'", "''")}'`).join(', '))
const timezoneTimestamp = (name: string) => timestamp(name, { withTimezone: true })

export const projects = pgTable('projects', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  status: text('status', { enum: enumValues(PROJECT_STATUS) }).default(PROJECT_STATUS.ACTIVE).notNull(),
  createdByUserId: uuid('created_by_user_id').notNull().references(() => user.id, { onDelete: 'restrict' }),
  createdAt: timezoneTimestamp('created_at').defaultNow().notNull(),
  updatedAt: timezoneTimestamp('updated_at').defaultNow().notNull(),
  archivedAt: timezoneTimestamp('archived_at'),
  archivedByUserId: uuid('archived_by_user_id').references(() => user.id, { onDelete: 'restrict' }),
}, table => [
  check('projects_status_check', sql`${table.status} in (${enumSql(PROJECT_STATUS)})`),
  index('projects_status_idx').on(table.status),
  index('projects_created_by_user_id_idx').on(table.createdByUserId),
  index('projects_archived_by_user_id_idx').on(table.archivedByUserId),
])

export const projectRoles = pgTable('project_roles', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  kind: text('kind', { enum: enumValues(PROJECT_ROLE_KIND) }).notNull(),
  builtInKey: text('built_in_key', { enum: enumValues(PROJECT_ROLE_KEY) }),
  displayName: text('display_name').notNull(),
  createdAt: timezoneTimestamp('created_at').defaultNow().notNull(),
  updatedAt: timezoneTimestamp('updated_at').defaultNow().notNull(),
}, table => [
  check('project_roles_kind_check', sql`${table.kind} in (${enumSql(PROJECT_ROLE_KIND)})`),
  check('project_roles_built_in_key_check', sql`${table.builtInKey} is null or ${table.builtInKey} in (${enumSql(PROJECT_ROLE_KEY)})`),
  unique('project_roles_id_project_id_unique').on(table.id, table.projectId),
  uniqueIndex('project_roles_project_id_built_in_key_unique')
    .on(table.projectId, table.builtInKey)
    .where(sql`${table.builtInKey} is not null`),
  index('project_roles_project_id_idx').on(table.projectId),
])

export const projectRolePermissions = pgTable('project_role_permissions', {
  id: uuid('id').defaultRandom().primaryKey(),
  roleId: uuid('role_id').notNull().references(() => projectRoles.id, { onDelete: 'cascade' }),
  permissionCode: text('permission_code', { enum: enumValues(PROJECT_PERMISSION) }).notNull(),
  createdAt: timezoneTimestamp('created_at').defaultNow().notNull(),
}, table => [
  check('project_role_permissions_permission_code_check', sql`${table.permissionCode} in (${enumSql(PROJECT_PERMISSION)})`),
  unique('project_role_permissions_role_id_permission_code_unique').on(table.roleId, table.permissionCode),
  index('project_role_permissions_role_id_idx').on(table.roleId),
])

export const projectMemberships = pgTable('project_memberships', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => user.id, { onDelete: 'restrict' }),
  roleId: uuid('role_id').notNull(),
  status: text('status', { enum: enumValues(MEMBERSHIP_STATUS) }).default(MEMBERSHIP_STATUS.ACTIVE).notNull(),
  joinedAt: timezoneTimestamp('joined_at').defaultNow().notNull(),
  updatedAt: timezoneTimestamp('updated_at').defaultNow().notNull(),
  removedAt: timezoneTimestamp('removed_at'),
  removedByUserId: uuid('removed_by_user_id').references(() => user.id, { onDelete: 'restrict' }),
}, table => [
  check('project_memberships_status_check', sql`${table.status} in (${enumSql(MEMBERSHIP_STATUS)})`),
  unique('project_memberships_project_id_user_id_unique').on(table.projectId, table.userId),
  foreignKey({
    name: 'project_memberships_role_id_project_id_project_roles_fk',
    columns: [table.roleId, table.projectId],
    foreignColumns: [projectRoles.id, projectRoles.projectId],
  }).onDelete('cascade'),
  index('project_memberships_project_id_idx').on(table.projectId),
  index('project_memberships_user_id_idx').on(table.userId),
  index('project_memberships_role_id_idx').on(table.roleId),
  index('project_memberships_status_idx').on(table.status),
  index('project_memberships_removed_by_user_id_idx').on(table.removedByUserId),
])

export const auditEvents = pgTable('audit_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  createdAt: timezoneTimestamp('created_at').defaultNow().notNull(),
  actorUserId: uuid('actor_user_id').references(() => user.id, { onDelete: 'restrict' }),
  channel: text('channel', { enum: enumValues(AUDIT_CHANNEL) }).notNull(),
  action: text('action').notNull(),
  outcome: text('outcome', { enum: enumValues(AUDIT_OUTCOME) }).notNull(),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'restrict' }),
  targetType: text('target_type').notNull(),
  targetId: uuid('target_id'),
  metadata: jsonb('metadata').default({}).notNull(),
}, table => [
  check('audit_events_channel_check', sql`${table.channel} in (${enumSql(AUDIT_CHANNEL)})`),
  check('audit_events_outcome_check', sql`${table.outcome} in (${enumSql(AUDIT_OUTCOME)})`),
  index('audit_events_project_id_idx').on(table.projectId),
  index('audit_events_actor_user_id_idx').on(table.actorUserId),
  index('audit_events_action_idx').on(table.action),
  index('audit_events_created_at_idx').on(table.createdAt),
])

export const projectsRelations = relations(projects, ({ many, one }) => ({
  createdBy: one(user, { fields: [projects.createdByUserId], references: [user.id], relationName: 'projectCreator' }),
  archivedBy: one(user, { fields: [projects.archivedByUserId], references: [user.id], relationName: 'projectArchiver' }),
  roles: many(projectRoles),
  memberships: many(projectMemberships),
  auditEvents: many(auditEvents),
}))

export const projectRolesRelations = relations(projectRoles, ({ many, one }) => ({
  project: one(projects, { fields: [projectRoles.projectId], references: [projects.id] }),
  permissions: many(projectRolePermissions),
  memberships: many(projectMemberships),
}))

export const projectRolePermissionsRelations = relations(projectRolePermissions, ({ one }) => ({
  role: one(projectRoles, { fields: [projectRolePermissions.roleId], references: [projectRoles.id] }),
}))

export const projectMembershipsRelations = relations(projectMemberships, ({ one }) => ({
  project: one(projects, { fields: [projectMemberships.projectId], references: [projects.id] }),
  user: one(user, { fields: [projectMemberships.userId], references: [user.id], relationName: 'projectMember' }),
  role: one(projectRoles, { fields: [projectMemberships.roleId], references: [projectRoles.id] }),
  removedBy: one(user, { fields: [projectMemberships.removedByUserId], references: [user.id], relationName: 'membershipRemover' }),
}))

export const auditEventsRelations = relations(auditEvents, ({ one }) => ({
  project: one(projects, { fields: [auditEvents.projectId], references: [projects.id] }),
  actor: one(user, { fields: [auditEvents.actorUserId], references: [user.id] }),
}))
