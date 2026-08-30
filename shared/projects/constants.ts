export const PROJECT_PERMISSION = {
  PROJECT_VIEW: 'project.view',
  PROJECT_UPDATE: 'project.update',
  PROJECT_PAUSE: 'project.pause',
  PROJECT_RESUME: 'project.resume',
  PROJECT_CLOSE: 'project.close',
  PROJECT_REOPEN: 'project.reopen',
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
  DOCUMENTS_SHARE: 'documents.share',
  MEMBERS_VIEW: 'members.view',
  MEMBERS_INVITE: 'members.invite',
  MEMBERS_ASSIGN_ROLE: 'members.assign_role',
  MEMBERS_REMOVE: 'members.remove',
  ROLES_VIEW: 'roles.view',
  ROLES_CREATE: 'roles.create',
  ROLES_UPDATE: 'roles.update',
  ROLES_DELETE: 'roles.delete',
  AUDIT_VIEW: 'audit.view',
  CREDENTIALS_VIEW: 'credentials.view',
  CREDENTIALS_CREATE: 'credentials.create',
  CREDENTIALS_UPDATE: 'credentials.update',
  CREDENTIALS_ARCHIVE: 'credentials.archive',
  CREDENTIAL_CATEGORIES_CREATE: 'credential_categories.create',
  CREDENTIAL_CATEGORIES_UPDATE: 'credential_categories.update',
  CREDENTIAL_CATEGORIES_ARCHIVE: 'credential_categories.archive',
  CREDENTIAL_CATEGORIES_MANAGE_ACCESS: 'credential_categories.manage_access',
  PROJECT_AI_USE: 'project.ai.use',
  PROJECT_AI_MANAGE: 'project.ai.manage',
} as const

export const PROJECT_STATUS = {
  ACTIVE: 'active',
  PAUSED: 'paused',
  CLOSED: 'closed',
  ARCHIVED: 'archived',
} as const

export const PROJECT_NAME_MAX_LENGTH = 120
export const PROJECT_DESCRIPTION_MAX_LENGTH = 2000
export const PROJECT_LIST_DEFAULT_LIMIT = 50
export const PROJECT_LIST_MAX_LIMIT = 100
export const PROJECT_ICON_MAX_BYTES = 2 * 1024 * 1024

export const PROJECT_ICON_MIME_TYPE = {
  PNG: 'image/png',
  JPEG: 'image/jpeg',
  WEBP: 'image/webp',
} as const

export const CREATE_PROJECT_ERROR = {
  INVALID_REQUEST: 'INVALID_REQUEST',
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  ACCOUNT_INACTIVE: 'ACCOUNT_INACTIVE',
  INVALID_PROJECT_NAME: 'INVALID_PROJECT_NAME',
  INVALID_PROJECT_DESCRIPTION: 'INVALID_PROJECT_DESCRIPTION',
  PROJECT_CREATE_FAILED: 'PROJECT_CREATE_FAILED',
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
