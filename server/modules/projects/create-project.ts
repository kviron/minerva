import { ACCOUNT_STATUS } from '../../../shared/identity/constants'
import type { AccountStatus } from '../../../shared/identity/types'
import type { AuditChannel } from '../../../shared/projects/types'

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
    catch {
      return { ok: false, code: CREATE_PROJECT_ERROR.PROJECT_CREATE_FAILED }
    }
  }
