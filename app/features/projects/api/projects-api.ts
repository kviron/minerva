import { z } from 'zod'
import type {
  AdministrationProjectsResponse,
  MemberProjectsResponse,
  ProjectOverviewProjection,
} from '../../../../shared/projects/contracts'

const roleSchema = z.union([
  z.object({ builtInKey: z.enum(['admin', 'editor', 'viewer']), customName: z.null() }).strict(),
  z.object({ builtInKey: z.null(), customName: z.string().min(1) }).strict(),
])
const projectSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(120),
  description: z.string().nullable(),
  status: z.enum(['active', 'archived']),
  updatedAt: z.string().datetime(),
  role: roleSchema,
}).strict()
const administrationProjectSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(120),
  description: z.string().nullable(),
  status: z.enum(['active', 'archived']),
  updatedAt: z.string().datetime(),
  activeMemberCount: z.number().int().nonnegative(),
}).strict()
const projectOverviewSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(120),
  description: z.string().nullable(),
  status: z.enum(['active', 'archived']),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  activeMemberCount: z.number().int().nonnegative(),
  role: roleSchema,
  permissions: z.array(z.enum([
    'project.view', 'project.update', 'project.archive', 'project.restore',
    'documents.view', 'documents.create', 'documents.update_draft', 'documents.publish',
    'documents.move', 'documents.archive', 'documents.restore', 'documents.view_history',
    'members.view', 'members.invite', 'members.assign_role', 'members.remove',
    'roles.view', 'roles.create', 'roles.update', 'roles.delete', 'audit.view',
  ])),
}).strict()

export function parseMemberProjectsResponse(value: unknown): MemberProjectsResponse {
  const parsed = z.array(projectSchema).safeParse(value)
  if (!parsed.success) throw new Error('Invalid projects response')
  return parsed.data
}

export function parseAdministrationProjectsResponse(value: unknown): AdministrationProjectsResponse {
  const parsed = z.array(administrationProjectSchema).safeParse(value)
  if (!parsed.success) throw new Error('Invalid administration projects response')
  return parsed.data
}

export function parseProjectOverviewResponse(value: unknown): ProjectOverviewProjection {
  const parsed = projectOverviewSchema.safeParse(value)
  if (!parsed.success) throw new Error('Invalid project overview response')
  return parsed.data
}

export interface CreateProjectInput {
  readonly name: string
  readonly description: string | null
}

export const projectsApi = {
  async list(): Promise<MemberProjectsResponse> {
    return parseMemberProjectsResponse(await $fetch('/api/projects'))
  },
  async listAdministration(): Promise<AdministrationProjectsResponse> {
    return parseAdministrationProjectsResponse(await $fetch('/api/administration/projects'))
  },
  async get(projectId: string): Promise<ProjectOverviewProjection> {
    return parseProjectOverviewResponse(await $fetch(`/api/projects/${projectId}`))
  },
  async create(input: CreateProjectInput): Promise<void> {
    await $fetch('/api/projects', { method: 'POST', body: input })
  },
}
