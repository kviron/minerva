import { describe, expect, expectTypeOf, it } from 'vitest'
import { BUILT_IN_PROJECT_ROLES } from '../../../server/modules/projects/project-templates'
import {
  AUDIT_CHANNEL,
  AUDIT_OUTCOME,
  MEMBERSHIP_STATUS,
  PROJECT_PERMISSION,
  PROJECT_ROLE_KEY,
  PROJECT_ROLE_KIND,
  PROJECT_STATUS,
} from '../../../shared/projects/constants'
import type {
  AuditChannel,
  AuditOutcome,
  MembershipStatus,
  ProjectPermission,
  ProjectRoleKey,
  ProjectRoleKind,
  ProjectStatus,
} from '../../../shared/projects/types'

describe('project constants and built-in role templates', () => {
  it('defines the exact closed project vocabulary', () => {
    expect(PROJECT_STATUS).toEqual({ ACTIVE: 'active', ARCHIVED: 'archived' })
    expect(PROJECT_ROLE_KEY).toEqual({ ADMIN: 'admin', EDITOR: 'editor', VIEWER: 'viewer' })
    expect(PROJECT_ROLE_KIND).toEqual({ BUILT_IN: 'built_in', CUSTOM: 'custom' })
    expect(MEMBERSHIP_STATUS).toEqual({ ACTIVE: 'active', REMOVED: 'removed' })
    expect(AUDIT_CHANNEL).toEqual({ WEB: 'web', API: 'api', MCP: 'mcp', SYSTEM: 'system' })
    expect(AUDIT_OUTCOME).toEqual({ SUCCEEDED: 'succeeded', FAILED: 'failed' })
    expect(PROJECT_PERMISSION).toEqual({
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
    })

    expectTypeOf(PROJECT_STATUS.ACTIVE).toEqualTypeOf<ProjectStatus>()
    expectTypeOf(PROJECT_ROLE_KEY.ADMIN).toEqualTypeOf<ProjectRoleKey>()
    expectTypeOf(PROJECT_ROLE_KIND.BUILT_IN).toEqualTypeOf<ProjectRoleKind>()
    expectTypeOf(MEMBERSHIP_STATUS.ACTIVE).toEqualTypeOf<MembershipStatus>()
    expectTypeOf(AUDIT_CHANNEL.WEB).toEqualTypeOf<AuditChannel>()
    expectTypeOf(AUDIT_OUTCOME.SUCCEEDED).toEqualTypeOf<AuditOutcome>()
    expectTypeOf(PROJECT_PERMISSION.PROJECT_VIEW).toEqualTypeOf<ProjectPermission>()
  })

  it('grants Admin every project permission', () => {
    expect(BUILT_IN_PROJECT_ROLES.admin.permissions).toEqual(Object.values(PROJECT_PERMISSION))
  })

  it('grants Editor project view, every document permission, and member and role view', () => {
    expect(BUILT_IN_PROJECT_ROLES.editor.permissions).toEqual([
      PROJECT_PERMISSION.PROJECT_VIEW,
      PROJECT_PERMISSION.DOCUMENTS_VIEW,
      PROJECT_PERMISSION.DOCUMENTS_CREATE,
      PROJECT_PERMISSION.DOCUMENTS_UPDATE_DRAFT,
      PROJECT_PERMISSION.DOCUMENTS_PUBLISH,
      PROJECT_PERMISSION.DOCUMENTS_MOVE,
      PROJECT_PERMISSION.DOCUMENTS_ARCHIVE,
      PROJECT_PERMISSION.DOCUMENTS_RESTORE,
      PROJECT_PERMISSION.DOCUMENTS_VIEW_HISTORY,
      PROJECT_PERMISSION.MEMBERS_VIEW,
      PROJECT_PERMISSION.ROLES_VIEW,
    ])
  })

  it('grants Viewer only project, document, and document history view', () => {
    expect(BUILT_IN_PROJECT_ROLES.viewer.permissions).toEqual([
      PROJECT_PERMISSION.PROJECT_VIEW,
      PROJECT_PERMISSION.DOCUMENTS_VIEW,
      PROJECT_PERMISSION.DOCUMENTS_VIEW_HISTORY,
    ])
  })

  it('does not duplicate permissions in any built-in role', () => {
    for (const role of Object.values(BUILT_IN_PROJECT_ROLES)) {
      expect(new Set(role.permissions).size).toBe(role.permissions.length)
    }
  })
})
