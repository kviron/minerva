import { z } from 'zod'
import { PROJECT_PERMISSION } from '../../../../shared/projects/constants'
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
  permissions: z.array(z.nativeEnum(PROJECT_PERMISSION)),
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
  async list(signal?: AbortSignal): Promise<MemberProjectsResponse> {
    return parseMemberProjectsResponse(await $fetch('/api/projects', { signal }))
  },
  async listAdministration(signal?: AbortSignal): Promise<AdministrationProjectsResponse> {
    return parseAdministrationProjectsResponse(await $fetch('/api/administration/projects', { signal }))
  },
  async get(projectId: string, signal?: AbortSignal): Promise<ProjectOverviewProjection> {
    return parseProjectOverviewResponse(await $fetch(`/api/projects/${projectId}`, { signal }))
  },
  async create(input: CreateProjectInput, signal?: AbortSignal): Promise<void> {
    await $fetch('/api/projects', { method: 'POST', body: input, signal })
  },
}
