import type {
  AdministrationProjectsResponse,
  CreateProjectRequest,
  CreateProjectResponse,
  MemberProjectsResponse,
  ProjectMembersResponse,
  ProjectOverviewProjection,
  ProjectDescriptionResponse,
  UpdateProjectDescriptionRequest,
} from '../../../../shared/projects/contracts'
import { decodeApiResponse } from '../../../shared/api/decode-api-response'
import {
  administrationProjectsResponseSchema,
  createProjectResponseSchema,
  memberProjectsResponseSchema,
  projectMembersResponseSchema,
  projectOverviewSchema,
  projectDescriptionResponseSchema,
} from '../../../../shared/projects/contracts'

export type CreateProjectInput = CreateProjectRequest

export const projectsApi = {
  async list(signal?: AbortSignal, cursor?: string): Promise<MemberProjectsResponse> {
    const response: unknown = await $fetch('/api/projects', { query: cursor ? { cursor } : undefined, signal })
    return decodeApiResponse(memberProjectsResponseSchema, response, 'GET /api/projects')
  },
  async listAdministration(signal?: AbortSignal, cursor?: string): Promise<AdministrationProjectsResponse> {
    const response: unknown = await $fetch('/api/administration/projects', { query: cursor ? { cursor } : undefined, signal })
    return decodeApiResponse(administrationProjectsResponseSchema, response, 'GET /api/administration/projects')
  },
  async get(projectId: string, signal?: AbortSignal): Promise<ProjectOverviewProjection> {
    const response: unknown = await $fetch(`/api/projects/${projectId}`, { signal })
    return decodeApiResponse(projectOverviewSchema, response, 'GET /api/projects/:id')
  },
  async create(input: CreateProjectInput, signal?: AbortSignal): Promise<CreateProjectResponse> {
    const response: unknown = await $fetch('/api/projects', { method: 'POST', body: input, signal })
    return decodeApiResponse(createProjectResponseSchema, response, 'POST /api/projects')
  },
  async updateDescription(projectId: string, input: UpdateProjectDescriptionRequest, signal?: AbortSignal): Promise<ProjectDescriptionResponse> {
    const response: unknown = await $fetch(`/api/projects/${projectId}/description`, { method: 'PATCH', body: input, signal })
    return decodeApiResponse(projectDescriptionResponseSchema, response, 'PATCH /api/projects/:id/description')
  },
  async listMembers(projectId: string, signal?: AbortSignal): Promise<ProjectMembersResponse> {
    const response: unknown = await $fetch(`/api/projects/${projectId}/members`, { signal })
    return decodeApiResponse(projectMembersResponseSchema, response, 'GET /api/projects/:id/members')
  },
}
