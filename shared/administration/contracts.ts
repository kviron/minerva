import { z } from 'zod'
import { ACCOUNT_STATUS } from '../identity/constants'
import { AUDIT_CHANNEL, AUDIT_OUTCOME } from '../projects/constants'

export const administrationUserSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  email: z.string().email(),
  username: z.string().min(1).nullable(),
  status: z.nativeEnum(ACCOUNT_STATUS),
  superAdmin: z.boolean(),
  createdAt: z.string().datetime(),
  lastLoginAt: z.string().datetime().nullable(),
}).strict().readonly()

export const administrationUsersResponseSchema = z.array(administrationUserSchema).readonly()
export const administrationUserDetailSchema = administrationUserSchema
export const administrationUserRouteParamsSchema = z.object({
  id: z.string().uuid(),
}).strict().readonly()

export type AdministrationUserListItem = z.infer<typeof administrationUserSchema>
export type AdministrationUsersResponse = z.infer<typeof administrationUsersResponseSchema>
export type AdministrationUserDetail = z.infer<typeof administrationUserDetailSchema>
export type AdministrationUserRouteParams = z.infer<typeof administrationUserRouteParamsSchema>

export const ADMINISTRATION_AUDIT_PAGE_SIZE = 20

export const ADMINISTRATION_AUDIT_SORT = {
  CREATED_AT: 'createdAt',
  ACTION: 'action',
  ACTOR: 'actor',
  PROJECT: 'project',
  CHANNEL: 'channel',
  OUTCOME: 'outcome',
  TARGET: 'target',
} as const

export const ADMINISTRATION_AUDIT_SORT_DIRECTION = {
  ASC: 'asc',
  DESC: 'desc',
} as const

export const administrationAuditDetailKeySchema = z.enum([
  'revision',
  'versionNumber',
  'grantCount',
  'resultCount',
])

export const administrationAuditDetailSchema = z.object({
  key: administrationAuditDetailKeySchema,
  value: z.number().int().nonnegative(),
}).strict().readonly()

export const administrationAuditEventSchema = z.object({
  id: z.string().uuid(),
  createdAt: z.string().datetime(),
  actor: z.object({
    id: z.string().uuid(),
    name: z.string().min(1).max(200),
    status: z.nativeEnum(ACCOUNT_STATUS),
  }).strict().readonly().nullable(),
  project: z.object({
    id: z.string().uuid(),
    name: z.string().min(1).max(120),
  }).strict().readonly().nullable(),
  channel: z.nativeEnum(AUDIT_CHANNEL),
  action: z.string().min(1).max(160),
  outcome: z.nativeEnum(AUDIT_OUTCOME),
  targetType: z.string().min(1).max(120),
  targetId: z.string().uuid().nullable(),
  details: z.array(administrationAuditDetailSchema).max(4).readonly(),
}).strict().readonly()

export const administrationAuditQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(100_000).default(1),
  sort: z.nativeEnum(ADMINISTRATION_AUDIT_SORT).default(ADMINISTRATION_AUDIT_SORT.CREATED_AT),
  direction: z.nativeEnum(ADMINISTRATION_AUDIT_SORT_DIRECTION)
    .default(ADMINISTRATION_AUDIT_SORT_DIRECTION.DESC),
  channel: z.nativeEnum(AUDIT_CHANNEL).optional(),
  outcome: z.nativeEnum(AUDIT_OUTCOME).optional(),
  search: z.string().trim().min(1).max(160).optional(),
  action: z.string().trim().min(1).max(160).optional(),
  actorId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
}).strict().readonly().refine(
  query => query.from === undefined || query.to === undefined || query.from <= query.to,
  { message: 'Invalid audit period', path: ['to'] },
)

export const administrationAuditResponseSchema = z.object({
  items: z.array(administrationAuditEventSchema).readonly(),
  page: z.number().int().positive(),
  pageSize: z.literal(ADMINISTRATION_AUDIT_PAGE_SIZE),
  totalItems: z.number().int().nonnegative(),
  totalPages: z.number().int().positive(),
}).strict().readonly()

export const administrationAuditTargetRouteParamsSchema = z.object({
  id: z.string().uuid(),
}).strict().readonly()

export const ADMINISTRATION_AUDIT_TARGET_STATE = {
  AVAILABLE: 'available',
  UNAVAILABLE: 'unavailable',
  UNSUPPORTED: 'unsupported',
} as const

export const administrationAuditTargetResponseSchema = z.object({
  state: z.nativeEnum(ADMINISTRATION_AUDIT_TARGET_STATE),
  type: z.string().min(1).max(120),
  title: z.string().min(1).max(240),
  fields: z.array(z.object({
    label: z.string().min(1).max(80),
    value: z.string().min(1).max(500),
  }).strict().readonly()).max(12).readonly(),
}).strict().readonly()

export type AdministrationAuditDetail = z.infer<typeof administrationAuditDetailSchema>
export type AdministrationAuditEvent = z.infer<typeof administrationAuditEventSchema>
export type AdministrationAuditQuery = z.infer<typeof administrationAuditQuerySchema>
export type AdministrationAuditResponse = z.infer<typeof administrationAuditResponseSchema>
export type AdministrationAuditTargetResponse = z.infer<typeof administrationAuditTargetResponseSchema>
