import type {
  ProjectAiAvailabilityResponse,
  ProjectAiConnectionDisconnectResponse,
  ProjectAiConnectionResponse,
  ProjectAiConnectionTestResponse,
  ProjectAiConnectionUpsertRequest,
} from '../../../../shared/ai-assistant/contracts'
import {
  projectAiAvailabilityResponseSchema,
  projectAiConnectionDisconnectResponseSchema,
  projectAiConnectionResponseSchema,
  projectAiConnectionTestResponseSchema,
} from '../../../../shared/ai-assistant/contracts'
import { decodeApiResponse } from '../../../shared/api/decode-api-response'

interface ProjectAiRequestOptions {
  readonly method?: 'GET' | 'PUT' | 'POST' | 'DELETE'
  readonly body?: ProjectAiConnectionUpsertRequest
  readonly signal?: AbortSignal
}

export type ProjectAiRequest = (path: string, options?: ProjectAiRequestOptions) => Promise<unknown>

export const createProjectAiConnectionsApi = (request: ProjectAiRequest) => ({
  async loadAvailability(projectId: string, signal?: AbortSignal): Promise<ProjectAiAvailabilityResponse> {
    const response = await request(`/api/projects/${projectId}/ai-assistant/availability`, { signal })
    return decodeApiResponse(
      projectAiAvailabilityResponseSchema,
      response,
      'GET project AI availability',
    )
  },

  async load(projectId: string, signal?: AbortSignal): Promise<ProjectAiConnectionResponse> {
    const response = await request(`/api/projects/${projectId}/ai-assistant/connection`, { signal })
    return decodeApiResponse(projectAiConnectionResponseSchema, response, 'GET project AI connection')
  },

  async save(projectId: string, body: ProjectAiConnectionUpsertRequest, signal?: AbortSignal): Promise<ProjectAiConnectionResponse> {
    const response = await request(`/api/projects/${projectId}/ai-assistant/connection`, { method: 'PUT', body, signal })
    return decodeApiResponse(projectAiConnectionResponseSchema, response, 'PUT project AI connection')
  },

  async test(projectId: string, signal?: AbortSignal): Promise<ProjectAiConnectionTestResponse> {
    const response = await request(`/api/projects/${projectId}/ai-assistant/connection/test`, { method: 'POST', signal })
    return decodeApiResponse(projectAiConnectionTestResponseSchema, response, 'POST project AI connection test')
  },

  async disconnect(projectId: string, signal?: AbortSignal): Promise<ProjectAiConnectionDisconnectResponse> {
    const response = await request(`/api/projects/${projectId}/ai-assistant/connection`, { method: 'DELETE', signal })
    return decodeApiResponse(projectAiConnectionDisconnectResponseSchema, response, 'DELETE project AI connection')
  },
})

const runtimeProjectAiRequest: ProjectAiRequest = (path, options) => $fetch<unknown>(path, options)

export const projectAiConnectionsApi = createProjectAiConnectionsApi(runtimeProjectAiRequest)
