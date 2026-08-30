import { and, eq } from 'drizzle-orm'
import { ACCOUNT_STATUS } from '../../../shared/identity/constants'
import type {
  ProjectLifecycleTransitionRequest,
  ProjectLifecycleTransitionResponse,
} from '../../../shared/projects/contracts'
import {
  AUDIT_OUTCOME,
  MEMBERSHIP_STATUS,
} from '../../../shared/projects/constants'
import {
  availableProjectLifecycleTransitions,
  decideProjectLifecycleTransition,
  PROJECT_LIFECYCLE_CONFLICT_CODE,
  PROJECT_LIFECYCLE_PERMISSION_BY_TRANSITION,
  PROJECT_LIFECYCLE_RECEIPT_OUTCOME,
} from '../../../shared/projects/project-lifecycle'
import type { AuditChannel, ProjectStatus } from '../../../shared/projects/types'
import { getDatabase } from '../../infrastructure/database/client'
import { user } from '../../infrastructure/database/schema/auth'
import {
  auditEvents,
  projectLifecycleEvents,
  projectMemberships,
  projectRolePermissions,
  projects,
} from '../../infrastructure/database/schema/projects'
import type { ProjectDatabase } from './project-access'

export const PROJECT_LIFECYCLE_TRANSITION_ERROR = {
  NOT_FOUND: 'NOT_FOUND',
  OPERATION_FAILED: 'OPERATION_FAILED',
  ...PROJECT_LIFECYCLE_CONFLICT_CODE,
} as const

export type ProjectLifecycleTransitionErrorCode = typeof PROJECT_LIFECYCLE_TRANSITION_ERROR[
  keyof typeof PROJECT_LIFECYCLE_TRANSITION_ERROR
]

interface ProjectLifecycleConflict {
  readonly currentState: ProjectStatus
  readonly currentRevision: number
  readonly availableTransitions: readonly ProjectLifecycleTransitionRequest['transition'][]
}

export interface TransitionProjectLifecycleInput extends ProjectLifecycleTransitionRequest {
  readonly actorUserId: string
  readonly projectId: string
  readonly channel: AuditChannel
}

export type TransitionProjectLifecycleResult =
  | { readonly ok: true, readonly value: ProjectLifecycleTransitionResponse }
  | {
    readonly ok: false
    readonly code: typeof PROJECT_LIFECYCLE_TRANSITION_ERROR.NOT_FOUND
      | typeof PROJECT_LIFECYCLE_TRANSITION_ERROR.OPERATION_FAILED
  }
  | {
    readonly ok: false
    readonly code: Exclude<
      ProjectLifecycleTransitionErrorCode,
      typeof PROJECT_LIFECYCLE_TRANSITION_ERROR.NOT_FOUND | typeof PROJECT_LIFECYCLE_TRANSITION_ERROR.OPERATION_FAILED
    >
    readonly conflict: ProjectLifecycleConflict
  }

export interface TransitionProjectLifecycleHooks {
  readonly now?: () => Date
  readonly beforeAudit?: () => void | Promise<void>
}

const conflictFor = (state: ProjectStatus, revision: number): ProjectLifecycleConflict => ({
  currentState: state,
  currentRevision: revision,
  availableTransitions: availableProjectLifecycleTransitions(state),
})

const receiptFromEvent = (
  event: typeof projectLifecycleEvents.$inferSelect,
  outcome: ProjectLifecycleTransitionResponse['outcome'],
): ProjectLifecycleTransitionResponse => ({
  outcome,
  transition: event.transition,
  previousState: event.previousState,
  currentState: event.nextState,
  revision: event.revision,
  transitionId: event.transitionId,
  changedAt: event.createdAt.toISOString(),
  availableTransitions: availableProjectLifecycleTransitions(event.nextState),
})

export const transitionProjectLifecycleWith = (
  db: ProjectDatabase,
  hooks: TransitionProjectLifecycleHooks = {},
) => async (input: TransitionProjectLifecycleInput): Promise<TransitionProjectLifecycleResult> => {
  const normalizedReason = input.reason?.trim() ?? null

  try {
    return await db.transaction(async (tx): Promise<TransitionProjectLifecycleResult> => {
      const [actor] = await tx.select({ status: user.status, superAdmin: user.superAdmin })
        .from(user)
        .where(eq(user.id, input.actorUserId))
        .limit(1)
      if (!actor || actor.status !== ACCOUNT_STATUS.ACTIVE) {
        return { ok: false, code: PROJECT_LIFECYCLE_TRANSITION_ERROR.NOT_FOUND }
      }

      const [project] = await tx.select({
        id: projects.id,
        status: projects.status,
        lifecycleRevision: projects.lifecycleRevision,
      })
        .from(projects)
        .where(eq(projects.id, input.projectId))
        .for('update')
      if (!project) return { ok: false, code: PROJECT_LIFECYCLE_TRANSITION_ERROR.NOT_FOUND }

      if (!actor.superAdmin) {
        const [permission] = await tx.select({ id: projectMemberships.id })
          .from(projectMemberships)
          .innerJoin(projectRolePermissions, and(
            eq(projectRolePermissions.roleId, projectMemberships.roleId),
            eq(
              projectRolePermissions.permissionCode,
              PROJECT_LIFECYCLE_PERMISSION_BY_TRANSITION[input.transition],
            ),
          ))
          .where(and(
            eq(projectMemberships.projectId, input.projectId),
            eq(projectMemberships.userId, input.actorUserId),
            eq(projectMemberships.status, MEMBERSHIP_STATUS.ACTIVE),
          ))
          .limit(1)
        if (!permission) return { ok: false, code: PROJECT_LIFECYCLE_TRANSITION_ERROR.NOT_FOUND }
      }

      const [existingEvent] = await tx.select()
        .from(projectLifecycleEvents)
        .where(and(
          eq(projectLifecycleEvents.projectId, input.projectId),
          eq(projectLifecycleEvents.transitionId, input.transitionId),
        ))
        .limit(1)
      if (existingEvent) {
        const sameCommand = existingEvent.transition === input.transition
          && existingEvent.revision - 1 === input.expectedRevision
          && existingEvent.reason === normalizedReason
          && existingEvent.actorUserId === input.actorUserId
          && existingEvent.channel === input.channel
        return sameCommand
          ? {
              ok: true,
              value: receiptFromEvent(existingEvent, PROJECT_LIFECYCLE_RECEIPT_OUTCOME.REPLAYED),
            }
          : {
              ok: false,
              code: PROJECT_LIFECYCLE_TRANSITION_ERROR.TRANSITION_ID_CONFLICT,
              conflict: conflictFor(project.status, project.lifecycleRevision),
            }
      }

      if (project.lifecycleRevision !== input.expectedRevision) {
        return {
          ok: false,
          code: PROJECT_LIFECYCLE_TRANSITION_ERROR.STALE_REVISION,
          conflict: conflictFor(project.status, project.lifecycleRevision),
        }
      }

      const decision = decideProjectLifecycleTransition(project.status, input.transition)
      if (decision.type === 'reject') {
        return {
          ok: false,
          code: PROJECT_LIFECYCLE_TRANSITION_ERROR.TRANSITION_NOT_ALLOWED,
          conflict: conflictFor(project.status, project.lifecycleRevision),
        }
      }

      const changedAt = hooks.now?.() ?? new Date()
      const revision = project.lifecycleRevision + 1
      const archived = decision.nextState === 'archived'
      await tx.update(projects).set({
        status: decision.nextState,
        lifecycleRevision: revision,
        statusChangedAt: changedAt,
        statusChangedByUserId: input.actorUserId,
        archivedAt: archived ? changedAt : null,
        archivedByUserId: archived ? input.actorUserId : null,
        updatedAt: changedAt,
      }).where(eq(projects.id, project.id))

      const [event] = await tx.insert(projectLifecycleEvents).values({
        projectId: project.id,
        transition: decision.transition,
        previousState: decision.previousState,
        nextState: decision.nextState,
        revision,
        reason: normalizedReason,
        actorUserId: input.actorUserId,
        channel: input.channel,
        transitionId: input.transitionId,
        createdAt: changedAt,
      }).returning()
      if (!event) throw new Error('Lifecycle event insert returned no row')

      await hooks.beforeAudit?.()
      await tx.insert(auditEvents).values({
        actorUserId: input.actorUserId,
        channel: input.channel,
        action: 'project.lifecycle_transitioned',
        outcome: AUDIT_OUTCOME.SUCCEEDED,
        projectId: project.id,
        targetType: 'project',
        targetId: project.id,
        metadata: {
          transition: decision.transition,
          previousState: decision.previousState,
          nextState: decision.nextState,
          lifecycleRevision: revision,
        },
      })

      return {
        ok: true,
        value: receiptFromEvent(event, PROJECT_LIFECYCLE_RECEIPT_OUTCOME.APPLIED),
      }
    })
  } catch {
    return { ok: false, code: PROJECT_LIFECYCLE_TRANSITION_ERROR.OPERATION_FAILED }
  }
}

export const transitionProjectLifecycle = (input: TransitionProjectLifecycleInput) =>
  transitionProjectLifecycleWith(getDatabase().db)(input)
