import { PROJECT_PERMISSION, PROJECT_STATUS } from './constants'
import type { ProjectPermission, ProjectStatus } from './types'

export const PROJECT_LIFECYCLE_TRANSITION = {
  PAUSE: 'pause',
  RESUME: 'resume',
  CLOSE: 'close',
  REOPEN: 'reopen',
  ARCHIVE: 'archive',
  RESTORE: 'restore',
} as const

export const PROJECT_OPERATION_MODE = {
  AUTHENTICATED_READ: 'authenticated_read',
  CREDENTIAL_REVEAL: 'credential_reveal',
  WORK_MUTATION: 'work_mutation',
  SECURITY_REDUCTION: 'security_reduction',
  AI: 'ai',
  MCP: 'mcp',
  PUBLIC_READ: 'public_read',
  PUBLIC_CAPABILITY_ISSUE: 'public_capability_issue',
  PUBLIC_CAPABILITY_REVOKE: 'public_capability_revoke',
} as const

export const PROJECT_LIFECYCLE_RECEIPT_OUTCOME = {
  APPLIED: 'applied',
  REPLAYED: 'replayed',
} as const

export const PROJECT_LIFECYCLE_CONFLICT_CODE = {
  STALE_REVISION: 'stale_revision',
  TRANSITION_NOT_ALLOWED: 'transition_not_allowed',
  TRANSITION_ID_CONFLICT: 'transition_id_conflict',
} as const

export const PROJECT_LIFECYCLE_REASON_MAX_LENGTH = 500

type ValueOf<T> = T[keyof T]

export type ProjectLifecycleTransition = ValueOf<typeof PROJECT_LIFECYCLE_TRANSITION>
export type ProjectOperationMode = ValueOf<typeof PROJECT_OPERATION_MODE>
export type ProjectLifecycleReceiptOutcome = ValueOf<typeof PROJECT_LIFECYCLE_RECEIPT_OUTCOME>
export type ProjectLifecycleConflictCode = ValueOf<typeof PROJECT_LIFECYCLE_CONFLICT_CODE>

export const PROJECT_LIFECYCLE_PERMISSION_BY_TRANSITION: Readonly<Record<
  ProjectLifecycleTransition,
  ProjectPermission
>> = {
  [PROJECT_LIFECYCLE_TRANSITION.PAUSE]: PROJECT_PERMISSION.PROJECT_PAUSE,
  [PROJECT_LIFECYCLE_TRANSITION.RESUME]: PROJECT_PERMISSION.PROJECT_RESUME,
  [PROJECT_LIFECYCLE_TRANSITION.CLOSE]: PROJECT_PERMISSION.PROJECT_CLOSE,
  [PROJECT_LIFECYCLE_TRANSITION.REOPEN]: PROJECT_PERMISSION.PROJECT_REOPEN,
  [PROJECT_LIFECYCLE_TRANSITION.ARCHIVE]: PROJECT_PERMISSION.PROJECT_ARCHIVE,
  [PROJECT_LIFECYCLE_TRANSITION.RESTORE]: PROJECT_PERMISSION.PROJECT_RESTORE,
}

export type ProjectLifecycleDecision =
  | Readonly<{
    type: 'apply'
    previousState: ProjectStatus
    nextState: ProjectStatus
    transition: ProjectLifecycleTransition
  }>
  | Readonly<{
    type: 'reject'
    code: 'transition_not_allowed'
    state: ProjectStatus
    transition: ProjectLifecycleTransition
  }>

const availableTransitions: Readonly<Record<ProjectStatus, readonly ProjectLifecycleTransition[]>> = {
  [PROJECT_STATUS.ACTIVE]: [
    PROJECT_LIFECYCLE_TRANSITION.PAUSE,
    PROJECT_LIFECYCLE_TRANSITION.CLOSE,
  ],
  [PROJECT_STATUS.PAUSED]: [
    PROJECT_LIFECYCLE_TRANSITION.RESUME,
    PROJECT_LIFECYCLE_TRANSITION.CLOSE,
  ],
  [PROJECT_STATUS.CLOSED]: [
    PROJECT_LIFECYCLE_TRANSITION.REOPEN,
    PROJECT_LIFECYCLE_TRANSITION.ARCHIVE,
  ],
  [PROJECT_STATUS.ARCHIVED]: [PROJECT_LIFECYCLE_TRANSITION.RESTORE],
}

const transitionTargets: Readonly<Record<
  ProjectStatus,
  Readonly<Partial<Record<ProjectLifecycleTransition, ProjectStatus>>>
>> = {
  [PROJECT_STATUS.ACTIVE]: {
    [PROJECT_LIFECYCLE_TRANSITION.PAUSE]: PROJECT_STATUS.PAUSED,
    [PROJECT_LIFECYCLE_TRANSITION.CLOSE]: PROJECT_STATUS.CLOSED,
  },
  [PROJECT_STATUS.PAUSED]: {
    [PROJECT_LIFECYCLE_TRANSITION.RESUME]: PROJECT_STATUS.ACTIVE,
    [PROJECT_LIFECYCLE_TRANSITION.CLOSE]: PROJECT_STATUS.CLOSED,
  },
  [PROJECT_STATUS.CLOSED]: {
    [PROJECT_LIFECYCLE_TRANSITION.REOPEN]: PROJECT_STATUS.ACTIVE,
    [PROJECT_LIFECYCLE_TRANSITION.ARCHIVE]: PROJECT_STATUS.ARCHIVED,
  },
  [PROJECT_STATUS.ARCHIVED]: {
    [PROJECT_LIFECYCLE_TRANSITION.RESTORE]: PROJECT_STATUS.CLOSED,
  },
}

const readOnlyOperations: ReadonlySet<ProjectOperationMode> = new Set<ProjectOperationMode>([
  PROJECT_OPERATION_MODE.AUTHENTICATED_READ,
  PROJECT_OPERATION_MODE.CREDENTIAL_REVEAL,
  PROJECT_OPERATION_MODE.SECURITY_REDUCTION,
  PROJECT_OPERATION_MODE.PUBLIC_READ,
  PROJECT_OPERATION_MODE.PUBLIC_CAPABILITY_REVOKE,
])

export const decideProjectLifecycleTransition = (
  state: ProjectStatus,
  transition: ProjectLifecycleTransition,
): ProjectLifecycleDecision => {
  const nextState = transitionTargets[state][transition]
  return nextState === undefined
    ? { type: 'reject', code: 'transition_not_allowed', state, transition }
    : { type: 'apply', previousState: state, nextState, transition }
}

export const availableProjectLifecycleTransitions = (
  state: ProjectStatus,
): readonly ProjectLifecycleTransition[] => availableTransitions[state]

export const projectStateAllowsOperation = (
  state: ProjectStatus,
  operation: ProjectOperationMode,
): boolean => {
  if (state === PROJECT_STATUS.ACTIVE) return true
  if (state === PROJECT_STATUS.ARCHIVED) return false
  return readOnlyOperations.has(operation)
}
