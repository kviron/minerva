export const PROJECT_PERMISSION = {
  PROJECT_VIEW: 'project.view',
  PROJECT_UPDATE: 'project.update',
  PROJECT_ARCHIVE: 'project.archive',
  PROJECT_RESTORE: 'project.restore',
  DOCUMENTS_VIEW: 'documents.view',
  DOCUMENTS_CREATE: 'documents.create',
  DOCUMENTS_UPDATE_DRAFT: 'documents.update_draft',
  DOCUMENTS_PUBLISH: 'documents.publish',
  DOCUMENTS_MOVE: 'documents.move',
  DOCUMENTS_ARCHIVE: 'documents.archive',
  DOCUMENTS_RESTORE: 'documents.restore',
  DOCUMENTS_VIEW_HISTORY: 'documents.view_history',
  MEMBERS_VIEW: 'members.view',
  MEMBERS_INVITE: 'members.invite',
  MEMBERS_ASSIGN_ROLE: 'members.assign_role',
  MEMBERS_REMOVE: 'members.remove',
  ROLES_VIEW: 'roles.view',
  ROLES_CREATE: 'roles.create',
  ROLES_UPDATE: 'roles.update',
  ROLES_DELETE: 'roles.delete',
  AUDIT_VIEW: 'audit.view',
} as const

export const PROJECT_STATUS = {
  ACTIVE: 'active',
  ARCHIVED: 'archived',
} as const

export const PROJECT_ROLE_KEY = {
  ADMIN: 'admin',
  EDITOR: 'editor',
  VIEWER: 'viewer',
} as const

export const PROJECT_ROLE_KIND = {
  BUILT_IN: 'built_in',
  CUSTOM: 'custom',
} as const

export const MEMBERSHIP_STATUS = {
  ACTIVE: 'active',
  REMOVED: 'removed',
} as const

export const AUDIT_CHANNEL = {
  WEB: 'web',
  API: 'api',
  MCP: 'mcp',
  SYSTEM: 'system',
} as const

export const AUDIT_OUTCOME = {
  SUCCEEDED: 'succeeded',
  FAILED: 'failed',
} as const
