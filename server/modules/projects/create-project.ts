import { ACCOUNT_STATUS } from '../../../shared/identity/constants'
import type { AccountStatus } from '../../../shared/identity/types'
import { eq } from 'drizzle-orm'
import {
  AUDIT_OUTCOME,
  MEMBERSHIP_STATUS,
  PROJECT_ROLE_KEY,
  PROJECT_ROLE_KIND,
  PROJECT_STATUS,
} from '../../../shared/projects/constants'
import type { AuditChannel } from '../../../shared/projects/types'
import { getDatabase } from '../../infrastructure/database/client'
import { user } from '../../infrastructure/database/schema/auth'
import {
  auditEvents,
  projectMemberships,
  projectRolePermissions,
  projectRoles,
  projects,
} from '../../infrastructure/database/schema/projects'
import { BUILT_IN_PROJECT_ROLES } from './project-templates'

export const CREATE_PROJECT_ERROR = {
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  ACCOUNT_INACTIVE: 'ACCOUNT_INACTIVE',
  INVALID_PROJECT_NAME: 'INVALID_PROJECT_NAME',
  INVALID_PROJECT_DESCRIPTION: 'INVALID_PROJECT_DESCRIPTION',
  PROJECT_CREATE_FAILED: 'PROJECT_CREATE_FAILED',
} as const

export type CreateProjectErrorCode =
  typeof CREATE_PROJECT_ERROR[keyof typeof CREATE_PROJECT_ERROR]

export interface CreateProjectInput {
  readonly actor: {
    readonly userId: string
    readonly accountStatus: AccountStatus
  } | null
  readonly channel: AuditChannel
  readonly name: string
  readonly description?: string | null
}

export interface ValidCreateProjectCommand {
  readonly actorUserId: string
  readonly channel: AuditChannel
  readonly name: string
  readonly description: string | null
}

export type CreateProjectValidationResult =
  | { readonly ok: true, readonly value: ValidCreateProjectCommand }
  | { readonly ok: false, readonly code: Exclude<CreateProjectErrorCode, 'PROJECT_CREATE_FAILED'> }

export type CreateProjectResult =
  | { readonly ok: true, readonly value: { readonly projectId: string } }
  | { readonly ok: false, readonly code: CreateProjectErrorCode }

export interface CreateProjectDependencies {
  readonly persist: (
    command: ValidCreateProjectCommand,
  ) => Promise<{ readonly projectId: string }>
}

type ProjectDatabase = ReturnType<typeof getDatabase>['db']

export interface CreateProjectPersistenceHooks {
  readonly beforeAudit?: () => void | Promise<void>
}

class CreateProjectActorError extends Error {
  constructor(readonly code: typeof CREATE_PROJECT_ERROR.AUTH_REQUIRED | typeof CREATE_PROJECT_ERROR.ACCOUNT_INACTIVE) {
    super(code)
  }
}

function isBuiltInRoleKey(value: string | null): value is keyof typeof BUILT_IN_PROJECT_ROLES {
  return value !== null && Object.hasOwn(BUILT_IN_PROJECT_ROLES, value)
}

const roleDisplayNames = {
  [PROJECT_ROLE_KEY.ADMIN]: 'Admin',
  [PROJECT_ROLE_KEY.EDITOR]: 'Editor',
  [PROJECT_ROLE_KEY.VIEWER]: 'Viewer',
} as const

export function createProjectPersistence(
  db: ProjectDatabase,
  hooks: CreateProjectPersistenceHooks = {},
): CreateProjectDependencies['persist'] {
  return command => db.transaction(async (tx) => {
    const [actor] = await tx.select({ status: user.status })
      .from(user)
      .where(eq(user.id, command.actorUserId))
      .for('update')

    if (!actor) throw new CreateProjectActorError(CREATE_PROJECT_ERROR.AUTH_REQUIRED)
    if (actor.status !== ACCOUNT_STATUS.ACTIVE) {
      throw new CreateProjectActorError(CREATE_PROJECT_ERROR.ACCOUNT_INACTIVE)
    }

    const [project] = await tx.insert(projects).values({
      name: command.name,
      description: command.description,
      status: PROJECT_STATUS.ACTIVE,
      createdByUserId: command.actorUserId,
    }).returning({ id: projects.id })

    if (!project) throw new Error('Project insert returned no row')

    const insertedRoles = await tx.insert(projectRoles).values(
      Object.values(PROJECT_ROLE_KEY).map(roleKey => ({
        projectId: project.id,
        kind: PROJECT_ROLE_KIND.BUILT_IN,
        builtInKey: roleKey,
        displayName: roleDisplayNames[roleKey],
      })),
    ).returning({ id: projectRoles.id, builtInKey: projectRoles.builtInKey })

    const roleByKey = new Map(insertedRoles.map((role) => {
      if (!isBuiltInRoleKey(role.builtInKey)) throw new Error('Built-in role insert returned an invalid key')
      return [role.builtInKey, role] as const
    }))
    const permissionRows = [...roleByKey].flatMap(([roleKey, role]) =>
      BUILT_IN_PROJECT_ROLES[roleKey].permissions.map(permissionCode => ({ roleId: role.id, permissionCode })),
    )
    await tx.insert(projectRolePermissions).values(permissionRows)

    const adminRole = roleByKey.get(PROJECT_ROLE_KEY.ADMIN)
    if (!adminRole) throw new Error('Admin role insert returned no row')

    await tx.insert(projectMemberships).values({
      projectId: project.id,
      userId: command.actorUserId,
      roleId: adminRole.id,
      status: MEMBERSHIP_STATUS.ACTIVE,
    })

    await hooks.beforeAudit?.()

    await tx.insert(auditEvents).values({
      actorUserId: command.actorUserId,
      channel: command.channel,
      action: 'project.created',
      outcome: AUDIT_OUTCOME.SUCCEEDED,
      projectId: project.id,
      targetType: 'project',
      targetId: project.id,
      metadata: { roleKey: PROJECT_ROLE_KEY.ADMIN },
    })

    return { projectId: project.id }
  })
}

export function validateCreateProject(input: CreateProjectInput): CreateProjectValidationResult {
  if (input.actor === null) {
    return { ok: false, code: CREATE_PROJECT_ERROR.AUTH_REQUIRED }
  }

  if (input.actor.accountStatus !== ACCOUNT_STATUS.ACTIVE) {
    return { ok: false, code: CREATE_PROJECT_ERROR.ACCOUNT_INACTIVE }
  }

  const name = input.name.trim()
  if (name.length === 0 || name.length > 120) {
    return { ok: false, code: CREATE_PROJECT_ERROR.INVALID_PROJECT_NAME }
  }

  const description = input.description == null ? null : input.description.trim()
  if (description !== null && description.length > 2000) {
    return { ok: false, code: CREATE_PROJECT_ERROR.INVALID_PROJECT_DESCRIPTION }
  }

  return {
    ok: true,
    value: {
      actorUserId: input.actor.userId,
      channel: input.channel,
      name,
      description,
    },
  }
}

export const createProjectWith = (dependencies: CreateProjectDependencies) =>
  async (input: CreateProjectInput): Promise<CreateProjectResult> => {
    const validation = validateCreateProject(input)
    if (!validation.ok) {
      return validation
    }

    try {
      const created = await dependencies.persist(validation.value)
      return { ok: true, value: { projectId: created.projectId } }
    }
    catch (error) {
      if (error instanceof CreateProjectActorError) {
        return { ok: false, code: error.code }
      }
      return { ok: false, code: CREATE_PROJECT_ERROR.PROJECT_CREATE_FAILED }
    }
  }

export const createProject = (input: CreateProjectInput) =>
  createProjectWith({ persist: createProjectPersistence(getDatabase().db) })(input)
