import { relations, sql } from 'drizzle-orm'
import {
  check,
  foreignKey,
  index,
  integer,
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
import {
  PROJECT_LIFECYCLE_REASON_MAX_LENGTH,
  PROJECT_LIFECYCLE_TRANSITION,
} from '../../../../shared/projects/project-lifecycle'
import { user } from './auth'
import type { DocumentContent } from '../../../../shared/documents/contracts'

const enumValues = <T extends Record<string, string>>(values: T) => Object.values(values) as [T[keyof T], ...T[keyof T][]]
const enumValueSql = (value: string) => sql.raw(`'${value.replaceAll("'", "''")}'`)
const enumSql = (values: Record<string, string>) => sql.raw(Object.values(values).map(value => `'${value.replaceAll("'", "''")}'`).join(', '))
const timezoneTimestamp = (name: string) => timestamp(name, { withTimezone: true })

export const projects = pgTable('projects', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  descriptionContent: jsonb('description_content').$type<DocumentContent>().default({ type: 'doc', content: [] }).notNull(),
  status: text('status', { enum: enumValues(PROJECT_STATUS) }).default(PROJECT_STATUS.ACTIVE).notNull(),
  createdByUserId: uuid('created_by_user_id').notNull().references(() => user.id, { onDelete: 'restrict' }),
  createdAt: timezoneTimestamp('created_at').defaultNow().notNull(),
  updatedAt: timezoneTimestamp('updated_at').defaultNow().notNull(),
  archivedAt: timezoneTimestamp('archived_at'),
  archivedByUserId: uuid('archived_by_user_id').references(() => user.id, { onDelete: 'restrict' }),
  lifecycleRevision: integer('lifecycle_revision').default(0).notNull(),
  statusChangedAt: timezoneTimestamp('status_changed_at').defaultNow().notNull(),
  statusChangedByUserId: uuid('status_changed_by_user_id').notNull().references(() => user.id, { onDelete: 'restrict' }),
}, table => [
  check('projects_status_check', sql`${table.status} in (${enumSql(PROJECT_STATUS)})`),
  check('projects_lifecycle_revision_check', sql`${table.lifecycleRevision} >= 0`),
  check('projects_archive_state_check', sql`
    (
      ${table.status} = ${enumValueSql(PROJECT_STATUS.ARCHIVED)}
      and ${table.archivedAt} is not null
      and ${table.archivedByUserId} is not null
    )
    or (
      ${table.status} <> ${enumValueSql(PROJECT_STATUS.ARCHIVED)}
      and ${table.archivedAt} is null
      and ${table.archivedByUserId} is null
    )
  `),
  check('projects_name_check', sql`${table.name} = btrim(${table.name}) and char_length(${table.name}) between 1 and 120`),
  check('projects_description_check', sql`
    ${table.description} is null
    or (${table.description} = btrim(${table.description}) and char_length(${table.description}) <= 2000)
  `),
  index('projects_status_idx').on(table.status),
  index('projects_created_by_user_id_idx').on(table.createdByUserId),
  index('projects_archived_by_user_id_idx').on(table.archivedByUserId),
  index('projects_status_changed_by_user_id_idx').on(table.statusChangedByUserId),
])

export const projectLifecycleEvents = pgTable('project_lifecycle_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  transition: text('transition', { enum: enumValues(PROJECT_LIFECYCLE_TRANSITION) }).notNull(),
  previousState: text('previous_state', { enum: enumValues(PROJECT_STATUS) }).notNull(),
  nextState: text('next_state', { enum: enumValues(PROJECT_STATUS) }).notNull(),
  revision: integer('revision').notNull(),
  reason: text('reason'),
  actorUserId: uuid('actor_user_id').notNull().references(() => user.id, { onDelete: 'restrict' }),
  channel: text('channel', { enum: enumValues(AUDIT_CHANNEL) }).notNull(),
  transitionId: uuid('transition_id').notNull(),
  createdAt: timezoneTimestamp('created_at').defaultNow().notNull(),
}, table => [
  check('project_lifecycle_events_transition_check', sql`${table.transition} in (${enumSql(PROJECT_LIFECYCLE_TRANSITION)})`),
  check('project_lifecycle_events_previous_state_check', sql`${table.previousState} in (${enumSql(PROJECT_STATUS)})`),
  check('project_lifecycle_events_next_state_check', sql`${table.nextState} in (${enumSql(PROJECT_STATUS)})`),
  check('project_lifecycle_events_revision_check', sql`${table.revision} > 0`),
  check('project_lifecycle_events_reason_check', sql`
    ${table.reason} is null
    or (
      ${table.reason} = btrim(${table.reason})
      and char_length(${table.reason}) between 1 and ${sql.raw(String(PROJECT_LIFECYCLE_REASON_MAX_LENGTH))}
    )
  `),
  check('project_lifecycle_events_transition_state_check', sql`
    (${table.transition} = ${enumValueSql(PROJECT_LIFECYCLE_TRANSITION.PAUSE)} and ${table.previousState} = ${enumValueSql(PROJECT_STATUS.ACTIVE)} and ${table.nextState} = ${enumValueSql(PROJECT_STATUS.PAUSED)})
    or (${table.transition} = ${enumValueSql(PROJECT_LIFECYCLE_TRANSITION.RESUME)} and ${table.previousState} = ${enumValueSql(PROJECT_STATUS.PAUSED)} and ${table.nextState} = ${enumValueSql(PROJECT_STATUS.ACTIVE)})
    or (${table.transition} = ${enumValueSql(PROJECT_LIFECYCLE_TRANSITION.CLOSE)} and ${table.previousState} in (${enumValueSql(PROJECT_STATUS.ACTIVE)}, ${enumValueSql(PROJECT_STATUS.PAUSED)}) and ${table.nextState} = ${enumValueSql(PROJECT_STATUS.CLOSED)})
    or (${table.transition} = ${enumValueSql(PROJECT_LIFECYCLE_TRANSITION.REOPEN)} and ${table.previousState} = ${enumValueSql(PROJECT_STATUS.CLOSED)} and ${table.nextState} = ${enumValueSql(PROJECT_STATUS.ACTIVE)})
    or (${table.transition} = ${enumValueSql(PROJECT_LIFECYCLE_TRANSITION.ARCHIVE)} and ${table.previousState} = ${enumValueSql(PROJECT_STATUS.CLOSED)} and ${table.nextState} = ${enumValueSql(PROJECT_STATUS.ARCHIVED)})
    or (${table.transition} = ${enumValueSql(PROJECT_LIFECYCLE_TRANSITION.RESTORE)} and ${table.previousState} = ${enumValueSql(PROJECT_STATUS.ARCHIVED)} and ${table.nextState} = ${enumValueSql(PROJECT_STATUS.CLOSED)})
  `),
  check('project_lifecycle_events_channel_check', sql`${table.channel} in (${enumSql(AUDIT_CHANNEL)})`),
  unique('project_lifecycle_events_project_id_revision_unique').on(table.projectId, table.revision),
  unique('project_lifecycle_events_project_id_transition_id_unique').on(table.projectId, table.transitionId),
  index('project_lifecycle_events_project_created_at_idx').on(table.projectId, table.createdAt),
  index('project_lifecycle_events_actor_user_id_idx').on(table.actorUserId),
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
  check('project_roles_kind_built_in_key_check', sql`
    (${table.kind} = ${enumValueSql(PROJECT_ROLE_KIND.BUILT_IN)} and ${table.builtInKey} is not null)
    or (${table.kind} = ${enumValueSql(PROJECT_ROLE_KIND.CUSTOM)} and ${table.builtInKey} is null)
  `),
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
  unique('project_memberships_id_project_id_unique').on(table.id, table.projectId),
  foreignKey({
    name: 'project_memberships_role_id_project_id_project_roles_fk',
    columns: [table.roleId, table.projectId],
    foreignColumns: [projectRoles.id, projectRoles.projectId],
  }).onDelete('restrict'),
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
  lifecycleEvents: many(projectLifecycleEvents),
}))

export const projectLifecycleEventsRelations = relations(projectLifecycleEvents, ({ one }) => ({
  project: one(projects, { fields: [projectLifecycleEvents.projectId], references: [projects.id] }),
  actor: one(user, { fields: [projectLifecycleEvents.actorUserId], references: [user.id] }),
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
