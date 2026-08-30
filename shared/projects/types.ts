type ValueOf<T> = T[keyof T]

export type ProjectPermission = ValueOf<typeof import('./constants').PROJECT_PERMISSION>
export type ProjectStatus = ValueOf<typeof import('./constants').PROJECT_STATUS>
export type ProjectRoleKey = ValueOf<typeof import('./constants').PROJECT_ROLE_KEY>
export type ProjectRoleKind = ValueOf<typeof import('./constants').PROJECT_ROLE_KIND>
export type MembershipStatus = ValueOf<typeof import('./constants').MEMBERSHIP_STATUS>
export type AuditChannel = ValueOf<typeof import('./constants').AUDIT_CHANNEL>
export type AuditOutcome = ValueOf<typeof import('./constants').AUDIT_OUTCOME>
export type ProjectIconMimeType = ValueOf<typeof import('./constants').PROJECT_ICON_MIME_TYPE>
