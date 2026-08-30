import { z } from 'zod'
import { documentContentSchema, type DocumentContent } from '../documents/contracts'
import {
  AUDIT_CHANNEL,
  CREATE_PROJECT_ERROR,
  PROJECT_NAME_MAX_LENGTH,
  PROJECT_LIST_DEFAULT_LIMIT,
  PROJECT_LIST_MAX_LIMIT,
  PROJECT_PERMISSION,
  PROJECT_ROLE_KEY,
  PROJECT_STATUS,
} from './constants'
import {
  PROJECT_LIFECYCLE_CONFLICT_CODE,
  PROJECT_LIFECYCLE_REASON_MAX_LENGTH,
  PROJECT_LIFECYCLE_RECEIPT_OUTCOME,
  PROJECT_LIFECYCLE_TRANSITION,
  PROJECT_OPERATION_MODE,
} from './project-lifecycle'

const projectIdentitySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(PROJECT_NAME_MAX_LENGTH),
  description: z.string().nullable(),
  status: z.nativeEnum(PROJECT_STATUS),
  iconId: z.string().uuid().nullable().default(null),
}).strict()

export const projectRoleSchema = z.union([
  z.object({
    builtInKey: z.nativeEnum(PROJECT_ROLE_KEY),
    customName: z.null(),
  }).strict(),
  z.object({
    builtInKey: z.null(),
    customName: z.string().min(1),
  }).strict(),
]).readonly()

export const memberProjectListItemSchema = projectIdentitySchema.extend({
  updatedAt: z.string().datetime(),
  role: projectRoleSchema,
}).strict().readonly()

export const administrationProjectListItemSchema = projectIdentitySchema.extend({
  updatedAt: z.string().datetime(),
  activeMemberCount: z.number().int().nonnegative(),
}).strict().readonly()

export const projectOverviewSchema = projectIdentitySchema.extend({
  descriptionContent: documentContentSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  activeMemberCount: z.number().int().nonnegative(),
  role: projectRoleSchema,
  permissions: z.array(z.nativeEnum(PROJECT_PERMISSION)).readonly(),
}).strict().readonly()

export const projectMemberSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  email: z.string().email(),
  joinedAt: z.string().datetime(),
  role: projectRoleSchema,
}).strict().readonly()

export const projectMembersResponseSchema = z.array(projectMemberSchema).readonly()

export const updateProjectDescriptionRequestSchema = z.object({
  content: documentContentSchema,
}).strict().readonly()

export const projectDescriptionResponseSchema = z.object({
  description: z.string().nullable(),
  descriptionContent: documentContentSchema,
  updatedAt: z.string().datetime(),
}).strict().readonly()

export const createProjectRequestSchema = z.object({
  name: z.string(),
  description: z.string().nullable().optional(),
}).strict().readonly()

export const createProjectResponseSchema = z.object({
  projectId: z.string().uuid(),
}).strict().readonly()

export const projectIconResponseSchema = z.object({
  iconId: z.string().uuid().nullable(),
}).strict().readonly()

export const createProjectErrorResponseSchema = z.object({
  data: z.object({ code: z.nativeEnum(CREATE_PROJECT_ERROR) }).strict().readonly(),
}).strict().readonly()

export const projectRouteParamsSchema = z.object({
  id: z.string().uuid(),
}).strict().readonly()

const projectLifecycleReasonSchema = z.string()
  .trim()
  .min(1)
  .max(PROJECT_LIFECYCLE_REASON_MAX_LENGTH)

const projectLifecycleAvailableTransitionsSchema = z.array(
  z.nativeEnum(PROJECT_LIFECYCLE_TRANSITION),
).readonly()

export const projectOperationModeSchema = z.nativeEnum(PROJECT_OPERATION_MODE)

export const projectLifecycleTransitionRequestSchema = z.object({
  transition: z.nativeEnum(PROJECT_LIFECYCLE_TRANSITION),
  expectedRevision: z.number().int().nonnegative(),
  transitionId: z.string().uuid(),
  reason: projectLifecycleReasonSchema.optional(),
}).strict().readonly()

export const projectLifecycleTransitionResponseSchema = z.object({
  outcome: z.nativeEnum(PROJECT_LIFECYCLE_RECEIPT_OUTCOME),
  transition: z.nativeEnum(PROJECT_LIFECYCLE_TRANSITION),
  previousState: z.nativeEnum(PROJECT_STATUS),
  currentState: z.nativeEnum(PROJECT_STATUS),
  revision: z.number().int().positive(),
  transitionId: z.string().uuid(),
  changedAt: z.string().datetime(),
  availableTransitions: projectLifecycleAvailableTransitionsSchema,
}).strict().readonly()

export const projectLifecycleConflictResponseSchema = z.object({
  data: z.object({
    code: z.nativeEnum(PROJECT_LIFECYCLE_CONFLICT_CODE),
    currentState: z.nativeEnum(PROJECT_STATUS),
    currentRevision: z.number().int().nonnegative(),
    availableTransitions: projectLifecycleAvailableTransitionsSchema,
  }).strict().readonly(),
}).strict().readonly()

export const projectLifecycleHistoryEventSchema = z.object({
  id: z.string().uuid(),
  transition: z.nativeEnum(PROJECT_LIFECYCLE_TRANSITION),
  previousState: z.nativeEnum(PROJECT_STATUS),
  nextState: z.nativeEnum(PROJECT_STATUS),
  revision: z.number().int().positive(),
  reason: projectLifecycleReasonSchema.nullable(),
  actorUserId: z.string().uuid(),
  channel: z.nativeEnum(AUDIT_CHANNEL),
  createdAt: z.string().datetime(),
}).strict().readonly()

export const projectLifecycleHistoryResponseSchema = z.object({
  items: z.array(projectLifecycleHistoryEventSchema).readonly(),
  nextCursor: z.string().min(1).max(512).nullable(),
}).strict().readonly()

export const projectListQuerySchema = z.object({
  cursor: z.string().min(1).max(512).optional(),
  limit: z.coerce.number().int().min(1).max(PROJECT_LIST_MAX_LIMIT).default(PROJECT_LIST_DEFAULT_LIMIT),
  status: z.nativeEnum(PROJECT_STATUS).optional(),
}).strict().readonly()

export const memberProjectsResponseSchema = z.object({
  items: z.array(memberProjectListItemSchema).readonly(),
  nextCursor: z.string().nullable(),
}).strict().readonly()

export const administrationProjectsResponseSchema = z.object({
  items: z.array(administrationProjectListItemSchema).readonly(),
  nextCursor: z.string().nullable(),
}).strict().readonly()

export type ProjectRoleProjection = z.infer<typeof projectRoleSchema>
export type MemberProjectListItem = z.infer<typeof memberProjectListItemSchema>
export type AdministrationProjectListItem = z.infer<typeof administrationProjectListItemSchema>
export type ProjectOverviewProjection = z.infer<typeof projectOverviewSchema>
export type ProjectMember = z.infer<typeof projectMemberSchema>
export type ProjectMembersResponse = z.infer<typeof projectMembersResponseSchema>
export type UpdateProjectDescriptionRequest = z.infer<typeof updateProjectDescriptionRequestSchema>
export type ProjectDescriptionResponse = z.infer<typeof projectDescriptionResponseSchema>
export type ProjectDescriptionContent = DocumentContent
export type CreateProjectRequest = z.infer<typeof createProjectRequestSchema>
export type CreateProjectResponse = z.infer<typeof createProjectResponseSchema>
export type ProjectIconResponse = z.infer<typeof projectIconResponseSchema>
export type CreateProjectErrorResponse = z.infer<typeof createProjectErrorResponseSchema>
export type ProjectRouteParams = z.infer<typeof projectRouteParamsSchema>
export type ProjectLifecycleTransitionRequest = z.infer<typeof projectLifecycleTransitionRequestSchema>
export type ProjectLifecycleTransitionResponse = z.infer<typeof projectLifecycleTransitionResponseSchema>
export type ProjectLifecycleConflictResponse = z.infer<typeof projectLifecycleConflictResponseSchema>
export type ProjectLifecycleHistoryEvent = z.infer<typeof projectLifecycleHistoryEventSchema>
export type ProjectLifecycleHistoryResponse = z.infer<typeof projectLifecycleHistoryResponseSchema>
export type ProjectListQuery = z.infer<typeof projectListQuerySchema>
export type MemberProjectsResponse = z.infer<typeof memberProjectsResponseSchema>
export type AdministrationProjectsResponse = z.infer<typeof administrationProjectsResponseSchema>
